(function(){
  const M=window.MetaStudio,U=M.utils;
  M.universal={supports(){return true;},async analyze(bytes,file){const f=[];f.push(U.finding('Tipo de archivo',file.type||'No declarado','Técnico',false,{source:'Navegador',risk:'info',kind:'technical'}));f.push(U.finding('Tamaño',U.humanSize(bytes.length),'Técnico',false,{source:'Archivo',risk:'info',kind:'technical'}));f.push(U.finding('SHA-256',await U.sha256(bytes),'Técnico',false,{source:'Web Crypto',risk:'info',kind:'technical'}));return f;},async clean(){throw new Error('Este formato solo dispone de inspección universal; no existe un saneador seguro específico.');}};
})();
