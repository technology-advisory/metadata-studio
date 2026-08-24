(function(){
  const M=window.MetaStudio, U=M.utils;
  async function inflateRaw(bytes){
    if(typeof DecompressionStream==='undefined') throw new Error('Este navegador no soporta descompresión local de Office. Usa una versión reciente de Chrome o Edge.');
    const ds=new DecompressionStream('deflate-raw');
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer());
  }
  async function deflateRaw(bytes){
    if(typeof CompressionStream==='undefined') throw new Error('Este navegador no soporta compresión local de Office. Usa una versión reciente de Chrome o Edge.');
    const cs=new CompressionStream('deflate-raw');
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer());
  }
  class ZipLite{
    constructor(bytes){this.bytes=bytes;this.entries=[];this.byName=new Map();this.parse();}
    parse(){
      const b=this.bytes,v=new DataView(b.buffer,b.byteOffset,b.byteLength); let eocd=-1;
      for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(U.u32(v,i)===0x06054b50){eocd=i;break;}}
      if(eocd<0) throw new Error('ZIP/Office no válido.');
      const count=U.u16(v,eocd+10), cdOffset=U.u32(v,eocd+16); let p=cdOffset;
      for(let i=0;i<count;i++){
        if(U.u32(v,p)!==0x02014b50) throw new Error('Directorio ZIP no válido.');
        const flags=U.u16(v,p+8), method=U.u16(v,p+10), crc=U.u32(v,p+16), comp=U.u32(v,p+20), uncomp=U.u32(v,p+24), fn=U.u16(v,p+28), ex=U.u16(v,p+30), cm=U.u16(v,p+32), local=U.u32(v,p+42);
        const name=U.text(b.subarray(p+46,p+46+fn));
        const entry={name,flags,method,crc,compSize:comp,size:uncomp,localOffset:local,changed:null};
        this.entries.push(entry);this.byName.set(name,entry);p+=46+fn+ex+cm;
      }
    }
    async read(name){
      const e=this.byName.get(name); if(!e)return null; if(e.changed)return e.changed;
      const b=this.bytes,v=new DataView(b.buffer,b.byteOffset,b.byteLength), p=e.localOffset;
      if(U.u32(v,p)!==0x04034b50)throw new Error('Entrada ZIP no válida.');
      const fn=U.u16(v,p+26),ex=U.u16(v,p+28),start=p+30+fn+ex,raw=b.subarray(start,start+e.compSize);
      if(e.method===0)return raw.slice(); if(e.method===8)return inflateRaw(raw); throw new Error(`Compresión ZIP no soportada (${e.method}).`);
    }
    set(name,bytes){const e=this.byName.get(name);if(!e)throw new Error(`No existe ${name}`);e.changed=bytes;}
    async build(){
      const locals=[], centrals=[]; let offset=0;
      for(const e of this.entries){
        const name=U.utf8(e.name); let raw,method=e.method,size=e.size,crc=e.crc;
        if(e.changed){size=e.changed.length;crc=U.crc32(e.changed);method=e.method===0?0:8;raw=method===8?await deflateRaw(e.changed):e.changed;}
        else{
          const v=new DataView(this.bytes.buffer,this.bytes.byteOffset,this.bytes.byteLength),p=e.localOffset,fn=U.u16(v,p+26),ex=U.u16(v,p+28),start=p+30+fn+ex;raw=this.bytes.subarray(start,start+e.compSize);
        }
        const lh=new Uint8Array(30);U.put32(lh,0,0x04034b50);U.put16(lh,4,20);U.put16(lh,6,0x0800);U.put16(lh,8,method);U.put32(lh,14,crc);U.put32(lh,18,raw.length);U.put32(lh,22,size);U.put16(lh,26,name.length);
        locals.push(lh,name,raw);
        const ch=new Uint8Array(46);U.put32(ch,0,0x02014b50);U.put16(ch,4,20);U.put16(ch,6,20);U.put16(ch,8,0x0800);U.put16(ch,10,method);U.put32(ch,16,crc);U.put32(ch,20,raw.length);U.put32(ch,24,size);U.put16(ch,28,name.length);U.put32(ch,42,offset);
        centrals.push(ch,name);offset+=lh.length+name.length+raw.length;
      }
      const localBlob=U.concat(locals), centralBlob=U.concat(centrals), end=new Uint8Array(22);U.put32(end,0,0x06054b50);U.put16(end,8,this.entries.length);U.put16(end,10,this.entries.length);U.put32(end,12,centralBlob.length);U.put32(end,16,localBlob.length);
      return U.concat([localBlob,centralBlob,end]);
    }
  }
  M.ZipLite=ZipLite;
})();
