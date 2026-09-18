const { Client } = require('D:/阀门网站/node_modules/ssh2');
const c = new Client();
c.on('ready', () => {
  // Check locale, then try running with explicit encoding
  const cmd = `locale 2>&1 | head -5; echo "=== TRY WITH EXPLICIT ENCODING ==="; export LC_ALL=C.UTF-8; export LANG=C.UTF-8; PGPASSWORD='__REMOVED_DEAD_PASSWORD__' PGCLIENTENCODING=UTF8 psql -U postgres -h localhost -d zuowen_valve -v ON_ERROR_STOP=1 -c "SET client_encoding = 'UTF8';" -f /tmp/rebuild_products.sql > /tmp/sql_out2.txt 2>&1; echo "EXIT=$?"; tail -20 /tmp/sql_out2.txt`;
  c.exec(cmd, (e, s) => {
    if (e) { console.log('ERR', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
     .on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 180000);
