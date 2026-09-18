const http = require('http');
function get(p) { return new Promise(r => { http.get({ host: '127.0.0.1', port: 3000, path: p }, x => { let d=''; x.on('data',c=>d+=c); x.on('end',()=>r(d)); }).on('error', e => r('ERR '+e.message)); }); }
(async () => {
  const list = await get('/api/public/products');
  const j = JSON.parse(list);
  const cats = (j.data||[]).flatMap(t=>t.categories||[]);
  const models = cats.flatMap(c=>c.models||[]);
  console.log('total models:', models.length);
  const m0 = models[0];
  console.log('model keys:', Object.keys(m0));
  const dv2 = models.find(m => m.slug === 'dv2-diaphragm-valve');
  console.log('dv2:', JSON.stringify({ slug: dv2&&dv2.slug, name: dv2&&dv2.name, nameEn: dv2&&dv2.nameEn, nameJa: dv2&&dv2.nameJa, nameKo: dv2&&dv2.nameKo, nameFr: dv2&&dv2.nameFr, nameAr: dv2&&dv2.nameAr }));
  const bv1 = models.find(m => m.slug === 'bv1-ball-valve');
  console.log('bv1:', JSON.stringify({ name: bv1&&bv1.name, nameJa: bv1&&bv1.nameJa }));
  // count models missing any lang
  let miss = 0;
  models.forEach(m => ['nameJa','nameKo','nameFr','nameAr'].forEach(k => { if (!m[k]) miss++; }));
  console.log('models missing ja/ko/fr/ar cells:', miss);
})();
