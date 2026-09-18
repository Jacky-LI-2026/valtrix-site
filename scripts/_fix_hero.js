const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const fs = require('fs');
const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;
const buildSh = `#!/bin/bash
cd /var/www/valtrix
pnpm build > /tmp/b4.log 2>&1
echo "BUILD_EXIT=$?" >> /tmp/b4.log
`;
fs.writeFileSync('D:/阀门网站/scripts/_build_remote.sh', buildSh, 'utf8');
function sshExec(conn, cmd) {
  return new Promise((res, rej) => {
    conn.exec(cmd, (e, s) => {
      if (e) return rej(e);
      let o = '';
      s.on('data', d => o += d);
      s.stderr.on('data', d => o += 'ERR:' + d);
      s.on('close', () => res(o));
    });
  });
}
function put(conn, local, remote) {
  return new Promise((res, rej) => conn.sftp((err, sftp) => err ? rej(err) : sftp.fastPut(local, remote, e => e ? rej(e) : res())));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const conn = new ssh2.Client();
  await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', rej); conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 }); });
  console.log('kill:', await sshExec(conn, 'pkill -9 -f "next build" 2>/dev/null; pkill -9 -f "pnpm build" 2>/dev/null; sleep 2; ps aux | grep -E "next build|pnpm build" | grep -v grep | wc -l'));
  await put(conn, 'D:/阀门网站/scripts/_build_remote.sh', '/root/_build_remote.sh');
  console.log('launch:', await sshExec(conn, 'rm -rf /var/www/valtrix/.next && setsid bash /root/_build_remote.sh < /dev/null > /dev/null 2>&1 & echo LAUNCHED'));
  for (let i = 0; i < 100; i++) {
    const t = await sshExec(conn, 'tail -1 /tmp/b4.log 2>/dev/null');
    if (t.includes('BUILD_EXIT')) { console.log('build done at', i * 20, 's:', t.trim()); break; }
    await sleep(20000);
  }
  console.log(await sshExec(conn, 'tail -6 /tmp/b4.log; echo ===; cat /var/www/valtrix/.next/BUILD_ID 2>/dev/null; cd /var/www/valtrix && pm2 restart valtrix && sleep 5 && curl -s -o /dev/null -w "home:%{http_code} products:%{http_code} about:%{http_code}\n" https://www.valvetrix.com/ https://www.valvetrix.com/products https://www.valvetrix.com/about'));
  conn.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
