const { Client } = require('D:/阀门网站/node_modules/ssh2');
const c = new Client();
c.on('ready', () => {
  // Run SQL fully, then check counts
  const cmd = `PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -v ON_ERROR_STOP=1 -f /tmp/rebuild_products.sql > /tmp/sql_out.txt 2>&1; echo "EXIT=$?"; tail -30 /tmp/sql_out.txt; echo "=== COUNTS ==="; PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -t -c "SELECT 'tabs', count(*) FROM product_tabs; SELECT 'cats', count(*) FROM product_categories; SELECT 'prods', count(*) FROM products; SELECT 'specs', count(*) FROM product_specs;"`;
  c.exec(cmd, (e, s) => {
    if (e) { console.log('ERR', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
     .on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 180000);
