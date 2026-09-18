const { execSync } = require('child_process');
const fs = require('fs');
const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
function run(f, opts) {
  try {
    const out = execSync(`"${PSQL}" "${DB}" -t -f "C:/${f}" -o "C:/${f}.out"`, { encoding: 'buffer', maxBuffer: 50 * 1024 * 1024, ...opts });
    const r = fs.existsSync('C:/' + f + '.out') ? fs.readFileSync('C:/' + f + '.out', 'utf8').slice(0, 150) : '';
    return 'OK: ' + JSON.stringify(r);
  } catch (e) {
    return 'ERR: ' + (e.stderr ? e.stderr.toString('utf8').slice(0, 300) : e.message);
  }
}
// 完全复刻 _add_products 条件：无 SET、无 stdio、带 -o、超长中文 UPDATE
fs.writeFileSync('C:/m7.sql', `UPDATE services SET subtitle='超长中文测试'.repeat(300) || '${'Y'.repeat(2000)}' WHERE id=1;\n`, 'utf8');
// 对照：同样内容但 SET client_encoding
fs.writeFileSync('C:/m8.sql', `SET client_encoding TO 'UTF8';\nUPDATE services SET subtitle='超长中文测试'.repeat(300) || '${'Y'.repeat(2000)}' WHERE id=1;\n`, 'utf8');
console.log('m7-无SET无stdio带-o:', run('m7.sql', {}));
console.log('m8-有SET无stdio带-o:', run('m8.sql', {}));
console.log('CHECK1:', execSync(`"${PSQL}" "${DB}" -t -A -c "SELECT length(subtitle) FROM services WHERE id=1"`, { encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8'));
