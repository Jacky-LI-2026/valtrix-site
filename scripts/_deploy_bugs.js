const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const fs = require('fs');
const { execSync } = require('child_process');
const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;
const PGBIN = 'D:/企业网站/_pgsql/extracted/pgsql/bin';
// 1. 更新 seo_config.email 的 SQL（本地+服务器）
const sql = `UPDATE seo_config SET email='sales@valtrix.com', "updatedAt"=NOW() WHERE email='sales@valvetech.com';\n`;
fs.writeFileSync('D:/阀门网站/scripts/_fix_seo.sql', sql, 'utf8');
execSync(`"${PGBIN}/psql.exe" "postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve" -t -f D:/阀门网站/scripts/_fix_seo.sql -o D:/阀门网站/scripts/_fix_seo.out`);
console.log('local seo:', fs.readFileSync('D:/阀门网站/scripts/_fix_seo.out', 'utf8').trim() || 'OK');
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
  // 服务器 DB 更新
  await put(conn, 'D:/阀门网站/scripts/_fix_seo.sql', '/root/_fix_seo.sql');
  const dbCmd = 'cd /var/www/valtrix && DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\') && psql "$DBURL" -f /root/_fix_seo.sql 2>&1 | tail -1';
  console.log('server seo:', await sshExec(conn, dbCmd));
  // 上传 3 个代码文件 + build
  console.log('prep:', await sshExec(conn, 'pkill -9 -f "next build" 2>/dev/null; pkill -9 -f "pnpm build" 2>/dev/null; rm -f /tmp/b7.log; echo ready'));
  await put(conn, 'D:/阀门网站/lib/seo-metadata.ts', '/var/www/valtrix/lib/seo-metadata.ts');
  await put(conn, 'D:/阀门网站/components/layout/Footer.tsx', '/var/www/valtrix/components/layout/Footer.tsx');
  await put(conn, 'D:/阀门网站/app/products/[tab]/[id]/ProductDetailClient.tsx', '/var/www/valtrix/app/products/[tab]/[id]/ProductDetailClient.tsx');
  await put(conn, 'D:/阀门网站/app/services/[slug]/ServiceDetailClient.tsx', '/var/www/valtrix/app/services/[slug]/ServiceDetailClient.tsx');
  const buildSh = `#!/bin/bash
cd /var/www/valtrix
rm -rf .next
pnpm build > /tmp/b7.log 2>&1
echo "BUILD_EXIT=$?" >> /tmp/b7.log
`;
  fs.writeFileSync('D:/阀门网站/scripts/_build_remote.sh', buildSh, 'utf8');
  await put(conn, 'D:/阀门网站/scripts/_build_remote.sh', '/root/_build_remote.sh');
  console.log('launch:', await sshExec(conn, 'setsid bash /root/_build_remote.sh < /dev/null > /dev/null 2>&1 & echo LAUNCHED'));
  let done = false;
  for (let i = 0; i < 120; i++) {
    const t = await sshExec(conn, 'tail -1 /tmp/b7.log 2>/dev/null');
    if (t.includes('BUILD_EXIT')) { done = true; console.log('build done at', i * 20, 's:', t.trim()); break; }
    await sleep(20000);
  }
  if (!done) console.log('TIMEOUT');
  console.log(await sshExec(conn, 'grep -cE "error|Error" /tmp/b7.log; grep BUILD_EXIT /tmp/b7.log'));
  console.log(await sshExec(conn, 'cd /var/www/valtrix && pm2 restart valtrix && sleep 6 && curl -s -o /dev/null -w "home:%{http_code} news:%{http_code}\n" https://www.valvetrix.com/ https://www.valvetrix.com/news'));
  conn.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
