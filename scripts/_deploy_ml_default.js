/** 部署 AiChatWidget 英文 aria-label + build + 最终验证 */
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
      r.on('close', () => res()); r.on('error', rej);
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
  // 上传
  const conn = new ssh2.Client();
  await new Promise((res, rej) => {
    conn.on('ready', async () => {
      try {
        await put(conn, 'D:/阀门网站/app/layout.tsx', DEST + '/app/layout.tsx');
        await put(conn, 'D:/阀门网站/lib/i18n.tsx', DEST + '/lib/i18n.tsx');
        console.log('layout.tsx + i18n.tsx 已上传');
        res();
      }
      catch (e) { rej(e); } finally { conn.end(); }
    });
    conn.on('error', rej); conn.connect(S);
  });
  // build
  console.log('开始 build...');
  await ssh('cd /var/www/valtrix && nohup pnpm build > /tmp/valtrix_build.log 2>&1 & echo STARTED', 30000);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 15000));
    const st = await ssh('ps aux | grep -E "next build" | grep -v grep | wc -l', 30000);
    if (parseInt(st.trim() || '0', 10) === 0) { console.log('build 结束（' + ((i + 1) * 15) + 's）'); break; }
    if (i > 0 && i % 4 === 0) console.log('build 中...' + (i * 15) + 's');
  }
  const bid = await ssh('cat /var/www/valtrix/.next/BUILD_ID 2>/dev/null || echo NOBUILD', 30000);
  console.log('BUILD_ID:', bid.trim());
  await ssh('pm2 restart valtrix 2>&1 | tail -1', 30000);
  await new Promise(r => setTimeout(r, 8000));
  // 最终验证
  const h = await ssh("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/", 30000);
  const html = await ssh("curl -s http://127.0.0.1:3000/ | grep -o '<html lang=\"[^\"]*\"' | head -1", 30000);
  const cjk = await ssh("curl -s http://127.0.0.1:3000/ | grep -cP '[\\x{4e00}-\\x{9fa5}]'", 30000);
  const ai = await ssh("curl -s http://127.0.0.1:3000/ | grep -o 'AI Assistant\\|AI 客服' | head -1", 30000);
  const api = await ssh("curl -s http://127.0.0.1:3000/api/public/languages | grep -o '\"code\":\"en\".\\{0,80\\}' | head -1", 30000);
  console.log('首页 HTTP:', h.trim());
  console.log('首页 lang:', html.trim());
  console.log('首页中文字符行数:', cjk.trim());
  console.log('AI客服按钮:', ai.trim() || '(未找到)');
  console.log('languages API en:', api.trim());
})();
