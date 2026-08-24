(function(){
  const M=window.MetaStudio,U=M.utils;
  const MB=1024*1024;
  const S=M.security={
    MAX_INPUT_BYTES:256*MB, MAX_ARCHIVE_INPUT_BYTES:128*MB, MAX_PDF_BYTES:64*MB,
    MAX_ZIP_ENTRIES:3000, MAX_ARCHIVE_FILES:1500, MAX_ZIP_ENTRY_UNCOMPRESSED:128*MB,
    MAX_ARCHIVE_OUTPUT_BYTES:256*MB, MAX_COMPRESSION_RATIO:200, MAX_CHILD_SCAN_BYTES:128*MB,
    MAX_CHILD_SCAN_FILES:120, MAX_OOXML_PROPS_XML:1024*1024,
    LIMITS_LABEL:'256 MB por archivo; PDF 64 MB; comprimidos 128 MB; 256 MB descomprimidos por contenedor.',
    archiveExts:new Set(['zip','7z','tar','gz','tgz','tar.gz','tar.bz2','tar.xz']),
    supportedExts:new Set(['pdf','jpg','jpeg','png','docx','xlsx','pptx','mp3','mp4','mov','m4a','wav','flac','ogg','webm','mkv','avi','zip','7z','tar','gz','tgz','tar.gz','tar.bz2','tar.xz']),
    assertFileBeforeRead(file){
      const size=Number(file?.size||0),ext=U.ext(file?.name||'');
      if(size<0||!Number.isFinite(size))throw new Error('El tamaño del archivo no es válido.');
      let max=this.MAX_INPUT_BYTES;if(this.archiveExts.has(ext))max=this.MAX_ARCHIVE_INPUT_BYTES;if(ext==='pdf')max=this.MAX_PDF_BYTES;
      if(size>max)throw new Error(`Archivo rechazado por seguridad: ${U.humanSize(size)} supera el límite de ${U.humanSize(max)} para este formato.`);
    },
    signature(bytes){
      if(!bytes||!bytes.length)return'empty';const b=bytes,ascii=(o,n)=>String.fromCharCode(...b.subarray(o,Math.min(o+n,b.length)));
      if(b.length>=5&&ascii(0,5)==='%PDF-')return'pdf';if(b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return'jpeg';
      if(b.length>=8&&[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((x,i)=>b[i]===x))return'png';
      if(b.length>=4&&b[0]===0x50&&b[1]===0x4b&&[[0x03,0x04],[0x05,0x06],[0x07,0x08]].some(x=>b[2]===x[0]&&b[3]===x[1]))return'zip';
      if(b.length>=6&&[0x37,0x7a,0xbc,0xaf,0x27,0x1c].every((x,i)=>b[i]===x))return'7z';if(b.length>=6&&[0xfd,0x37,0x7a,0x58,0x5a,0x00].every((x,i)=>b[i]===x))return'xz';
      if(b.length>=3&&ascii(0,3)==='BZh')return'bzip2';if(b.length>=2&&b[0]===0x1f&&b[1]===0x8b)return'gzip';if(b.length>=262&&ascii(257,5)==='ustar')return'tar';
      if(b.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WAVE')return'wav';if(b.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='AVI ')return'avi';
      if(b.length>=4&&ascii(0,4)==='fLaC')return'flac';if(b.length>=4&&ascii(0,4)==='OggS')return'ogg';if(b.length>=4&&b[0]===0x1a&&b[1]===0x45&&b[2]===0xdf&&b[3]===0xa3)return'ebml';
      if(b.length>=3&&ascii(0,3)==='ID3')return'mp3';if(b.length>=2&&b[0]===0xff&&(b[1]&0xe0)===0xe0)return'mp3';if(b.length>=12&&['ftyp','moov','mdat','free','wide'].includes(ascii(4,4)))return'isobmff';return'unknown';
    },
    expectedSignature(ext){return({pdf:'pdf',jpg:'jpeg',jpeg:'jpeg',png:'png',docx:'zip',xlsx:'zip',pptx:'zip',zip:'zip','7z':'7z',tar:'tar',gz:'gzip',tgz:'gzip','tar.gz':'gzip','tar.bz2':'bzip2','tar.xz':'xz',mp3:'mp3',mp4:'isobmff',mov:'isobmff',m4a:'isobmff',wav:'wav',avi:'avi',flac:'flac',ogg:'ogg',webm:'ebml',mkv:'ebml'})[ext]||null;},
    assertSignature(bytes,file){const ext=U.ext(file?.name||''),expected=this.expectedSignature(ext),actual=this.signature(bytes);if(expected&&actual!==expected)throw new Error(`Formato incoherente: la extensión .${ext} no coincide con la firma real del archivo (${actual==='unknown'?'desconocida':actual}).`);return{ext,actual};},
    assertDetectedSize(bytes,file){const sig=this.signature(bytes),size=bytes.length;if(sig==='pdf'&&size>this.MAX_PDF_BYTES)throw new Error(`PDF rechazado: supera ${U.humanSize(this.MAX_PDF_BYTES)}.`);if(['zip','7z','tar','gzip','xz','bzip2'].includes(sig)&&size>this.MAX_ARCHIVE_INPUT_BYTES)throw new Error(`Contenedor rechazado: supera ${U.humanSize(this.MAX_ARCHIVE_INPUT_BYTES)}.`);},
    assertFileByDetectedSignature(file,headBytes){const sig=this.signature(headBytes),size=Number(file?.size||0);if(sig==='pdf'&&size>this.MAX_PDF_BYTES)throw new Error(`PDF rechazado: ${U.humanSize(size)} supera ${U.humanSize(this.MAX_PDF_BYTES)}.`);if(['zip','7z','tar','gzip','xz','bzip2'].includes(sig)&&size>this.MAX_ARCHIVE_INPUT_BYTES)throw new Error(`Contenedor rechazado: ${U.humanSize(size)} supera ${U.humanSize(this.MAX_ARCHIVE_INPUT_BYTES)}.`);return sig;},
    assertOoxmlStructure(zip,ext){if(!zip?.byName?.has('[Content_Types].xml'))throw new Error('Office Open XML no válido: falta [Content_Types].xml.');const required={docx:'word/document.xml',xlsx:'xl/workbook.xml',pptx:'ppt/presentation.xml'}[ext];if(required&&!zip.byName.has(required))throw new Error(`El archivo .${ext} no contiene la estructura OOXML esperada (${required}).`);},
    async engineForBytes(bytes,file,embedded=false){const ext=U.ext(file?.name||'');this.assertSignature(bytes,file);this.assertDetectedSize(bytes,file);if(['docx','xlsx','pptx'].includes(ext)){const z=new M.ZipLite(bytes);this.assertOoxmlStructure(z,ext);return M.ooxml;}return [M.pdf,M.jpeg,M.png,M.media,M.archive].find(e=>e&&e.supports(ext))||(embedded?null:M.universal);},
    async readStreamLimited(stream,maxBytes,label='flujo'){const reader=stream.getReader(),chunks=[];let total=0;try{while(true){const{value,done}=await reader.read();if(done)break;const chunk=value instanceof Uint8Array?value:new Uint8Array(value);total+=chunk.length;if(total>maxBytes){try{await reader.cancel();}catch(_){}throw new Error(`Límite de seguridad excedido durante ${label}: más de ${U.humanSize(maxBytes)}.`);}chunks.push(chunk);}}finally{try{reader.releaseLock();}catch(_){}}return U.concat(chunks);},
    async decompressLimited(bytes,format,maxBytes,label){if(typeof DecompressionStream==='undefined')throw new Error('Este navegador no soporta descompresión segura mediante streams.');const ds=new DecompressionStream(format),out=await this.readStreamLimited(new Blob([bytes]).stream().pipeThrough(ds),maxBytes,label||`descompresión ${format}`),ratio=bytes.length?out.length/bytes.length:out.length;if(ratio>this.MAX_COMPRESSION_RATIO)throw new Error(`Archivo rechazado: ratio de compresión ${ratio.toFixed(1)}:1 superior a ${this.MAX_COMPRESSION_RATIO}:1.`);return out;},
    assertZipEntry(e){if(e.size>this.MAX_ZIP_ENTRY_UNCOMPRESSED)throw new Error(`Entrada ZIP demasiado grande: ${e.name}.`);if(e.compSize>0&&e.size/e.compSize>this.MAX_COMPRESSION_RATIO)throw new Error(`Entrada ZIP con ratio excesivo: ${e.name}.`);},
    assertArchiveManifest(entries){if(entries.length>this.MAX_ZIP_ENTRIES)throw new Error(`ZIP rechazado: ${entries.length} entradas supera ${this.MAX_ZIP_ENTRIES}.`);let total=0;for(const e of entries){this.assertZipEntry(e);total+=e.size;if(total>this.MAX_ARCHIVE_OUTPUT_BYTES)throw new Error(`ZIP rechazado: tamaño descomprimido superior a ${U.humanSize(this.MAX_ARCHIVE_OUTPUT_BYTES)}.`);}return total;}
  };
})();
