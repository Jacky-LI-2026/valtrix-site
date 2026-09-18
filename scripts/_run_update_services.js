// 按已验证模式执行 _update_services.sql（psql -f + ON_ERROR_STOP + buffer 输出）
const { execSync } = require('child_process');
const fs = require('fs');
const psql = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const conn = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const sql = 'D:/阀门网站/scripts/_update_services.sql';
const out = 'D:/阀门网站/scripts/_update_services_out.txt';
try {
  const cmd = `"${psql}" "${conn}" -v ON_ERROR_STOP=1 -f "${sql}" -o "${out}"`;
  console.log('CMD:', cmd);
  const buf = execSync(cmd, { encoding: 'buffer', maxBuffer: 500 * 1024 * 1024 });
  console.log('EXIT OK, stdout bytes:', buf.length);
  try { console.log('stdout:', buf.toString('utf8')); } catch (e) {}
  if (fs.existsSync(out)) {
    const o = fs.readFileSync(out);
    console.log('OUT FILE bytes:', o.length);
    console.log('OUT FILE content:', o.toString('utf8'));
  }
} catch (e) {
  console.log('EXIT CODE:', e.status);
  if (e.stdout) console.log('stdout:', e.stdout.toString('utf8'));
  if (e.stderr) console.log('stderr:', e.stderr.toString('utf8'));
}
