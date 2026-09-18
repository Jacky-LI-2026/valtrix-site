// 查看本地 zuowen_valve services 表结构
const { execSync } = require('child_process');
const psql = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const conn = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const sqls = [
  '\\d services',
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='services' ORDER BY ordinal_position;",
];
try {
  for (const s of sqls) {
    const cmd = `"${psql}" "${conn}" -c "${s.replace(/"/g, '\\"')}"`;
    console.log('=== ' + s + ' ===');
    const buf = execSync(cmd, { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 });
    console.log(buf.toString('utf8'));
  }
} catch (e) {
  console.log('EXIT CODE:', e.status);
  if (e.stdout) console.log('stdout:', e.stdout.toString('utf8'));
  if (e.stderr) console.log('stderr:', e.stderr.toString('utf8'));
}
