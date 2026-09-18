/** 检查服务器build状态并完成 restart + 验证 */
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
const cmd = [
  "echo '--- build 进程 ---'",
  "ps aux | grep -E 'pnpm build|next build' | grep -v grep | head -3",
  "echo '--- .next 时间 ---'",
  "ls -ld /var/www/valtrix/.next 2>/dev/null; ls -lt /var/www/valtrix/.next/BUILD_ID 2>/dev/null | head -1",
  "echo '--- BUILD_ID 内容 ---'",
  "cat /var/www/valtrix/.next/BUILD_ID 2>/dev/null",
].join(' && ');
c.on('ready', () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.log('err', e.message); c.end(); return; }
    let o = '';
    s.on('data', d => o += d);
    s.on('close', () => { console.log(o); c.end(); });
  });
}).on('error', e => { console.log('SSH', e.message); process.exit(1); })
.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
