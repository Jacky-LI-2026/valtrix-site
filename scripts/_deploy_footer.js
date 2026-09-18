const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const fs = require('fs');
const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;
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
  console.log('cur footer:', (await sshExec(conn, 'grep -c "577-8888-8888" /var/www/valtrix/components/layout/Footer.tsx; grep -o "tel:+86[0-9]*" /var/www/valtrix/components/layout/Footer.tsx | head -2')).trim());
  await put(conn, 'D:/阀门网站/components/layout/Footer.tsx', '/var/www/valtrix/components/layout/Footer.tsx');
  console.log('uploaded; grep:', (await sshExec(conn, 'grep -o "tel:+86[0-9]*" /var/www/valtrix/components/layout/Footer.tsx | head -2')).trim());
  console.log(await sshExec(conn, 'rm -f /tmp/b8.log; setsid bash /root/_build_remote.sh < /dev/null > /dev/null 2>&1 & echo LAUNCHED'));
  // 用脚本内改为 b8
  const sh = `#!/bin/bash
cd /var/www/valtrix
rm -rf .next
pnpm build > /tmp/b8.log 2>&1
echo "BUILD_EXIT=$?" >> /tmp/b8.log
`;
  fs.writeFileSync('D:/阀门网站/scripts/_build_remote.sh', sh, 'utf8');
  await put(conn, 'D:/阀门网站/scripts/_build_remote.sh', '/root/_build_remote.sh');
  await sshExec(conn, 'pkill -9 -f "next build" 2>/dev/null; pkill -9 -f "pnpm build" 2>/dev/null; sleep 1; setsid bash /root/_build_remote.sh < /dev/null > /dev/null 2>&1 & echo LAUNCHED');
  let done = false;
  for (let i = 0; i < 120; i++) {
    const t = await sshExec(conn, 'tail -1 /tmp/b8.log 2>/dev/null');
    if (t.includes('BUILD_EXIT')) { done = true; console.log('build done at', i * 20, 's:', t.trim()); break; }
    await sleep(20000);
  }
  if (!done) console.log('TIMEOUT');
  console.log(await sshExec(conn, 'grep BUILD_EXIT /tmp/b8.log; grep -c "error" /tmp/b8.log'));
  console.log(await sshExec(conn, 'cd /var/www/valtrix && pm2 restart valtrix >/dev/null 2>&1 && sleep 8 && curl -s https://www.valvetrix.com/ | grep -o "tel:+86[0-9]*" | head -2'));
  conn.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
