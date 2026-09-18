const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('tail -3 /tmp/b_culture.log 2>/dev/null; echo ---; grep -c "BUILD_EXIT" /tmp/b_culture.log 2>/dev/null; pm2 pid valtrix 2>/dev/null; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/about/culture', (err, stream) => {
    if (err) { console.log('ERR', err.message); conn.end(); return; }
    let out = '';
    stream.on('close', () => { console.log(out.slice(0, 800)); conn.end(); })
      .on('data', d => out += d.toString())
      .stderr.on('data', d => out += d.toString());
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
