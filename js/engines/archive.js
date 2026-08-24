(function(){
  const M=window.MetaStudio,U=M.utils,S=M.security;
  const MAX_FILES=S.MAX_ARCHIVE_FILES,MAX_UNCOMPRESSED=S.MAX_ARCHIVE_OUTPUT_BYTES;
  function zipList(bytes){
    const z=new M.ZipLite(bytes),f=[];let total=0,count=0;
    for(const e of z.entries){
      if(++count>MAX_FILES)throw new Error(`ZIP rechazado: supera el máximo de ${MAX_FILES} elementos analizables.`);
      const safe=U.safePath(e.name);total+=e.size;if(total>MAX_UNCOMPRESSED)throw new Error(`ZIP rechazado: tamaño descomprimido superior a ${U.humanSize(MAX_UNCOMPRESSED)}.`);
      if(!safe)f.push(U.finding('Ruta insegura',e.name,'Archivo comprimido',true,{source:'ZIP',risk:'critico',path:e.name}));
      if(!e.name.endsWith('/'))f.push(U.finding('Elemento interno',e.name,'Archivo comprimido',false,{source:'ZIP',risk:'info',path:e.name,kind:'technical'}));
    }
    return {z,f,total};
  }
  async function inspectZipChildren(z,f,depth=0){
    if(depth>=2)return;let scanned=0,totalActual=0;
    for(const e of z.entries){
      if(e.name.endsWith('/')||!U.safePath(e.name))continue;
      if(++scanned>S.MAX_CHILD_SCAN_FILES)break;
      let b;
      try{b=await z.read(e.name);}catch(err){f.push(U.finding('No se pudo inspeccionar',e.name,'Archivo comprimido',false,{source:'ZIP',risk:'info',path:e.name,kind:'technical'}));continue;}
      totalActual+=b.length;if(totalActual>S.MAX_CHILD_SCAN_BYTES)throw new Error(`Inspección interna detenida: el contenido descomprimido supera ${U.humanSize(S.MAX_CHILD_SCAN_BYTES)}.`);
      let eng;
      try{eng=await S.engineForBytes(b,{name:e.name,type:''},true);}catch(err){f.push(U.finding('Formato interno incoherente',e.name,'Archivo comprimido',false,{source:'ZIP',risk:'medio',path:e.name}));continue;}
      if(!eng||eng===M.archive||eng===M.universal)continue;
      try{const child=await eng.analyze(b,{name:e.name,type:''});for(const x of child){x.path=e.name+(x.path?' → '+x.path:'');x.source=(x.source||x.category)+' · dentro de ZIP';f.push(x);}}catch(err){f.push(U.finding('No se pudo inspeccionar',e.name,'Archivo comprimido',false,{source:'ZIP',risk:'info',path:e.name,kind:'technical'}));}
    }
  }
  function tarList(bytes){
    const f=[];let p=0,count=0,total=0;
    while(p+512<=bytes.length){
      const h=bytes.subarray(p,p+512);if(h.every(x=>x===0))break;
      if(++count>MAX_FILES)throw new Error(`TAR rechazado: supera el máximo de ${MAX_FILES} entradas.`);
      const name=U.text(h.subarray(0,100)).replace(/\0.*$/,'');const sizeTxt=U.text(h.subarray(124,136)).replace(/\0.*$/,'').trim();
      if(!/^[0-7 ]*$/.test(sizeTxt))throw new Error('TAR inválido: tamaño de entrada no válido.');
      const size=parseInt(sizeTxt,8)||0,next=p+512+Math.ceil(size/512)*512;
      if(size>S.MAX_ZIP_ENTRY_UNCOMPRESSED)throw new Error(`Entrada TAR demasiado grande: ${name}.`);if(next>bytes.length)throw new Error(`TAR truncado en la entrada ${name||'(sin nombre)'}.`);
      const uname=U.text(h.subarray(265,297)).replace(/\0.*$/,'').trim(),gname=U.text(h.subarray(297,329)).replace(/\0.*$/,'').trim(),typeflag=String.fromCharCode(h[156]||48);
      if(!U.safePath(name))f.push(U.finding('Ruta insegura',name,'Archivo comprimido',true,{source:'TAR',risk:'critico',path:name}));
      else f.push(U.finding('Elemento interno',name,'Archivo comprimido',false,{source:'TAR',risk:'info',path:name,kind:'technical'}));
      if(['1','2','3','4','6'].includes(typeflag))f.push(U.finding('Tipo de entrada especial',`${name} · typeflag ${typeflag}`,'Archivo comprimido',true,{source:'TAR',risk:'alto',path:name}));
      if(uname)f.push(U.finding('Usuario TAR',uname,'Identidad',true,{source:'TAR header',risk:'alto',path:name}));if(gname)f.push(U.finding('Grupo TAR',gname,'Identidad',true,{source:'TAR header',risk:'alto',path:name}));
      total+=size;if(total>MAX_UNCOMPRESSED)throw new Error(`TAR rechazado: tamaño agregado superior a ${U.humanSize(MAX_UNCOMPRESSED)}.`);p=next;
    }
    return {f,total,count};
  }
  async function gunzip(bytes){
    const ratioCap=Math.min(S.MAX_ARCHIVE_OUTPUT_BYTES,Math.max(1024*1024,bytes.length*S.MAX_COMPRESSION_RATIO));
    return S.decompressLimited(bytes,'gzip',ratioCap,'descompresión GZIP');
  }
  M.archive={
    supports(ext){return ['zip','7z','tar','gz','tgz','tar.gz','tar.bz2','tar.xz'].includes(ext);},
    async analyze(bytes,file){
      const ext=U.ext(file.name);S.assertSignature(bytes,file);
      if(ext==='zip'){const q=zipList(bytes);await inspectZipChildren(q.z,q.f);return q.f;}
      if(ext==='tar')return tarList(bytes).f;
      if(['gz','tgz','tar.gz'].includes(ext)){const inner=await gunzip(bytes),f=[U.finding('Capa gzip',`${U.humanSize(bytes.length)} → ${U.humanSize(inner.length)}`,'Archivo comprimido',false,{source:'GZIP',risk:'info',kind:'technical'})];if(ext!=='gz'||U.text(inner.subarray(257,262))==='ustar')f.push(...tarList(inner).f);return f;}
      if(ext==='7z')return [U.finding('Contenedor 7Z','Formato validado. Inspección interna profunda no disponible sin decodificador 7Z/WASM local.','Archivo comprimido',false,{source:'7Z',risk:'info',kind:'technical'})];
      if(['tar.bz2','tar.xz'].includes(ext))return [U.finding('Contenedor comprimido',`Formato ${ext.toUpperCase()} validado. Inspección profunda pendiente de decodificador local.`,'Archivo comprimido',false,{source:ext.toUpperCase(),risk:'info',kind:'technical'})];
      return[];
    },
    async clean(bytes,selected,file){
      const ext=U.ext(file.name);S.assertSignature(bytes,file);
      if(ext==='zip'){
        const {z}=zipList(bytes);for(const e of z.entries){if(!U.safePath(e.name))throw new Error('El ZIP contiene rutas inseguras y no se reempaqueta automáticamente.');}
        const byPath=new Map();for(const f of selected){if(!f.path)continue;const top=f.path.split(' → ')[0];if(!byPath.has(top))byPath.set(top,[]);byPath.get(top).push(f);}
        for(const [path,items] of byPath){let original;try{original=await z.read(path);}catch(_){continue;}let eng;try{eng=await S.engineForBytes(original,{name:path,type:''},true);}catch(_){continue;}if(!eng||eng===M.archive||eng===M.universal)continue;try{const local=items.map(x=>({...x,path:''})),cleaned=await eng.clean(original,local,{name:path,type:''});z.set(path,cleaned);}catch(_){}}
        return z.build();
      }
      if(ext==='tar'){
        const out=bytes.slice();let p=0,count=0;
        while(p+512<=out.length){const h=out.subarray(p,p+512);if(h.every(x=>x===0))break;if(++count>MAX_FILES)throw new Error('TAR supera el límite de entradas.');const sizeTxt=U.text(h.subarray(124,136)).replace(/\0.*$/,'').trim();if(!/^[0-7 ]*$/.test(sizeTxt))throw new Error('TAR inválido.');const size=parseInt(sizeTxt,8)||0,next=p+512+Math.ceil(size/512)*512;if(next>out.length)throw new Error('TAR truncado.');if(selected.some(f=>f.source==='TAR header')){h.fill(0,265,329);for(let i=148;i<156;i++)h[i]=32;let sum=0;for(const x of h)sum+=x;const oct=sum.toString(8).padStart(6,'0')+'\0 ';h.set(U.utf8(oct),148);}p=next;}return out;
      }
      throw new Error('Este contenedor se inspecciona, pero no se sanea automáticamente en esta versión.');
    }
  };
})();
