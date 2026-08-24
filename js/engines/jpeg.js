(function(){
  const M=window.MetaStudio,U=M.utils;
  function str(bytes,start,len){return String.fromCharCode(...bytes.subarray(start,start+len));}
  function parseExif(payload){
    const out=[]; if(str(payload,0,6)!=='Exif\0\0')return out; const t=payload.subarray(6), dv=new DataView(t.buffer,t.byteOffset,t.byteLength); const le=str(t,0,2)==='II'; const g16=o=>dv.getUint16(o,le),g32=o=>dv.getUint32(o,le); if(g16(2)!==42)return out;
    const types={1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8};
    const readVal=(type,count,vo)=>{const len=(types[type]||1)*count,off=len<=4?vo:g32(vo); if(off<0||off+len>t.length)return ''; if(type===2)return new TextDecoder('ascii').decode(t.subarray(off,off+len)).replace(/\0+$/,''); if(type===3&&count===1)return g16(off); if(type===4&&count===1)return g32(off); return '';};
    const seen=new Set();
    function ifd(off,kind='EXIF'){if(!off||off+2>t.length||seen.has(off))return;seen.add(off);const n=g16(off);for(let i=0;i<n;i++){const p=off+2+i*12;if(p+12>t.length)break;const tag=g16(p),type=g16(p+2),count=g32(p+4),v=readVal(type,count,p+8);const names={0x010f:'Camera make',0x0110:'Camera model',0x0131:'Software',0x0132:'Date/time',0x013b:'Artist',0x8298:'Copyright',0x0112:'Orientation'};if(names[tag]&&v!=='')out.push(U.finding(names[tag],v,'EXIF',tag!==0x0112));if(tag===0x8769||tag===0x8825){const child=g32(p+8); if(tag===0x8825){out.push(U.finding('GPS data','Detected','GPS',true));} ifd(child,tag===0x8825?'GPS':'EXIF');}}}
    try{ifd(g32(4));}catch(_){ }
    return out;
  }
  function segments(bytes){
    const arr=[]; if(bytes[0]!==0xff||bytes[1]!==0xd8)return arr; let p=2;
    while(p+4<=bytes.length){if(bytes[p]!==0xff){p++;continue;}let marker=bytes[p+1]; if(marker===0xda){arr.push({marker,start:p,end:bytes.length,scan:true});break;} if(marker===0xd9){arr.push({marker,start:p,end:p+2});break;} if((marker>=0xd0&&marker<=0xd7)||marker===0x01){arr.push({marker,start:p,end:p+2});p+=2;continue;} const len=(bytes[p+2]<<8)|bytes[p+3]; if(len<2||p+2+len>bytes.length)break;arr.push({marker,start:p,end:p+2+len,payloadStart:p+4,payloadEnd:p+2+len});p+=2+len;}
    return arr;
  }
  M.jpeg={
    supports(ext){return ext==='jpg'||ext==='jpeg';},
    async analyze(bytes){const f=[];for(const s of segments(bytes)){if(s.marker===0xe1){const p=bytes.subarray(s.payloadStart,s.payloadEnd);const head=str(p,0,Math.min(32,p.length));if(head.startsWith('Exif\0\0')){f.push(U.finding('EXIF block',`${p.length} bytes`,'EXIF',true));f.push(...parseExif(p));}else if(head.includes('http://ns.adobe.com/xap/1.0/'))f.push(U.finding('XMP packet',`${p.length} bytes`,'XMP',true));}else if(s.marker===0xed)f.push(U.finding('IPTC / Photoshop block',`${s.payloadEnd-s.payloadStart} bytes`,'IPTC',true));else if(s.marker===0xfe)f.push(U.finding('JPEG comment',`${s.payloadEnd-s.payloadStart} bytes`,'Comment',true));}return f;},
    async clean(bytes,selected){const cats=new Set(selected.map(x=>x.category)),keys=new Set(selected.map(x=>x.key));const parts=[bytes.subarray(0,2)];for(const s of segments(bytes)){if(s.scan){parts.push(bytes.subarray(s.start));break;}let drop=false;if(s.marker===0xe1){const p=bytes.subarray(s.payloadStart,s.payloadEnd),head=str(p,0,Math.min(32,p.length));if(head.startsWith('Exif\0\0')&&(cats.has('EXIF')||cats.has('GPS')))drop=true;if(head.includes('http://ns.adobe.com/xap/1.0/')&&cats.has('XMP'))drop=true;}if(s.marker===0xed&&cats.has('IPTC'))drop=true;if(s.marker===0xfe&&keys.has('JPEG comment'))drop=true;if(!drop)parts.push(bytes.subarray(s.start,s.end));}return U.concat(parts);}
  };
})();
