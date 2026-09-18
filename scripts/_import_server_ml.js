/** 服务器端直接执行多语数据导入（dump 已上传 /root/deploy_tmp/ml_dump.sql） */
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
const cmd = [
  "cd /var/www/valtrix",
  "DBURL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '\"' | sed 's/\\?schema=[^&]*//')",
  "echo '--- TRUNCATE ---'",
  "psql \"$DBURL\" -v ON_ERROR_STOP=1 -c \"TRUNCATE products,industries,news,services,resource_items,about_sections,menu,home_config CASCADE\"",
  "echo '--- IMPORT ---'",
  "psql \"$DBURL\" -v ON_ERROR_STOP=1 -f /root/deploy_tmp/ml_dump.sql",
  "echo '--- VERIFY ---'",
  "psql \"$DBURL\" -t -c \"SELECT count(*) FROM products WHERE \\\"nameJa\\\" IS NOT NULL AND \\\"nameJa\\\"<>''\"",
  "psql \"$DBURL\" -t -c \"SELECT code, \\\"isDefault\\\" FROM language ORDER BY id\"",
].join(' && ');
c.on('ready', () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.log('err', e.message); c.end(); return; }
    let o = '';
    s.on('data', d => o += d);
    s.on('close', () => { console.log(o.slice(-1500)); c.end(); });
  });
}).on('error', e => { console.log('SSH', e.message); process.exit(1); })
.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
