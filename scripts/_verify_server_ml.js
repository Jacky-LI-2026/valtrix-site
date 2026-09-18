/** 服务器验证：多语数据 + language isDefault */
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
const cmd = [
  'cd /var/www/valtrix',
  'DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\')',
  'echo "--- products nameJa 非空数 ---"',
  'psql "$DBURL" -t -c "SELECT count(*) FROM products WHERE \\\"nameJa\\\" IS NOT NULL AND \\\"nameJa\\\"<>\'\'"',
  'echo "--- news titleJa 非空数 ---"',
  'psql "$DBURL" -t -c "SELECT count(*) FROM news WHERE \\\"titleJa\\\" IS NOT NULL AND \\\"titleJa\\\"<>\'\'"',
  'echo "--- language isDefault ---"',
  'psql "$DBURL" -t -c "SELECT code, \"isDefault\" FROM language ORDER BY id"',
].join(' && ');
c.on('ready', () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.log('exec err', e.message); c.end(); return; }
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += 'ERR:' + d);
    s.on('close', () => { console.log(o); c.end(); });
  });
}).on('error', e => { console.log('SSH err', e.message); process.exit(1); })
.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
