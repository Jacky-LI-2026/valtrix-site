const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.sftp((e, sftp) => {
    if (e) { console.log('ERR', e.message); conn.end(); return; }
    sftp.fastPut('D:/阀门网站/app/contact/page.tsx', '/var/www/valtrix/app/contact/page.tsx', (e2) => {
      if (e2) { console.log('ERR2', e2.message); conn.end(); return; }
      console.log('PUT OK');
      const b = `pkill -9 -f "next bui[d]ld" 2>/dev/null; pkill -9 -f "pnpm bui[d]ld" 2>/dev/null; sleep 1; rm -f /tmp/b_contact.log; nohup bash -c 'cd /var/www/valtrix && pnpm build > /tmp/b_contact.log 2>&1; echo BUILD_EXIT=$? >> /tmp/b_contact.log' >/dev/null 2>&1 &`;
      conn.exec(b, (e3, st) => {
        if (e3) { console.log('ERR3', e3.message); conn.end(); return; }
        st.on('close', () => { console.log('BUILD LAUNCHED /tmp/b_contact.log'); conn.end(); }).on('data', () => {}).stderr.on('data', () => {});
      });
    });
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
