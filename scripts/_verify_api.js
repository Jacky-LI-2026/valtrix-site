const { Client } = require('D:/阀门网站/node_modules/ssh2');
const c = new Client();
c.on('ready', () => {
  const cmd = `
echo "=== PRODUCT TREE ==="
curl -s http://127.0.0.1:3000/api/public/products | node -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
d.data.forEach(t=>{
  console.log('TAB:', t.name, '('+t.nameEn+')');
  t.categories.forEach(c=>{
    console.log('  CAT:', c.name, '('+c.nameEn+') ->', c.models.length, 'products');
    c.models.forEach(m=>console.log('    PROD:', m.name, '|', m.model, '| specs:', m.specs?.length||0, '| img:', m.coverImage?'yes':'no'));
  });
});
"
echo ""
echo "=== IMAGE CHECK ==="
curl -s -o /dev/null -w "face-seal g-series: %{http_code} %{size_download}bytes\n" http://127.0.0.1:3000/uploads/products/xinval/face-seal_metal-face-seal-g-series_1.jpg
curl -s -o /dev/null -w "diaphragm ald: %{http_code} %{size_download}bytes\n" http://127.0.0.1:3000/uploads/products/xinval/diaphragm_atomic-layer-deposition-ald-series_1.jpg
echo ""
echo "=== EN LANGUAGE CHECK (product names should be English) ==="
curl -s "http://127.0.0.1:3000/api/public/products?locale=en" | node -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
let zhCount=0;
d.data.forEach(t=>{
  if(/[\\u4e00-\\u9fff]/.test(t.nameEn||'')) zhCount++;
  t.categories.forEach(c=>{
    if(/[\\u4e00-\\u9fff]/.test(c.nameEn||'')) zhCount++;
    c.models.forEach(m=>{
      if(/[\\u4e00-\\u9fff]/.test(m.nameEn||'')) zhCount++;
    });
  });
});
console.log('Fields with Chinese chars in En:', zhCount);
"
`;
  c.exec(cmd, (e, s) => {
    if (e) { console.log('ERR', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
     .on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 60000);
