(function(){
  const M=window.MetaStudio,U=M.utils,S=M.security;
  async function inflateRaw(bytes,expectedSize){
    const max=Math.min(S.MAX_ZIP_ENTRY_UNCOMPRESSED,Math.max(0,Number(expectedSize)||0));
    const out=await S.decompressLimited(bytes,'deflate-raw',max,'descompresión de entrada ZIP');
    if(out.length!==expectedSize)throw new Error(`Entrada ZIP inconsistente: tamaño real ${out.length} distinto del declarado ${expectedSize}.`);
    return out;
  }
  async function deflateRaw(bytes){
    if(typeof CompressionStream==='undefined')throw new Error('Este navegador no soporta compresión local segura. Usa una versión reciente de Chrome o Edge.');
    const cs=new CompressionStream('deflate-raw');
    return S.readStreamLimited(new Blob([bytes]).stream().pipeThrough(cs),Math.max(bytes.length+1024,Math.ceil(bytes.length*1.1)+65536),'compresión ZIP');
  }
  function need(ok,msg){if(!ok)throw new Error(msg);}
  class ZipLite{
    constructor(bytes){this.bytes=bytes;this.entries=[];this.byName=new Map();this.parse();}
    parse(){
      const b=this.bytes;need(b instanceof Uint8Array&&b.length>=22,'ZIP demasiado pequeño o no válido.');
      const v=new DataView(b.buffer,b.byteOffset,b.byteLength);let eocd=-1;
      for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(i+4<=b.length&&U.u32(v,i)===0x06054b50){eocd=i;break;}}
      need(eocd>=0,'ZIP/Office no válido: no se encontró EOCD.');
      need(eocd+22<=b.length,'EOCD ZIP truncado.');
      const disk=U.u16(v,eocd+4),cdDisk=U.u16(v,eocd+6),countDisk=U.u16(v,eocd+8),count=U.u16(v,eocd+10),cdSize=U.u32(v,eocd+12),cdOffset=U.u32(v,eocd+16),commentLen=U.u16(v,eocd+20);
      need(disk===0&&cdDisk===0&&countDisk===count,'ZIP multidisco no soportado por seguridad.');
      need(count!==0xffff&&cdSize!==0xffffffff&&cdOffset!==0xffffffff,'ZIP64 no soportado en esta versión.');
      need(count<=S.MAX_ZIP_ENTRIES,`ZIP rechazado: demasiadas entradas (${count}).`);
      need(eocd+22+commentLen<=b.length,'Comentario EOCD ZIP truncado.');
      need(cdOffset<=b.length&&cdSize<=b.length-cdOffset,'Directorio central ZIP fuera de límites.');
      let p=cdOffset,totalDeclared=0;
      for(let i=0;i<count;i++){
        need(p+46<=b.length,'Directorio central ZIP truncado.');
        need(U.u32(v,p)===0x02014b50,'Directorio ZIP no válido.');
        const flags=U.u16(v,p+8),method=U.u16(v,p+10),crc=U.u32(v,p+16),comp=U.u32(v,p+20),uncomp=U.u32(v,p+24),fn=U.u16(v,p+28),ex=U.u16(v,p+30),cm=U.u16(v,p+32),local=U.u32(v,p+42);
        const end=p+46+fn+ex+cm;need(end<=b.length,'Entrada del directorio central ZIP truncada.');
        const name=U.text(b.subarray(p+46,p+46+fn));need(name.length>0,'ZIP contiene una entrada sin nombre.');need(!name.includes('\0'),'ZIP contiene un nombre de entrada inválido.');need(!this.byName.has(name),`ZIP ambiguo: nombre de entrada duplicado (${name}).`);
        need(local+30<=b.length,'Offset de entrada ZIP fuera de límites.');
        const entry={name,flags,method,crc,compSize:comp,size:uncomp,localOffset:local,changed:null};
        S.assertZipEntry(entry);totalDeclared+=uncomp;need(totalDeclared<=S.MAX_ARCHIVE_OUTPUT_BYTES,`ZIP rechazado: tamaño descomprimido declarado superior a ${U.humanSize(S.MAX_ARCHIVE_OUTPUT_BYTES)}.`);
        this.entries.push(entry);this.byName.set(name,entry);p=end;
      }
      need(p<=cdOffset+cdSize,'Directorio central ZIP inconsistente.');
      S.assertArchiveManifest(this.entries);
    }
    async read(name){
      const e=this.byName.get(name);if(!e)return null;if(e.changed)return e.changed;
      if((e.flags&1)!==0)throw new Error(`Entrada ZIP cifrada no soportada: ${e.name}.`);
      const b=this.bytes,v=new DataView(b.buffer,b.byteOffset,b.byteLength),p=e.localOffset;need(p+30<=b.length,'Cabecera local ZIP truncada.');
      need(U.u32(v,p)===0x04034b50,'Entrada ZIP no válida.');
      const method=U.u16(v,p+8),fn=U.u16(v,p+26),ex=U.u16(v,p+28),start=p+30+fn+ex;need(start<=b.length&&e.compSize<=b.length-start,'Datos comprimidos ZIP fuera de límites.');const localName=U.text(b.subarray(p+30,p+30+fn));need(localName===e.name,'Nombre ZIP inconsistente entre cabecera local y directorio central.');
      need(method===e.method,'Método de compresión inconsistente entre cabecera local y directorio central.');
      const raw=b.subarray(start,start+e.compSize);let out;
      if(e.method===0){need(e.compSize===e.size,'Entrada ZIP almacenada con tamaños inconsistentes.');out=raw.slice();}
      else if(e.method===8)out=await inflateRaw(raw,e.size);
      else throw new Error(`Compresión ZIP no soportada (${e.method}).`);
      need(U.crc32(out)===e.crc,`CRC ZIP incorrecto en ${e.name}.`);return out;
    }
    set(name,bytes){const e=this.byName.get(name);if(!e)throw new Error(`No existe ${name}`);if(bytes.length>S.MAX_ZIP_ENTRY_UNCOMPRESSED)throw new Error(`Contenido saneado demasiado grande para ${name}.`);e.changed=bytes;}
    async build(){
      const locals=[],centrals=[];let offset=0,total=0;
      for(const e of this.entries){
        const name=U.utf8(e.name);let raw,method=e.method,size=e.size,crc=e.crc;
        if(e.changed){size=e.changed.length;crc=U.crc32(e.changed);method=e.method===0?0:8;raw=method===8?await deflateRaw(e.changed):e.changed;}
        else{const v=new DataView(this.bytes.buffer,this.bytes.byteOffset,this.bytes.byteLength),p=e.localOffset,fn=U.u16(v,p+26),ex=U.u16(v,p+28),start=p+30+fn+ex;raw=this.bytes.subarray(start,start+e.compSize);}
        total+=size;if(total>S.MAX_ARCHIVE_OUTPUT_BYTES)throw new Error('El ZIP resultante supera el límite de seguridad descomprimido.');
        const lh=new Uint8Array(30);U.put32(lh,0,0x04034b50);U.put16(lh,4,20);U.put16(lh,6,0x0800);U.put16(lh,8,method);U.put32(lh,14,crc);U.put32(lh,18,raw.length);U.put32(lh,22,size);U.put16(lh,26,name.length);
        locals.push(lh,name,raw);
        const ch=new Uint8Array(46);U.put32(ch,0,0x02014b50);U.put16(ch,4,20);U.put16(ch,6,20);U.put16(ch,8,0x0800);U.put16(ch,10,method);U.put32(ch,16,crc);U.put32(ch,20,raw.length);U.put32(ch,24,size);U.put16(ch,28,name.length);U.put32(ch,42,offset);
        centrals.push(ch,name);offset+=lh.length+name.length+raw.length;
      }
      const localBlob=U.concat(locals),centralBlob=U.concat(centrals),end=new Uint8Array(22);U.put32(end,0,0x06054b50);U.put16(end,8,this.entries.length);U.put16(end,10,this.entries.length);U.put32(end,12,centralBlob.length);U.put32(end,16,localBlob.length);
      return U.concat([localBlob,centralBlob,end]);
    }
  }
  M.ZipLite=ZipLite;
})();
