const { Client } = require('D:/阀门网站/node_modules/ssh2');
const fs = require('fs');
const conn = new Client();
const SRC = 'D:/阀门网站/app/about/[section]/AboutSectionClient.tsx';
const REMOTE_DIR = '/var/www/valtrix/app/about/[section]/';
const LOG = '/tmp/b_culture.log';
conn.on('ready', () => {
  conn.exec(`mkdir -p "${REMOTE_DIR}"`, (err, st) => {
    if (err) { console.log('ERR mkdir', err.message); conn.end(); return; }
    st.on('close', () => {
      conn.sftp((err, sftp) => {
        if (err) { console.log('ERR sftp', err.message); conn.end(); return; }
        sftp.fastPut(SRC, REMOTE_DIR + 'AboutSectionClient.tsx', (err2) => {
          if (err2) { console.log('ERR put', err2.message); conn.end(); return; }
          console.log('PUT OK');
          const build = `pkill -9 -f "next bui[d]ld"; pkill -9 -f "pnpm bui[d]ld"; sleep 1; rm -rf /var/www/valtrix/.next; setsid bash -c 'cd /var/www/valtrix && pnpm build > ${LOG} 2>&1; echo BUILD_EXIT=$? >> ${LOG}' < /dev/null > /dev/null 2>&1 &`;
          conn.exec(build, (err3, st3) => {
            if (err3) { console.log('ERR build launch', err3.message); conn.end(); return; }
            st3.on('close', () => { console.log('BUILD LAUNCHED'); conn.end(); })
              .on('data', () => {}).stderr.on('data', () => {});
          });
        });
      });
    }).stderr.on('data', d => console.log('ERR:', d.toString()));
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
