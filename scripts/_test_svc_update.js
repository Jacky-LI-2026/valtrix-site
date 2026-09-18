const { execSync } = require('child_process');
const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const q = `UPDATE services SET subtitle='测试更新XYZ123' WHERE id=1;`;
try {
  const out = execSync(`"${PSQL}" "${DB}" -t -c "${q}"`, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  console.log('OUT:', JSON.stringify(out.toString('utf8')));
} catch (e) {
  console.log('ERR:', e.stderr ? e.stderr.toString('utf8') : e.message);
}
