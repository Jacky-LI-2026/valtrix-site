/** 同步导航/插件更新到服务器 + restart + 验证 */
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.error(err.message); return fail(); }
    sftp.fastPut('D:/企业网站/_update_valtrix_nav.sql', '/tmp/_update_nav.sql', (e1) => {
      if (e1) { console.error('upload err', e1.message); return fail(); }
      console.log('sql uploaded');
      conn.exec('PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -f /tmp/_update_nav.sql', (e2, s) => {
        let o = '';
        s.on('close', (code) => {
          console.log('psql exit', code);
          console.log(o.trim());
          if (code !== 0) return fail();
          conn.exec('pm2 restart valtrix --update-env && sleep 4 && echo ---MENUS--- && curl -s "https://www.valvetrix.com/api/public/menus?locale=en" | head -c 800 && echo && echo ---PLUGINS--- && curl -s https://www.valvetrix.com/api/public/plugins | head -c 400', (e3, s2) => {
            let o2 = '';
            s2.on('close', (c2) => { console.log(o2.trim()); conn.end(); process.exit(0); })
              .on('data', d => o2 += d).stderr.on('data', d => o2 += d);
          });
        }).on('data', d => o += d).stderr.on('data', d => o += d);
      });
    });
  });
  function fail() { conn.end(); process.exit(1); }
}).on('error', e => { console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', readyTimeout: 30000, keepaliveInterval: 10000 });
