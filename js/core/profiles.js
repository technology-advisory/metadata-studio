(function(){
  const M=window.MetaStudio;
  M.profiles={
    standard:{name:'Estándar',desc:'Elimina identidad, software, fechas y datos ocultos con bajo impacto funcional.',pick:f=>['critico','alto','medio'].includes(M.risk.classify(f))},
    maximum:{name:'Privacidad máxima',desc:'Selecciona todos los metadatos que el motor puede sanear de forma segura.',pick:f=>f.kind==='metadata'},
    web:{name:'Publicación web',desc:'Prioriza ubicación, dispositivo, EXIF/XMP, software y miniaturas.',pick:f=>/ubicación|dispositivo|software|ocult|exif|gps|xmp|iptc/i.test(f.category+' '+f.source)},
    corporate:{name:'Corporativo',desc:'Conserva títulos descriptivos y elimina identidad, organización, rutas y software.',pick:f=>!/title|título|subject|asunto|keywords/i.test(f.key)&&['critico','alto','medio'].includes(M.risk.classify(f))},
    custom:{name:'Personalizado',desc:'Selecciona manualmente qué elementos eliminar.',pick:f=>!!f.recommended}
  };
})();
