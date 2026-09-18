const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
const LOG = '/tmp/b_culture2.log';
let tries = 0;
conn.on('ready', () => {
  const poll = () => {
    tries++;
    conn.exec(`grep -c "BUILD_EXIT" ${LOG} 2>/dev/null; tail -1 ${LOG} 2>/dev/null`, (e, st) => {
      let o = '';
      st.on('close', () => {
        const lines = o.trim().split('\n');
        const cnt = parseInt(lines[0] || '0', 10);
        if (cnt > 0) {
          conn.exec(`grep "BUILD_EXIT" ${LOG}; pm2 restart valtrix --update-env >/dev/null 2>&1 && sleep 3 && pm2 pid valtrix && curl -s -o /dev/null -w "HTTP=%{http_code}\\n" http://127.0.0.1:3000/about/culture`, (e2, st2) => {
            let o2 = '';
            st2.on('close', () => { console.log('DONE:', o2.trim()); conn.end(); })
              .on('data', d => o2 += d).stderr.on('data', d => o2 += d);
          });
        } else if (tries > 60) { console.log('TIMEOUT', o); conn.end(); }
        else { console.log(`[${tries}] building...`); setTimeout(poll, 20000); }
      }).on('data', d => o += d).stderr.on('data', d => o += d);
      if (e) { console.log('ERR', e.message); conn.end(); }
    });
  };
  poll();
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
