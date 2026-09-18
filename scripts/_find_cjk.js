/** 定位首页中文片段 */
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
const cmd = "curl -s http://127.0.0.1:3000/ | grep -oP '.{40}[\\x{4e00}-\\x{9fa5}]+.{40}' | head -5";
c.on('ready', () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.log('err', e.message); c.end(); return; }
    let o = '';
    s.on('data', d => o += d);
    s.on('close', () => { console.log(o || '(未找到中文)'); c.end(); });
  });
}).on('error', e => { console.log('SSH', e.message); process.exit(1); })
.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
