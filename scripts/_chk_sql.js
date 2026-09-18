const { Client } = require('D:/阀门网站/node_modules/ssh2');
const c = new Client();
c.on('ready', () => {
  // First check file encoding on server
  c.exec(`file /tmp/rebuild_products.sql; head -c 100 /tmp/rebuild_products.sql | xxd | head -5; echo "---"; wc -l /tmp/rebuild_products.sql`, (e, s) => {
    if (e) { console.log('ERR1', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => {
      console.log('=== FILE INFO ===');
      console.log(o.trim());
      // Now run SQL with ON_ERROR_STOP and capture first error
      c.exec(`PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -v ON_ERROR_STOP=1 -f /tmp/rebuild_products.sql 2>&1 | head -30`, (e2, s2) => {
        if (e2) { console.log('ERR2', e2.message); c.end(); return; }
        let o2 = '';
        s2.on('close', () => {
          console.log('=== SQL EXECUTION (first 30 lines) ===');
          console.log(o2.trim());
          c.end();
        }).on('data', d => o2 += d).stderr.on('data', d => o2 += d);
      });
    }).on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 120000);
