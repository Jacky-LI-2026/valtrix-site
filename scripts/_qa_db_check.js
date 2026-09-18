/** QA 审计 · 只读 DB 检查（language 表 + 动态内容类型注册） */
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
const cmd = [
  "DBURL=$(grep -E '^DATABASE_URL=' /var/www/valtrix/.env | head -1 | sed 's/^DATABASE_URL=//; s/^\"//; s/\"$//; s/?schema=[^&]*//')",
  "echo '--- language table ---'",
  "psql \"$DBURL\" -c 'SELECT code, \"isActive\", \"isDefault\", \"sortOrder\" FROM language ORDER BY \"sortOrder\";' 2>&1 | head -20",
  "echo '--- content type defs ---'",
  "psql \"$DBURL\" -c 'SELECT name, active FROM content_type_defs ORDER BY id;' 2>&1 | head -20",
  "echo '--- tables like content ---'",
  "psql \"$DBURL\" -c \"SELECT tablename FROM pg_tables WHERE tablename LIKE '%content%' OR tablename LIKE '%type%' LIMIT 20;\" 2>&1 | head -25",
].join('; ');
c.on('ready', () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.log('err', e.message); c.end(); return; }
    let o = '';
    s.on('data', d => o += d);
    s.on('close', () => { console.log(o); c.end(); });
  });
}).on('error', e => { console.log('SSH', e.message); process.exit(1); })
.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
