const { Client } = require('D:/阀门网站/node_modules/ssh2');
const crypto = require('crypto');
const fs = require('fs');
const c = new Client();

const localMd5 = crypto.createHash('md5').update(fs.readFileSync('D:/阀门网站/data/xinval-scrape/rebuild_products.sql')).digest('hex');
console.log('Local MD5:', localMd5);

c.on('ready', () => {
  c.exec(`md5sum /tmp/rebuild_products.sql; echo "---"; file /tmp/rebuild_products.sql; echo "---"; PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -t -c "SHOW client_encoding; SHOW server_encoding;"`, (e, s) => {
    if (e) { console.log('ERR', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
     .on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 30000);
