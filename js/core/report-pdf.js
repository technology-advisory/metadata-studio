(function(){
  const M=window.MetaStudio,U=M.utils;
  const C={navy:[0.027,0.086,0.31],blue:[0.07,0.38,0.89],cyan:[0.12,0.73,0.9],ink:[0.075,0.14,0.25],muted:[0.39,0.46,0.57],line:[0.87,0.9,0.94],soft:[0.965,0.975,0.99],green:[0.07,0.58,0.32],greenSoft:[0.93,0.98,0.95],amber:[0.92,0.52,0.1],red:[0.87,0.21,0.23],white:[1,1,1]};
  function clean(s){return String(s??'').replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x09\x0A\x0D\x20-\xFF]/g,'?');}
  function esc(s){return clean(s).replace(/([\\()])/g,'\\$1');}
  function wrap(s,max=78){const words=clean(s).split(/\s+/),out=[];let line='';for(const w of words){const n=(line+' '+w).trim();if(n.length>max&&line){out.push(line);line=w}else line=n}if(line)out.push(line);return out.length?out:[''];}
  const rgb=c=>`${c[0]} ${c[1]} ${c[2]}`;
  function displayKey(k){const m={title:'Título',author:'Autor',subject:'Asunto',producer:'Productor',creator:'Creador',creationdate:'Fecha de creación',moddate:'Fecha de modificación',keywords:'Palabras clave',lastmodifiedby:'Último editor'};const key=String(k||'');return m[key.toLowerCase().replace(/[^a-z]/g,'')]||key;}
  function makeReport(d){
    const pages=[];
    function newPage(){const p=[];pages.push(p);return p}
    function rect(p,x,y,w,h,fill,stroke=null,r=0){p.push('q');if(fill)p.push(`${rgb(fill)} rg`);if(stroke)p.push(`${rgb(stroke)} RG 0.7 w`);p.push(`${x} ${y} ${w} ${h} re ${fill&&stroke?'B':fill?'f':'S'}`);p.push('Q');}
    function line(p,x1,y1,x2,y2,color=C.line,w=.7){p.push(`q ${rgb(color)} RG ${w} w ${x1} ${y1} m ${x2} ${y2} l S Q`)}
    function txt(p,text,x,y,size=9,font='F1',color=C.ink){p.push(`BT ${rgb(color)} rg /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET`)}
    function para(p,text,x,y,widthChars=88,size=8.5,leading=12,color=C.muted,font='F1'){for(const ln of wrap(text,widthChars)){txt(p,ln,x,y,size,font,color);y-=leading}return y}
    function pill(p,text,x,y,w,fill,color){rect(p,x,y,w,18,fill);txt(p,text,x+9,y+5,7.5,'F2',color)}
    function header(p,section='INFORME DE SANEAMIENTO'){
      rect(p,0,742,595,100,C.navy);rect(p,0,738,595,4,C.cyan);txt(p,'OPENTRUST',42,808,10.5,'F2',C.white);txt(p,'|  Privacy Tools',112,808,9,'F1',C.cyan);txt(p,'Metadata Studio',42,778,25,'F2',C.white);txt(p,section,42,758,8.5,'F2',[.79,.87,.98]);txt(p,'EVIDENCIA LOCAL · PRIVACIDAD POR DISEÑO',390,807,7.2,'F2',[.64,.75,.94]);
    }
    function footer(p,num,total){line(p,42,41,553,41,C.line,.6);txt(p,'Generado localmente por Metadata Studio · OpenTrust',42,26,7.5,'F1',C.muted);txt(p,`Página ${num} de ${total}`,500,26,7.5,'F1',C.muted)}
    const before=d.before||[],after=d.after||[],selected=d.selected||[],verificationOnly=d.mode==='verification';
    let p=newPage();header(p,verificationOnly?'INFORME DE VERIFICACIÓN':'INFORME DE SANEAMIENTO');
    txt(p,'Resumen ejecutivo',42,708,17,'F2',C.ink);txt(p,verificationOnly?'Resultado de la inspección y verificación del archivo':'Resultado del proceso de saneamiento y verificación posterior',42,690,9,'F1',C.muted);
    // status panel
    rect(p,42,608,511,64,C.greenSoft,[.77,.9,.82]);txt(p,verificationOnly?'ARCHIVO VERIFICADO · SIN CAMBIOS':(after.length?'SANEAMIENTO COMPLETADO CON OBSERVACIONES':'SANEAMIENTO COMPLETADO'),60,648,9,'F2',verificationOnly?C.green:(after.length?C.amber:C.green));txt(p,verificationOnly?'No se han detectado metadatos sensibles con contenido significativo. No ha sido necesario modificar el archivo.':(after.length?'La copia se ha generado correctamente. Permanecen elementos conservados o no saneables de forma segura.':'La copia se ha generado correctamente y la verificación posterior no detecta hallazgos sensibles compatibles.'),60,628,8.2,'F1',C.ink);
    // KPI cards
    const cards=verificationOnly?[['RIESGO',`${d.beforeScore}/100`,d.beforeRisk,C.green],['HALLAZGOS',String(before.length),'privacidad',C.green],['CAMBIOS','0','archivo intacto',C.blue],['VERIFICACIÓN','OK','sin hallazgos',C.green]]:[['RIESGO INICIAL',`${d.beforeScore}/100`,d.beforeRisk,C.red],['RIESGO FINAL',`${d.afterScore}/100`,d.afterRisk,after.length?C.amber:C.green],['TRATADOS',String(selected.length),'elementos',C.blue],['POST-VERIFICACIÓN',String(after.length),after.length?'hallazgos':'sin hallazgos',after.length?C.amber:C.green]];
    cards.forEach((a,i)=>{const x=42+i*128;rect(p,x,527,119,62,C.soft,C.line);txt(p,a[0],x+10,574,6.8,'F2',C.muted);txt(p,a[1],x+10,548,18,'F2',a[3]);txt(p,a[2],x+10,536,6.8,'F1',C.muted)});
    // file identity
    txt(p,'Identificación del archivo',42,494,12,'F2',C.ink);line(p,42,486,553,486,C.line);
    const info=verificationOnly?[['Archivo verificado',d.originalName],['Resultado','Sin modificaciones'],['Tamaño',U.humanSize(d.originalSize)],['Fecha del proceso',d.date]]:[['Archivo original',d.originalName],['Copia saneada',d.cleanName],['Tamaño original',U.humanSize(d.originalSize)],['Fecha del proceso',d.date]];
    let y=466;info.forEach(([k,v])=>{txt(p,k,42,y,7.5,'F2',C.muted);txt(p,v,155,y,8.5,'F1',C.ink);y-=20});
    txt(p,'Integridad criptográfica',42,370,12,'F2',C.ink);line(p,42,362,553,362,C.line);
    rect(p,42,303,511,46,C.soft,C.line);txt(p,'SHA-256 · ORIGINAL',54,334,6.8,'F2',C.muted);txt(p,d.originalHash,54,315,7.3,'F1',C.ink);
    rect(p,42,242,511,46,C.soft,C.line);txt(p,verificationOnly?'SHA-256 · ARCHIVO VERIFICADO':'SHA-256 · COPIA SANEADA',54,273,6.8,'F2',C.muted);txt(p,d.cleanHash,54,254,7.3,'F1',C.ink);
    txt(p,'Alcance de la verificación',42,210,12,'F2',C.ink);line(p,42,202,553,202,C.line);
    let yy=183;yy=para(p,'El informe omite por defecto los valores originales eliminados para no reexponer información sensible. Metadata Studio documenta los controles ejecutados sobre el formato analizado. La verificación se limita a los analizadores compatibles y no constituye una certificación de ausencia absoluta de información oculta.',42,yy,105,8.2,11,C.muted);yy-=5;para(p,verificationOnly?'Todo el proceso se ha ejecutado localmente en el navegador. El archivo no se ha modificado, enviado ni almacenado en ningún servidor de OpenTrust.':'Todo el proceso se ha ejecutado localmente en el navegador. El archivo original y la copia saneada no se han enviado ni almacenado en ningún servidor de OpenTrust.',42,yy,105,8.2,11,C.muted);

    // details pages
    const chunks=[];for(let i=0;i<selected.length;i+=15)chunks.push(selected.slice(i,i+15));if(!chunks.length)chunks.push([]);
    if(!verificationOnly) chunks.forEach((chunk,idx)=>{
      const q=newPage();header(q,idx===0?'DETALLE DE ELEMENTOS TRATADOS':'DETALLE DE ELEMENTOS TRATADOS · CONTINUACIÓN');
      txt(q,verificationOnly?'Resultado de la inspección':'Elementos tratados',42,706,16,'F2',C.ink);txt(q,verificationOnly?'No se identificaron elementos de privacidad que requieran saneamiento. Las propiedades técnicas no se contabilizan como hallazgos.':`Se muestran ${selected.length} elementos seleccionados para saneamiento.`,42,688,8.5,'F1',C.muted);
      let y2=655;rect(q,42,y2,511,25,C.navy);txt(q,'CAMPO',52,y2+8,7,'F2',C.white);txt(q,'ORIGEN',240,y2+8,7,'F2',C.white);txt(q,'VALOR DETECTADO',340,y2+8,7,'F2',C.white);y2-=2;
      if(!chunk.length){rect(q,42,y2-44,511,44,C.soft,C.line);txt(q,verificationOnly?'No se han detectado metadatos sensibles con contenido significativo.':'No se seleccionaron elementos para eliminar.',55,y2-27,8.5,'F1',C.muted);y2-=54}
      chunk.forEach((f,j)=>{
        const source=clean(f.source||f.category||'-'), key=clean(displayKey(f.key||'-'));
        const kh=wrap(key,27), rows=Math.max(kh.length,1),h=Math.max(35,13+rows*10);rect(q,42,y2-h,511,h,j%2?C.soft:C.white,C.line);kh.forEach((t,k)=>txt(q,t,52,y2-19-k*10,7.6,k===0?'F2':'F1',C.ink));txt(q,source.slice(0,21),240,y2-19,7.4,'F1',C.muted);txt(q,'Eliminado / saneado',340,y2-19,7.4,'F2',C.green);y2-=h;
      });
      if(idx===chunks.length-1){y2-=18;txt(q,'Verificación posterior',42,y2,12,'F2',C.ink);line(q,42,y2-8,553,y2-8,C.line);y2-=28;if(!after.length){pill(q,'SIN HALLAZGOS SENSIBLES COMPATIBLES',42,y2-4,215,C.greenSoft,C.green);y2-=34;para(q,'No se han detectado metadatos sensibles mediante los controles compatibles con este formato después del saneamiento.',42,y2,102,8.3,11,C.muted)}else{pill(q,`${after.length} HALLAZGOS POSTERIORES`,42,y2-4,155,[1,.96,.89],C.amber);y2-=34;after.slice(0,6).forEach(f=>{txt(q,`• ${clean(f.key).slice(0,50)}`,48,y2,8,'F2',C.ink);txt(q,clean(String(f.value)).slice(0,70),230,y2,7.7,'F1',C.muted);y2-=17})}}
    });
    // build PDF after total known
    const objs=[];const addObj=s=>{objs.push(s);return objs.length};const f1=addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');const f2=addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageRefs=[],contentRefs=[];pages.forEach((ops,i)=>{footer(ops,i+1,pages.length);const stream=ops.join('\n');const c=addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);contentRefs.push(c);pageRefs.push(addObj('PENDING'))});const pagesObj=addObj('PAGES_PENDING');pageRefs.forEach((ref,i)=>objs[ref-1]=`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentRefs[i]} 0 R >>`);objs[pagesObj-1]=`<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map(r=>r+' 0 R').join(' ')}] >>`;const catalog=addObj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
    let pdf='%PDF-1.4\n%âãÏÓ\n';const offs=[0];objs.forEach((o,i)=>{offs.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});const xref=pdf.length;pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offs.length;i++)pdf+=String(offs[i]).padStart(10,'0')+' 00000 n \n';pdf+=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return U.latin1ToBytes(pdf);
  }
  M.reportPdf={make:makeReport};
})();
