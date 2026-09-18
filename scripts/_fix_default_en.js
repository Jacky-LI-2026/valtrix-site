/** 修复默认英文：服务器 isDefault=en + 部署 layout.tsx + build + restart + 验证 */
const fs = require('fs');
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const S = { host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 };
const DEST = '/var/www/valtrix';

function put(c, local, remote) {
  return new Promise((res, rej) => {
    c.sftp((e, sftp) => {
      if (e) return rej(e);
      const r = sftp.createWriteStream(remote);
      fs.createReadStream(local).pipe(r);
      r.on('close', () => res());
      r.on('error', rej);
    });
  });
}
function ssh(cmd, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const c = new ssh2.Client();
    let done = false;
    const t = setTimeout(() => { if (!done) { try { c.end(); } catch (e) {} resolve('TIMEOUT'); } }, timeoutMs);
    c.on('ready', () => {
      c.exec(cmd, (e, s) => {
        if (e) { clearTimeout(t); done = true; try { c.end(); } catch (x) {} resolve('ERR:' + e.message); return; }
        let o = '';
        s.on('data', d => o += d);
        s.stderr.on('data', d => o += 'ERR:' + d);
        s.on('close', () => { clearTimeout(t); done = true; try { c.end(); } catch (x) {} resolve(o); });
      });
    });
    c.on('error', (e) => { clearTimeout(t); done = true; resolve('SSHERR:' + e.message); });
    c.connect(S);
  });
}
(async () => {
  // 1. 服务器 language isDefault=en
  const u = await ssh("cd /var/www/valtrix && DBURL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '\"' | sed 's/\\?schema=[^&]*//') && psql \"$DBURL\" -c \"UPDATE language SET \\\"isDefault\\\"=false WHERE \\\"isDefault\\\"=true; UPDATE language SET \\\"isDefault\\\"=true WHERE code='en';\"");
  console.log('isDefault 更新:', u.trim().slice(-120));
  // 2. 上传 layout.tsx
  const conn = new ssh2.Client();
  await new Promise((res, rej) => {
    conn.on('ready', async () => {
      try {
        await put(conn, 'D:/阀门网站/app/layout.tsx', DEST + '/app/layout.tsx');
        console.log('layout.tsx 已上传');
        res();
      } catch (e) { rej(e); }
      finally { conn.end(); }
    });
    conn.on('error', rej);
    conn.connect(S);
  });
  // 3. build
  console.log('开始 build（后台，SSH 不断连轮询）...');
  await ssh('cd /var/www/valtrix && nohup pnpm build > /tmp/valtrix_build.log 2>&1 & echo STARTED', 30000);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 15000));
    const st = await ssh('ps aux | grep -E "next build" | grep -v grep | wc -l', 30000);
    if (parseInt(st.trim() || '0', 10) === 0) { console.log('build 结束（' + ((i + 1) * 15) + 's）'); break; }
    if (i > 0 && i % 4 === 0) console.log('build 中...' + (i * 15) + 's');
  }
  const log = await ssh('tail -6 /tmp/valtrix_build.log', 30000);
  console.log('build 日志尾部:', log.slice(-800));
  const bid = await ssh('cat /var/www/valtrix/.next/BUILD_ID 2>/dev/null || echo NOBUILD', 30000);
  console.log('BUILD_ID:', bid.trim());
  if (bid.trim() === 'NOBUILD') { console.log('build 未完成'); process.exit(1); }
  // 4. restart + 验证
  await ssh('pm2 restart valtrix 2>&1 | tail -1', 30000);
  await new Promise(r => setTimeout(r, 8000));
  const h = await ssh("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/", 30000);
  console.log('首页 HTTP:', h);
  const html = await ssh("curl -s http://127.0.0.1:3000/ | grep -o '<html lang=\"[^\"]*\"' | head -1", 30000);
  console.log('首页 lang:', html.trim());
  const cjk = await ssh("curl -s http://127.0.0.1:3000/ | grep -cP '[\\x{4e00}-\\x{9fa5}]'", 30000);
  console.log('首页含中文字符行数:', cjk.trim());
  const api = await ssh("curl -s http://127.0.0.1:3000/api/public/languages | head -c 300", 30000);
  console.log('languages API:', api.trim());
})();
