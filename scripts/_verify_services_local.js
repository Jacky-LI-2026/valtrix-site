// 本地完整验证 services 全语种字段（-f 文件方式避免 cmd 引号问题）
const { execSync } = require('child_process');
const fs = require('fs');
const psql = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const conn = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const sqlFile = 'D:/阀门网站/scripts/_verify_services.sql';
const sql = `SELECT id, title, "titleEn", "titleJa", "titleKo", "titleFr", "titleAr",
"subtitleEn", "descriptionEn" IS NOT NULL AS descEn_ok, "featuresEn" IS NOT NULL AS featEn_ok,
"featuresJa" IS NOT NULL AS featJa_ok, "featuresAr" IS NOT NULL AS featAr_ok
FROM services ORDER BY id;`;
fs.writeFileSync(sqlFile, sql, 'utf8');
const cmd = `"${psql}" "${conn}" -f "${sqlFile}"`;
try {
  const buf = execSync(cmd, { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 });
  console.log(buf.toString('utf8'));
} catch (e) {
  console.log('ERR', e.status, e.stdout && e.stdout.toString('utf8'), e.stderr && e.stderr.toString('utf8'));
}
