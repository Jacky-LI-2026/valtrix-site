const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('pm2 restart valtrix --update-env >/dev/null 2>&1 && sleep 4 && pm2 pid valtrix && curl -s -o /dev/null -w "HTTP=%{http_code}\n" http://127.0.0.1:3000/contact', (e, st) => {
    let o = '';
    st.on('close', () => { console.log(o.trim()); conn.end(); }).on('data', d => o += d).stderr.on('data', d => o += d);
    if (e) { console.log('ERR', e.message); conn.end(); }
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
