/** 补跑 build + pm2 restart + 验证（若已在 build 则等待） */
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('pgrep -f "next build" >/dev/null && echo BUILDING || echo IDLE', (e, s) => {
    let o = '';
    s.on('close', () => {
      const st = o.trim();
      console.log('state:', st);
      if (st === 'BUILDING') {
        console.log('build in progress, will re-check in 30s');
        setTimeout(() => {
          conn.exec('pgrep -f "next build" >/dev/null && echo STILL_BUILDING || echo DONE', (e2, s2) => {
            let o2 = '';
            s2.on('close', () => {
              console.log('state2:', o2.trim());
              if (o2.includes('STILL_BUILDING')) { console.log('still building, wait more'); setTimeout(() => conn.end(), 60000); }
              else runBuild();
            }).on('data', d => o2 += d);
          });
        }, 30000);
      } else runBuild();
    }).on('data', d => o += d).stderr.on('data', d => o += d);
  });
  function runBuild() {
    console.log('starting build...');
    conn.exec('cd /var/www/valtrix && pnpm build 2>&1 | tail -15', (e, s) => {
      let o = '';
      s.on('close', (code) => {
        console.log('build exit', code);
        console.log(o.trim());
        if (code !== 0) { console.log('BUILD_FAIL'); conn.end(); process.exit(1); }
        conn.exec('pm2 restart valtrix --update-env && sleep 4 && curl -s -o /dev/null -w "home:%{http_code}\\n" https://www.valvetrix.com/ && curl -s -o /dev/null -w "products:%{http_code}\\n" https://www.valvetrix.com/products && curl -s https://www.valvetrix.com/api/public/home | head -c 300', (e2, s2) => {
          let o2 = '';
          s2.on('close', (c2) => { console.log(o2.trim()); conn.end(); process.exit(0); })
            .on('data', d => o2 += d).stderr.on('data', d => o2 += d);
        });
      }).on('data', d => o += d).stderr.on('data', d => o += d);
    });
  }
}).on('error', e => { console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', readyTimeout: 30000, keepaliveInterval: 10000 });
