/** 线上最终验证：默认英文 + isDefault + 内容抽样 */
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
const cmd = [
  "echo '--- 首页 lang 与标题 ---'",
  "curl -s http://127.0.0.1:3000/ | head -c 800 | grep -o '<html[^>]*>' | head -1",
  "curl -s http://127.0.0.1:3000/ | grep -o '<title>[^<]*</title>' | head -1",
  "echo '--- 首页是否含中文 ---'",
  "curl -s http://127.0.0.1:3000/ | grep -cP '[\\x{4e00}-\\x{9fa5}]'",
  "echo '--- languages API ---'",
  "curl -s http://127.0.0.1:3000/api/public/languages",
  "echo '--- DB isDefault ---'",
  "cd /var/www/valtrix && DBURL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '\"' | sed 's/\\?schema=[^&]*//') && psql \"$DBURL\" -t -c \"SELECT code, \\\"isDefault\\\" FROM language ORDER BY id\"",
].join(' && ');
c.on('ready', () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.log('err', e.message); c.end(); return; }
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += 'ERR:' + d);
    s.on('close', () => { console.log(o.slice(-2200)); c.end(); });
  });
}).on('error', e => { console.log('SSH', e.message); process.exit(1); })
.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
