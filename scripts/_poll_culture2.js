const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('ls -la /tmp/b_culture.log 2>/dev/null; echo ===; tail -5 /tmp/b_culture.log; echo ===; ps aux | grep -E "next build|pnpm build" | grep -v grep | head -3', (err, st) => {
    if (err) { console.log('ERR', err.message); conn.end(); return; }
    let out = '';
    st.on('close', () => { console.log(out.trim().slice(0, 2500)); conn.end(); })
      .on('data', d => out += d.toString())
      .stderr.on('data', d => out += d.toString());
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
