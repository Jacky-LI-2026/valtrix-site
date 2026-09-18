const http = require('http');
function get(p) { return new Promise(r => { http.get({ host: '127.0.0.1', port: 3000, path: p }, x => { let d=''; x.on('data',c=>d+=c); x.on('end',()=>r(d)); }); }); }
(async () => {
  const j = JSON.parse(await get('/api/public/products'));
  const models = (j.data||[]).flatMap(t => t.categories||[]).flatMap(c => c.models||[]);
  ['低压中流量隔膜阀 DV2系列','一体式仪表球阀 BV1系列','波纹管计量阀 BSM系列','粉末烧结滤芯过滤器 FT4系列'].forEach(n => {
    const m = models.find(x => x.name === n);
    if (m) console.log('[' + n + '] En=' + m.nameEn + ' | Ja=' + m.nameJa + ' | Ko=' + m.nameKo + ' | specs=' + (m.specs||[]).length + ' | labelJa[0]=' + (m.specs && m.specs[0] && m.specs[0].labelJa));
    else console.log('NOT FOUND: ' + n);
  });
})();
