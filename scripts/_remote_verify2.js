const http = require('http');
function get(p) { return new Promise(r => { http.get({ host: '127.0.0.1', port: 3000, path: p }, x => { let d=''; x.on('data',c=>d+=c); x.on('end',()=>r(d)); }).on('error', e => r('ERR '+e.message)); }); }
(async () => {
  const det = await get('/api/public/products/dv2-diaphragm-valve');
  const j = JSON.parse(det);
  console.log('TOP keys:', Object.keys(j));
  const d = j.data || j;
  console.log('DATA keys:', Object.keys(d));
  console.log('name fields:', d.name, '|', d.nameEn, '|', d.nameJa, '|', d.nameKo);
  console.log('summaryJa head:', (d.summaryJa||'').slice(0,60));
  console.log('featuresJa[0]:', (d.featuresJa||[])[0]);
})();
