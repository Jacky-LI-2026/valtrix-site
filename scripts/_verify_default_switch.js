/** 验证后台切默认语种立即生效：en→zh→en */
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
const cmd = [
  "cd /var/www/valtrix",
  "DBURL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '\"' | sed 's/\\?schema=[^&]*//')",
  "echo '--- 改默认=zh ---'",
  "psql \"$DBURL\" -c \"UPDATE language SET \\\"isDefault\\\"=false; UPDATE language SET \\\"isDefault\\\"=true WHERE code='zh';\"",
  "curl -s http://127.0.0.1:3000/ | grep -o '<html lang=\"[^\"]*\"' | head -1",
  "echo '--- 改回默认=en ---'",
  "psql \"$DBURL\" -c \"UPDATE language SET \\\"isDefault\\\"=false; UPDATE language SET \\\"isDefault\\\"=true WHERE code='en';\"",
  "curl -s http://127.0.0.1:3000/ | grep -o '<html lang=\"[^\"]*\"' | head -1",
  "curl -s http://127.0.0.1:3000/api/public/languages | grep -o '\\\"code\\\":\\\"en\\\".\\{0,40\\}' | head -1",
].join(' && ');
c.on('ready', () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.log('err', e.message); c.end(); return; }
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += 'ERR:' + d);
    s.on('close', () => { console.log(o.slice(-700)); c.end(); });
  });
}).on('error', e => { console.log('SSH', e.message); process.exit(1); })
.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
