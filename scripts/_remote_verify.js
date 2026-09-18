// Verify public API returns corrected multilang product detail (run on server)
const http = require('http');
function get(path) {
  return new Promise((res) => {
    http.get({ host: '127.0.0.1', port: 3000, path, headers: { 'accept-language': 'en' } }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', e => res('ERR ' + e.message));
  });
}
(async () => {
  // list products, find dv2 slug detail
  const list = await get('/api/public/products');
  const j = JSON.parse(list);
  const prods = (j.data || []).flatMap(t => (t.categories || []).flatMap(c => (c.products || []).map(p => ({ slug: p.slug, name: p.name, nameEn: p.nameEn }))));
  const dv2 = prods.find(p => p.slug === 'dv2-diaphragm-valve');
  const bv1 = prods.find(p => p.slug === 'bv1-ball-valve');
  const bsm = prods.find(p => p.slug === 'bsm-metering-valve');
  console.log('LIST total products:', prods.length);
  console.log('dv2:', JSON.stringify(dv2));
  console.log('bv1:', JSON.stringify(bv1));
  console.log('bsm:', JSON.stringify(bsm));
  // detail page for dv2
  const det = await get('/api/public/products/dv2-diaphragm-valve');
  try {
    const dj = JSON.parse(det);
    const p = dj.data || dj;
    console.log('DETAIL dv2 name:', p.name, '| nameEn:', p.nameEn, '| nameJa:', p.nameJa);
    console.log('DETAIL dv2 specs count:', (p.specs || []).length, '| first label:', p.specs && p.specs[0] && p.specs[0].label, '| labelJa:', p.specs && p.specs[0] && p.specs[0].labelJa);
  } catch (e) { console.log('detail raw head:', det.slice(0, 200)); }
})();
