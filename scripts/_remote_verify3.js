const http = require('http');
function get(p) { return new Promise(r => { http.get({ host: '127.0.0.1', port: 3000, path: p }, x => { let d=''; x.on('data',c=>d+=c); x.on('end',()=>r(d)); }).on('error', e => r('ERR '+e.message)); }); }
(async () => {
  const list = await get('/api/public/products');
  const j = JSON.parse(list);
  const tab0 = (j.data||[])[0];
  console.log('tab0 keys:', Object.keys(tab0));
  const cat0 = (tab0.categories||[])[0];
  console.log('cat0 keys:', Object.keys(cat0));
  const p0 = (cat0.products||[])[0];
  console.log('product keys:', Object.keys(p0));
  console.log('name fields:', p0.name, '|', p0.nameEn, '|', p0.nameJa, '|', p0.nameKo, '|', p0.nameFr, '|', p0.nameAr);
  console.log('summaryJa head:', (p0.summaryJa||'').slice(0,50));
  // find dv2
  const dv2 = (j.data||[]).flatMap(t=>t.categories||[]).flatMap(c=>c.products||[]).find(p=>p.slug==='dv2-diaphragm-valve');
  console.log('dv2 found:', !!dv2, '| name:', dv2&&dv2.name, '| nameJa:', dv2&&dv2.nameJa);
})();
