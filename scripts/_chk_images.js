const { Client } = require('D:/阀门网站/node_modules/ssh2');
const c = new Client();
c.on('ready', () => {
  const cmd = `
echo "=== IMAGES ON SERVER ==="
ls -la /var/www/valtrix/public/uploads/products/xinval/ | head -20
echo ""
echo "=== COVER IMAGE PATHS IN DB (first 10) ==="
PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -t -c "SELECT id, name, \"coverImage\" FROM products WHERE \"coverImage\" IS NOT NULL ORDER BY id LIMIT 10;"
echo ""
echo "=== PRODUCTS WITH NO COVER IMAGE ==="
PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -t -c "SELECT id, name FROM products WHERE \"coverImage\" IS NULL ORDER BY id;"
`;
  c.exec(cmd, (e, s) => {
    if (e) { console.log('ERR', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
     .on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 30000);
