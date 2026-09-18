const { Client } = require('D:/阀门网站/node_modules/ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec(`curl -s http://127.0.0.1:3000/api/public/products/metal-face-seal-g-series | python3 -c "import sys,json; d=json.load(sys.stdin); p=d.get('data',{}); print('name:', p.get('name')); print('specs count:', len(p.get('productSpecs', p.get('specs', [])))); print('first 3 specs:', json.dumps((p.get('productSpecs') or p.get('specs') or [])[:3], ensure_ascii=False))"`, (e, s) => {
    if (e) { console.log('ERR', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
     .on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 20000);
