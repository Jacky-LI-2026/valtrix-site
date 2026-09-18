/** 轮询等待服务器 build 完成 → pm2 restart → 验证 */
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const S = { host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 };
function ssh(cmd, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const c = new ssh2.Client();
    let done = false;
    const timer = setTimeout(() => { if (!done) { try { c.end(); } catch (e) {} resolve('TIMEOUT'); } }, timeoutMs);
    c.on('ready', () => {
      c.exec(cmd, (e, s) => {
        if (e) { clearTimeout(timer); done = true; try { c.end(); } catch (x) {} resolve('ERR:' + e.message); return; }
        let o = '';
        s.on('data', d => o += d);
        s.stderr.on('data', d => o += 'ERR:' + d);
        s.on('close', () => { clearTimeout(timer); done = true; try { c.end(); } catch (x) {} resolve(o); });
      });
    });
    c.on('error', (e) => { clearTimeout(timer); done = true; resolve('SSHERR:' + e.message); });
    c.connect(S);
  });
}
(async () => {
  // 等待 build 结束（最多 8 分钟）
  for (let i = 0; i < 48; i++) {
    const r = await ssh("ps aux | grep -E 'next build' | grep -v grep | wc -l");
    const n = parseInt(r.trim() || '0', 10);
    if (n === 0) { console.log('build 结束'); break; }
    if (i % 6 === 0) console.log('等待 build...', i * 10 + 's');
    await new Promise(res => setTimeout(res, 10000));
  }
  // 确认 BUILD_ID
  const bid = await ssh('cat /var/www/valtrix/.next/BUILD_ID 2>/dev/null || echo NOBUILD');
  console.log('BUILD_ID:', bid.trim());
  if (bid.trim() === 'NOBUILD') { console.log('build 未完成，退出'); process.exit(1); }
  // restart
  const r = await ssh('pm2 restart valtrix 2>&1 | tail -2');
  console.log('restart:', r.trim().slice(-200));
  await new Promise(res => setTimeout(res, 8000));
  // 验证
  const h = await ssh("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/");
  console.log('首页 HTTP:', h);
  const html = await ssh("curl -s http://127.0.0.1:3000/ | grep -o '<html[^>]*lang=\"[a-z]*\"' | head -1");
  console.log('首页 lang:', html.trim());
})();
