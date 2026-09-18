/** 等待 build 完成 → restart → 验证 hero 图与透明度 */
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const check = (n) => {
    conn.exec('pgrep -f "next build" >/dev/null && echo BUILDING || echo DONE', (e, s) => {
      let o = '';
      s.on('close', () => {
        const st = o.trim();
        console.log('[' + n + ']', st);
        if (st === 'BUILDING') {
          if (n > 12) { console.log('TIMEOUT'); conn.end(); process.exit(1); }
          setTimeout(() => check(n + 1), 20000);
        } else {
          conn.exec('cd /var/www/valtrix && (ls .next/BUILD_ID >/dev/null 2>&1 && echo BUILD_OK || echo NO_BUILD)', (e2, s2) => {
            let o2 = '';
            s2.on('close', () => {
              console.log(o2.trim());
              conn.exec('pm2 restart valtrix --update-env && sleep 5 && curl -s -o /dev/null -w "home:%{http_code}\\n" https://www.valvetrix.com/ && curl -s https://www.valvetrix.com/api/public/home | head -c 500; echo', (e3, s3) => {
                let o3 = '';
                s3.on('close', () => { console.log(o3.trim()); conn.end(); process.exit(0); })
                  .on('data', d => o3 += d).stderr.on('data', d => o3 += d);
              });
            }).on('data', d => o2 += d).stderr.on('data', d => o2 += d);
          });
        }
      }).on('data', d => o += d).stderr.on('data', d => o += d);
    });
  };
  check(0);
}).on('error', e => { console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', readyTimeout: 30000, keepaliveInterval: 10000 });
