const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
const SRC = 'D:/阀门网站/app/about/[section]/AboutSectionClient.tsx';
const REMOTE = '/var/www/valtrix/app/about/[section]/AboutSectionClient.tsx';
const LOG = '/tmp/b_culture2.log';
let step = 0;
conn.on('ready', () => {
  // 1. 确认服务器源文件状态
  conn.exec(`grep -c "heading\${sfx}" "${REMOTE}" 2>/dev/null || echo NOT_PATCHED; md5sum "${REMOTE}" 2>/dev/null | cut -d' ' -f1`, (e, st) => {
    let o = '';
    st.on('close', () => { console.log('SRC_CHECK:', o.trim()); doPut(); }).on('data', d => o += d).stderr.on('data', d => o += d);
    if (e) { console.log('ERR', e.message); conn.end(); }
  });
  function doPut() {
    conn.sftp((err, sftp) => {
      if (err) { console.log('ERR sftp', err.message); conn.end(); return; }
      sftp.fastPut(SRC, REMOTE, (err2) => {
        if (err2) { console.log('ERR put', err2.message); conn.end(); return; }
        console.log('PUT OK');
        const build = `pkill -9 -f "next bui[d]ld" 2>/dev/null; pkill -9 -f "pnpm bui[d]ld" 2>/dev/null; sleep 1; rm -f ${LOG}; nohup bash -c 'cd /var/www/valtrix && pnpm build > ${LOG} 2>&1; echo BUILD_EXIT=$? >> ${LOG}' >/dev/null 2>&1 &`;
        conn.exec(build, (e3, st3) => {
          if (e3) { console.log('ERR launch', e3.message); conn.end(); return; }
          st3.on('close', () => { console.log('BUILD LAUNCHED, log=' + LOG); conn.end(); }).on('data', () => {}).stderr.on('data', () => {});
        });
      });
    });
  }
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
