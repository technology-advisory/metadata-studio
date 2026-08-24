(function(){
  const M=window.MetaStudio;
  const weights={critico:28,alto:18,medio:8,bajo:3,info:1};
  function classify(f){const s=((f.key||'')+' '+(f.category||'')+' '+(f.value||'')).toLowerCase();
    if(/gps|latitude|longitude|location|coordenad/.test(s)) return 'critico';
    if(/author|autor|last modified|creator|email|company|empresa|organization|usuario|user|hostname|serial|path|ruta/.test(s)) return 'alto';
    if(/software|producer|application|encoder|device|camera|modelo|created|modified|fecha|time|xmp|iptc|comment/.test(s)) return 'medio';
    return f.risk||'bajo';
  }
  M.risk={
    classify,
    score(findings){let raw=0;for(const f of findings)raw+=weights[classify(f)]||3;return Math.min(100,Math.round(100*(1-Math.exp(-raw/72))));},
    label(score){return score>=75?'Crítico':score>=55?'Alto':score>=30?'Medio':score>0?'Bajo':'Ninguno';}
  };
})();
