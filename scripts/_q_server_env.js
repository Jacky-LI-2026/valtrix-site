const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /var/www/valtrix/.env | grep DATABASE_URL; echo ---; cat /var/www/valtrix/.env | grep -E "POSTGRES|PG" | head -5', (err, stream) => {
    if (err) { console.log('ERR', err.message); conn.end(); return; }
    let out = '';
    stream.on('close', () => { console.log(out.slice(0, 1500)); conn.end(); })
      .on('data', d => out += d.toString())
      .stderr.on('data', d => out += d.toString());
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
