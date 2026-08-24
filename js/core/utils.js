(function(){
  const M = window.MetaStudio = window.MetaStudio || {};
  const U = M.utils = {
    humanSize(bytes){ const u=['B','KB','MB','GB','TB']; let i=0,n=Number(bytes)||0; while(n>=1024&&i<u.length-1){n/=1024;i++;} return `${n.toFixed(i?1:0)} ${u[i]}`; },
    ext(name){ const n=(name||'').toLowerCase(); const compound=['tar.gz','tar.bz2','tar.xz']; for(const x of compound) if(n.endsWith('.'+x)) return x; const m=/\.([^.]+)$/.exec(n); return m?m[1]:''; },
    cleanName(name){ const i=name.lastIndexOf('.'); return i<0?name+'-clean':name.slice(0,i)+'-clean'+name.slice(i); },
    baseName(name){return String(name||'archivo').replace(/^.*[\\/]/,'');},
    bytesToLatin1(bytes){ let s='', step=0x8000; for(let i=0;i<bytes.length;i+=step) s += String.fromCharCode(...bytes.subarray(i,Math.min(i+step,bytes.length))); return s; },
    latin1ToBytes(s){ const b=new Uint8Array(s.length); for(let i=0;i<s.length;i++) b[i]=s.charCodeAt(i)&255; return b; },
    text(bytes){ return new TextDecoder('utf-8',{fatal:false}).decode(bytes); },
    utf8(s){ return new TextEncoder().encode(s); },
    download(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1400); },
    escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
    finding(key,value,category='Documento',recommended=true,opts={}){ return {key,value:String(value??''),category,recommended,source:opts.source||category,risk:opts.risk||'medio',path:opts.path||'',kind:opts.kind||'metadata'}; },
    crc32(bytes){ let c=0xffffffff; for(let i=0;i<bytes.length;i++){c^=bytes[i]; for(let k=0;k<8;k++) c=(c>>>1)^((c&1)?0xedb88320:0);} return (c^0xffffffff)>>>0; },
    u16(v,o){return v.getUint16(o,true)}, u32(v,o){return v.getUint32(o,true)},
    put16(a,o,n){a[o]=n&255;a[o+1]=(n>>>8)&255}, put32(a,o,n){a[o]=n&255;a[o+1]=(n>>>8)&255;a[o+2]=(n>>>16)&255;a[o+3]=(n>>>24)&255},
    concat(parts){ const len=parts.reduce((s,p)=>s+p.length,0), out=new Uint8Array(len); let o=0; for(const p of parts){out.set(p,o);o+=p.length;} return out; },
    async sha256(bytes){const h=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');},
    safePath(p){p=String(p||'').replace(/\\/g,'/'); if(p.startsWith('/')||/^[A-Za-z]:\//.test(p)||p.split('/').includes('..')) return null; return p.replace(/^\.\//,'');},
    dosTimeDate(date=new Date()){let y=Math.max(1980,date.getFullYear());return {time:(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1),date:((y-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate()};}
  };
})();
