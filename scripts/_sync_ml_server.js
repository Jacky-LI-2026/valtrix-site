/** 同步多语数据到服务器：导出8表 → 上传 → psql 导入 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ssh2 = require('D:/阀门网站/node_modules/ssh2');

const PGBIN = 'D:/企业网站/_pgsql/extracted/pgsql/bin';
const LDB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const S = { host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 };
const TABLES = ['products', 'industries', 'news', 'services', 'resource_items', 'about_sections', 'menu', 'home_config'];
const LDMP = 'D:/企业网站/_ml_server_dump.sql';

// 1. 导出
const tArgs = TABLES.map(t => `-t ${t}`).join(' ');
execSync(`"${PGBIN}/pg_dump.exe" "${LDB}" ${tArgs} --data-only --column-inserts -f "${LDMP}"`, { encoding: 'utf8', maxBuffer: 300 * 1024 * 1024 });
let sql = fs.readFileSync(LDMP, 'utf8');
// 清理 PG17 专属行
sql = sql.split('\n').filter(l => !/\\restrict|transaction_timeout|^SET |^SELECT pg_catalog\.set_config/.test(l.trim())).join('\n');
fs.writeFileSync(LDMP, sql, 'utf8');
console.log('导出完成, 行数:', sql.split('\n').length);

// 2. SSH 上传 + 导入
const conn = new ssh2.Client();
conn.on('ready', () => {
  conn.exec(`mkdir -p /root/deploy_tmp && cat > /root/deploy_tmp/ml_dump.sql`, (err, stream) => {
    if (err) throw err;
    let errs = '';
    stream.on('close', (code) => {
      if (code !== 0) { console.error('上传失败', errs); conn.end(); return; }
      // TRUNCATE + 导入
      conn.exec(`cd /var/www/valtrix && DBURL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' | sed 's/\\?schema=[^&]*//') && psql "$DBURL" -c "TRUNCATE ${TABLES.join(',')} CASCADE;" && psql "$DBURL" -f /root/deploy_tmp/ml_dump.sql && echo IMPORT_OK`, (err2, s2) => {
        if (err2) throw err2;
        let out = '', e2 = '';
        s2.on('data', d => out += d);
        s2.stderr.on('data', d => e2 += d);
        s2.on('close', (c2) => {
          console.log('导入输出尾部:', out.slice(-600));
          if (e2) console.log('stderr尾部:', e2.slice(-600));
          console.log('exit:', c2);
          conn.end();
        });
      });
    });
    stream.stderr.on('data', d => errs += d);
    stream.end(fs.readFileSync(LDMP));
  });
});
conn.on('error', e => { console.error('SSH错误:', e.message); process.exit(1); });
conn.connect(S);
