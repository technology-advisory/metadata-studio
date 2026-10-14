(function(){
  const M=window.MetaStudio,U=M.utils,S=M.security;
  const fields=['Title','Author','Subject','Keywords','Creator','Producer','CreationDate','ModDate'];
  const MAX_DECODED_STREAM=Math.min(S.MAX_PDF_BYTES||64*1024*1024,64*1024*1024);

  function normalizeValue(v){return String(v||'').replace(/\u0000/g,'').replace(/[\u0001-\u001F\u007F]/g,'').trim();}
  function decodePdfString(token){
    if(!token)return'';
    if(token[0]==='('){
      const raw=token.slice(1,-1)
        .replace(/\\\r?\n/g,'')
        .replace(/\\([nrtbf])/g,(m,c)=>({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f'})[c])
        .replace(/\\([()\\])/g,'$1')
        .replace(/\\([0-7]{1,3})/g,(m,o)=>String.fromCharCode(parseInt(o,8)));
      return normalizeValue(raw).slice(0,220);
    }
    if(token[0]==='<'){
      let h=token.slice(1,-1).replace(/\s/g,'');
      if(h.length%2)h+='0';
      if(!h||/^0+$/.test(h))return'';
      if(/^FEFF/i.test(h)){
        let out='';for(let i=4;i+3<h.length;i+=4)out+=String.fromCharCode(parseInt(h.slice(i,i+4),16));
        return normalizeValue(out).slice(0,220);
      }
      let raw='';for(let i=0;i+1<h.length;i+=2)raw+=String.fromCharCode(parseInt(h.slice(i,i+2),16));
      return normalizeValue(raw).slice(0,220);
    }
    return normalizeValue(token);
  }

  function parseObjects(s){
    const out=new Map(),re=/(^|[\r\n])\s*(\d+)\s+(\d+)\s+obj\b/g;let m;
    while((m=re.exec(s))){
      const bodyStart=re.lastIndex,end=s.indexOf('endobj',bodyStart);if(end<0)throw new Error('PDF no compatible: objeto truncado.');
      const key=`${m[2]} ${m[3]}`;
      out.set(key,{num:+m[2],gen:+m[3],bodyStart,bodyEnd:end,body:s.slice(bodyStart,end)});
      re.lastIndex=end+6;
    }
    return out;
  }
  function dictText(o){const p=o.body.indexOf('stream');return p>=0?o.body.slice(0,p):o.body;}
  function directInt(dict,name){const m=new RegExp('\\/'+name+'\\s+(\\d+)\\b').exec(dict);return m?+m[1]:null;}
  function refValue(dict,name){const m=new RegExp('\\/'+name+'\\s+(\\d+)\\s+(\\d+)\\s+R\\b').exec(dict);return m?`${m[1]} ${m[2]}`:null;}
  function streamRange(o,s){
    const rel=o.body.indexOf('stream');if(rel<0)return null;
    let start=o.bodyStart+rel+6;
    if(s.slice(start,start+2)==='\r\n')start+=2;else if(s[start]==='\n'||s[start]==='\r')start+=1;else throw new Error(`PDF no compatible: stream sin fin de línea en objeto ${o.num}.`);
    const dict=dictText(o),len=directInt(dict,'Length');
    let end;
    if(Number.isInteger(len)){
      end=start+len;
      if(end>o.bodyEnd)throw new Error(`PDF no compatible: /Length fuera de límites en objeto ${o.num}.`);
    }else{
      const marker=s.indexOf('endstream',start);if(marker<0||marker>o.bodyEnd)throw new Error(`PDF no compatible: stream truncado en objeto ${o.num}.`);
      end=marker;while(end>start&&(s[end-1]==='\r'||s[end-1]==='\n'))end--;
    }
    return{start,end,length:end-start,dict};
  }
  function filterKind(dict){
    if(!/\/Filter\b/.test(dict))return'none';
    if(/\/Filter\s*\/FlateDecode\b/.test(dict)||/\/Filter\s*\[\s*\/FlateDecode\s*\]/.test(dict))return'flate';
    return'unsupported';
  }
  async function inflateOnce(bytes,label){
    const ds=new DecompressionStream('deflate');
    return S.readStreamLimited(new Blob([bytes]).stream().pipeThrough(ds),MAX_DECODED_STREAM,label||'stream PDF');
  }
  async function inflate(bytes,label){
    if(typeof DecompressionStream==='undefined')throw new Error('Este navegador no soporta la descompresión necesaria para PDF modernos.');
    try{return await inflateOnce(bytes,label);}catch(err){
      // Metadata Studio mantiene el tamaño físico del stream al sanear PDFs modernos.
      // Si la recompresión ocupa menos bytes, el hueco se rellena con NUL.
      // Muchos lectores PDF ignoran ese padding tras el fin del zlib, pero
      // DecompressionStream (Chromium/Node) lo considera "junk". Reintentamos
      // únicamente cuando existe padding NUL final y nunca alteramos el fichero.
      let end=bytes.length;while(end>2&&bytes[end-1]===0)end--;
      if(end===bytes.length)throw err;
      try{return await inflateOnce(bytes.subarray(0,end),label);}catch(_){throw err;}
    }
  }
  async function deflate(bytes,maxBytes,label){
    if(typeof CompressionStream==='undefined')throw new Error('Este navegador no soporta la recompresión necesaria para sanear PDF modernos.');
    const cs=new CompressionStream('deflate');
    return S.readStreamLimited(new Blob([bytes]).stream().pipeThrough(cs),maxBytes,label||'recompresión PDF');
  }
  async function decodeStream(o,s,bytes){
    const r=streamRange(o,s);if(!r)throw new Error(`PDF no compatible: objeto ${o.num} no contiene stream.`);
    const raw=bytes.subarray(r.start,r.end),filter=filterKind(r.dict);
    if(filter==='none')return{decoded:new Uint8Array(raw),range:r,filter};
    if(filter==='flate')return{decoded:await inflate(raw,`stream PDF ${o.num}`),range:r,filter};
    throw new Error(`PDF no compatible: filtro de stream no soportado en objeto ${o.num}.`);
  }

  function extractInfo(body){
    const f=[];for(const k of fields){
      const re=new RegExp('\\/'+k+'\\s*(\\((?:\\\\.|[^\\\\)])*\\)|<[^>]*>)','g'),m=re.exec(body||'');
      if(m){const v=decodePdfString(m[1]);if(v)f.push(U.finding(k,v,'PDF info',true,{source:'PDF Info Dictionary'}));}
    }return f;
  }
  function blankToken(t){if(t[0]==='(')return '('+' '.repeat(Math.max(0,t.length-2))+')';if(t[0]==='<'){const h=t.slice(1,-1),n=h.length;if(/^FEFF/i.test(h)&&n>=4){let body='FEFF';while(body.length+4<=n)body+='0020';if(body.length<n)body+='0'.repeat(n-body.length);return '<'+body+'>';}let body='';while(body.length+2<=n)body+='20';if(body.length<n)body+='0';return '<'+body+'>'; }return t;}
  function blankInfo(body,keys){
    let out=body;for(const k of fields){if(!keys.has(k))continue;const re=new RegExp('(\\/'+k+'\\s*)(\\((?:\\\\.|[^\\\\)])*\\)|<[^>]*>)','g');out=out.replace(re,(m,a,b)=>a+blankToken(b));}
    if(out.length!==body.length)throw new Error('Saneamiento PDF abortado: cambio inesperado en el tamaño del diccionario /Info.');
    return out;
  }

  function classicTrailerInfoRef(s){
    const ti=s.lastIndexOf('trailer');if(ti<0)return null;const end=s.indexOf('startxref',ti),t=s.slice(ti,end>ti?end:s.length);return refValue(t,'Info');
  }
  function xrefStreamInfoRef(objects){
    let ref=null;for(const o of objects.values()){const d=dictText(o);if(/\/Type\s*\/XRef\b/.test(d)){const r=refValue(d,'Info');if(r)ref=r;}}
    return ref;
  }
  function infoRef(s,objects){return xrefStreamInfoRef(objects)||classicTrailerInfoRef(s);}

  function parseObjStmIndex(decoded,dict){
    const n=directInt(dict,'N'),first=directInt(dict,'First');
    if(!Number.isInteger(n)||n<1||n>100000||!Number.isInteger(first)||first<1||first>decoded.length)throw new Error('PDF Object Stream no compatible: /N o /First inválido.');
    const head=U.bytesToLatin1(decoded.subarray(0,first)),nums=head.trim().split(/\s+/).map(Number);
    if(nums.length<2*n||nums.slice(0,2*n).some(x=>!Number.isInteger(x)||x<0))throw new Error('PDF Object Stream no compatible: índice interno inválido.');
    const entries=[];for(let i=0;i<n;i++)entries.push({num:nums[i*2],off:nums[i*2+1]});
    for(let i=1;i<entries.length;i++)if(entries[i].off<entries[i-1].off)throw new Error('PDF Object Stream no compatible: offsets internos desordenados.');
    return{n,first,entries};
  }
  async function locateCompressedObject(targetNum,objects,s,bytes){
    for(const o of objects.values()){
      const d=dictText(o);if(!/\/Type\s*\/ObjStm\b/.test(d))continue;
      if(filterKind(d)!=='flate')throw new Error(`PDF Object Stream ${o.num} usa un filtro no soportado.`);
      const dec=await decodeStream(o,s,bytes),idx=parseObjStmIndex(dec.decoded,d),pos=idx.entries.findIndex(e=>e.num===targetNum);if(pos<0)continue;
      const start=idx.first+idx.entries[pos].off,end=pos+1<idx.entries.length?idx.first+idx.entries[pos+1].off:dec.decoded.length;
      if(start<idx.first||end<start||end>dec.decoded.length)throw new Error('PDF Object Stream no compatible: objeto interno fuera de límites.');
      return{container:o,decoded:dec.decoded,range:dec.range,start,end,body:U.bytesToLatin1(dec.decoded.subarray(start,end))};
    }
    return null;
  }
  async function resolveInfo(ref,objects,s,bytes){
    if(!ref)return null;if(objects.has(ref))return{kind:'direct',object:objects.get(ref),body:objects.get(ref).body};
    const [num,gen]=ref.split(' ').map(Number);if(gen!==0)throw new Error('PDF no compatible: /Info comprimido con generación distinta de 0.');
    const c=await locateCompressedObject(num,objects,s,bytes);if(!c)throw new Error('PDF no compatible: no se pudo resolver el diccionario /Info.');return{kind:'objstm',...c};
  }

  async function metadataStreams(s,objects,bytes){
    const a=[];for(const o of objects.values()){
      const d=dictText(o);if(!/\/(?:Type\s*\/Metadata|Subtype\s*\/XML)\b/.test(d))continue;
      const dec=await decodeStream(o,s,bytes);a.push({object:o,range:dec.range,filter:dec.filter,decoded:dec.decoded,content:U.bytesToLatin1(dec.decoded)});
    }return a;
  }
  async function supportCheck(bytes){
    const s=U.bytesToLatin1(bytes);if(!s.startsWith('%PDF-'))throw new Error('PDF no válido: firma %PDF- ausente.');
    const eof=(s.match(/%%EOF/g)||[]).length;if(eof!==1)throw new Error('PDF complejo no soportado de forma segura: contiene actualizaciones incrementales o múltiples EOF.');
    if(/\/Encrypt\b/.test(s))throw new Error('PDF cifrado no soportado para saneamiento local.');
    if(!/\bstartxref\b/.test(s))throw new Error('PDF no compatible: startxref ausente.');
    const objects=parseObjects(s);if(!objects.size)throw new Error('PDF no compatible: no se reconocen objetos PDF.');
    const hasXrefStream=[...objects.values()].some(o=>/\/Type\s*\/XRef\b/.test(dictText(o)));
    if(!hasXrefStream&&!/\btrailer\b/.test(s))throw new Error('PDF no compatible: no se reconoce trailer ni XRef stream.');
    for(const o of objects.values()){
      const d=dictText(o);if(/\/Type\s*\/ObjStm\b/.test(d)&&filterKind(d)!=='flate')throw new Error(`PDF Object Stream ${o.num} usa un filtro no soportado.`);
      if(/\/Type\s*\/XRef\b/.test(d)&&filterKind(d)==='unsupported')throw new Error(`PDF XRef stream ${o.num} usa un filtro no soportado.`);
    }
    return{s,objects};
  }
  async function replaceStreamSameSize(bytes,range,newDecoded,filter,label){
    let encoded;if(filter==='flate')encoded=await deflate(newDecoded,range.length,label);else encoded=newDecoded;
    if(encoded.length>range.length)throw new Error(`Saneamiento PDF abortado: ${label||'el stream'} recompresado ocupa más que el original (${encoded.length} > ${range.length} bytes).`);
    const out=new Uint8Array(bytes);out.set(encoded,range.start);out.fill(0,range.start+encoded.length,range.end);return out;
  }

  M.pdf={
    supports(ext){return ext==='pdf';},
    async analyze(bytes){
      S.assertSignature(bytes,{name:'x.pdf'});const ctx=await supportCheck(bytes),{s,objects}=ctx,f=[],ref=infoRef(s,objects),info=await resolveInfo(ref,objects,s,bytes);
      if(info)f.push(...extractInfo(info.body));
      const streams=await metadataStreams(s,objects,bytes);if(streams.some(x=>normalizeValue(x.content)))f.push(U.finding('XMP metadata','Paquete XMP/XML detectado','XMP',true,{source:'PDF Metadata stream'}));
      const partial=[];if(/\/EmbeddedFile\b/.test(s))partial.push('archivos adjuntos');if(/\/Annots\b/.test(s))partial.push('anotaciones');if(/\/OpenAction\b/.test(s))partial.push('acciones de apertura');if(/\/(?:JavaScript|JS)\b/.test(s))partial.push('JavaScript embebido');
      if(partial.length)f.push(U.finding('Cobertura PDF',`El PDF contiene ${partial.join(', ')}; estos elementos no se saneaan automáticamente.`,'Documento',false,{source:'Motor PDF',risk:'info',kind:'coverage'}));
      return f;
    },
    async clean(bytes,selected){
      let out=new Uint8Array(bytes),ctx=await supportCheck(out),{s,objects}=ctx,keys=new Set(selected.map(x=>x.key)),cats=new Set(selected.map(x=>x.category)),ref=infoRef(s,objects),info=await resolveInfo(ref,objects,s,out);
      if(info&&fields.some(k=>keys.has(k))){
        if(info.kind==='direct'){
          const body=blankInfo(info.body,keys);const repl=U.latin1ToBytes(body);if(repl.length!==info.object.bodyEnd-info.object.bodyStart)throw new Error('Saneamiento PDF abortado: tamaño inesperado en /Info.');out.set(repl,info.object.bodyStart);
        }else{
          const body=blankInfo(info.body,keys),rep=U.latin1ToBytes(body),dec=new Uint8Array(info.decoded);if(rep.length!==info.end-info.start)throw new Error('Saneamiento PDF abortado: tamaño inesperado en /Info comprimido.');dec.set(rep,info.start);out=await replaceStreamSameSize(out,info.range,dec,'flate','Object Stream /Info');
        }
        ctx=await supportCheck(out);s=ctx.s;objects=ctx.objects;
      }
      if(cats.has('XMP')||keys.has('XMP metadata')){
        const streams=(await metadataStreams(s,objects,out)).sort((a,b)=>b.range.start-a.range.start);
        for(const st of streams){const blank=new Uint8Array(st.decoded.length);blank.fill(0x20);out=await replaceStreamSameSize(out,st.range,blank,st.filter,'stream XMP');ctx=await supportCheck(out);s=ctx.s;objects=ctx.objects;}
      }
      if(out.length!==bytes.length)throw new Error('Saneamiento PDF abortado: el tamaño estructural cambió.');return out;
    }
  };
})();
