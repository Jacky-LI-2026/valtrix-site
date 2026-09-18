const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const fs = require('fs');
const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;
const FILES = [
  ['lib/seo-metadata.ts', 'lib/seo-metadata.ts'],
  ['app/careers/[slug]/page.tsx', 'app/careers/[slug]/page.tsx'],
  ['app/about/[section]/page.tsx', 'app/about/[section]/page.tsx'],
  ['app/news/[slug]/page.tsx', 'app/news/[slug]/page.tsx'],
  ['app/products/[tab]/[id]/page.tsx', 'app/products/[tab]/[id]/page.tsx'],
  ['app/industries/[slug]/page.tsx', 'app/industries/[slug]/page.tsx'],
  ['app/services/[slug]/page.tsx', 'app/services/[slug]/page.tsx'],
];
function sshExec(conn, cmd) {
  return new Promise((res, rej) => {
    conn.exec(cmd, (e, s) => {
      if (e) return rej(e);
      let o = '';
      s.on('data', d => o += d);
      s.stderr.on('data', d => o += 'E:' + d);
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
  for (const [l, r] of FILES) {
    await put(conn, 'D:/阀门网站/' + l, '/var/www/valtrix/' + r);
  }
  console.log('uploaded 7 files');
  // 干净启动：pkill 正则技巧防自伤
  const launch = await sshExec(conn, 'pkill -9 -f "next bui[d]ld" 2>/dev/null; pkill -9 -f "pnpm bui[d]ld" 2>/dev/null; sleep 1; rm -f /tmp/b10.log; rm -rf /var/www/valtrix/.next; setsid bash -c \'cd /var/www/valtrix && pnpm build > /tmp/b10.log 2>&1; echo BUILD_EXIT=$? >> /tmp/b10.log\' < /dev/null > /dev/null 2>&1 & sleep 1; echo LAUNCHED');
  console.log(launch);
  let done = false;
  for (let i = 0; i < 75; i++) {
    const t = await sshExec(conn, 'tail -1 /tmp/b10.log 2>/dev/null');
    if (t.includes('BUILD_EXIT')) { done = true; console.log('DONE at', i * 20, 's:', t.trim()); break; }
    if (i % 9 === 0) console.log('...', i * 20, 's:', t.trim().slice(0, 80));
    await sleep(20000);
  }
  if (!done) console.log('TIMEOUT');
  console.log('TAIL:', await sshExec(conn, 'tail -3 /tmp/b10.log'));
  console.log('VERIFY:', await sshExec(conn, 'cd /var/www/valtrix && pm2 restart valtrix >/dev/null 2>&1 && sleep 8 && echo -n "prod-title: " && curl -s https://www.valvetrix.com/products/diaphragm-valves/dv22a-mr8 | grep -o "<title>[^<]*" | head -1 && echo -n "svc-title: " && curl -s https://www.valvetrix.com/services/custom-manufacturing | grep -o "<title>[^<]*" | head -1 && echo -n "ind-title: " && curl -s https://www.valvetrix.com/industries/semiconductor | grep -o "<title>[^<]*" | head -1'));
  conn.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
