const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),zlib=require('zlib');
global.window=global;global.crypto=require('crypto').webcrypto;
for(const f of ['js/core/utils.js','js/core/security.js','js/core/zip-create.js','js/core/zip-lite.js','js/engines/pdf.js','js/engines/jpeg.js','js/engines/png.js','js/engines/ooxml.js','js/engines/media.js','js/engines/archive.js','js/engines/universal.js']){
  vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),{filename:f});
}
(async()=>{
  const M=global.MetaStudio,U=M.utils,S=M.security;
  assert.throws(()=>S.assertFileBeforeRead({name:'huge.pdf',size:S.MAX_INPUT_BYTES+1}),/límite/);
  assert.throws(()=>S.assertSignature(U.utf8('MZ fake executable'),{name:'fake.pdf'}),/Formato incoherente/);
  assert.equal(S.signature(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])),'png');
  const zip=M.createZip([{name:'docs/a.txt',bytes:U.utf8('hello')}]);
  const z=new M.ZipLite(zip);assert.equal(U.text(await z.read('docs/a.txt')),'hello');
  await assert.rejects(()=>S.engineForBytes(zip,{name:'fake.docx',type:''}),/Office Open XML no válido/);
  const gz=new Uint8Array(zlib.gzipSync(Buffer.alloc(600000,0)));await assert.rejects(()=>S.decompressLimited(gz,'gzip',1024*1024,'test bomb'),/ratio de compresión/);
  const corrupt=zip.slice();const dv=new DataView(corrupt.buffer);let eocd=-1;for(let i=corrupt.length-22;i>=0;i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}dv.setUint32(eocd+16,0xfffffff0,true);assert.throws(()=>new M.ZipLite(corrupt),/fuera de límites/);
  const pdf=`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Title (Informe) /Author (Alice) >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R /Info 2 0 R >>\nstartxref\n110\n%%EOF`;
  const pf=await M.pdf.analyze(U.latin1ToBytes(pdf));assert(pf.some(x=>x.key==='Author'&&x.value==='Alice'));
  const complex=pdf.replace('<< /Type /Catalog >>','<< /Type /Catalog /Foo 3 0 R >>').replace('xref','3 0 obj\n<< /Type /ObjStm >>\nendobj\nxref');
  await assert.rejects(()=>M.pdf.analyze(U.latin1ToBytes(complex)),/Object Streams/);
  console.log('OK security tests');
})().catch(e=>{console.error(e);process.exit(1)});
