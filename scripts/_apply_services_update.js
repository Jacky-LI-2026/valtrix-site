// 1) 查看现有 services 数据；2) 生成列名加双引号的 SQL；3) 执行并验证
const { execSync } = require('child_process');
const fs = require('fs');
const psql = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const conn = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const sqlFile = 'D:/阀门网站/scripts/_update_services.sql';
const outFile = 'D:/阀门网站/scripts/_update_services_q.sql';

function runPsql(args) {
  const cmd = `"${psql}" "${conn}" ${args}`;
  try {
    const buf = execSync(cmd, { encoding: 'buffer', maxBuffer: 500 * 1024 * 1024 });
    return { ok: true, text: buf.toString('utf8') };
  } catch (e) {
    return { ok: false, text: (e.stdout ? e.stdout.toString('utf8') : '') + (e.stderr ? e.stderr.toString('utf8') : ''), code: e.status };
  }
}

// 现有数据
console.log('=== BEFORE ===');
console.log(runPsql('-c "SELECT id, slug, title, subtitle FROM services ORDER BY id;"').text);

// 生成双引号版本：把 SET/WHERE 中的标识符列名加双引号
let s = fs.readFileSync(sqlFile, 'utf8');
const quoted = s.replace(/(^|\s)([A-Za-z][A-Za-z0-9_]*)(\s*=\s*)/g, '$1"$2"$3');
fs.writeFileSync(outFile, quoted, 'utf8');
console.log('quoted SQL written to', outFile);
// 确认文件没有 BOM
const b = fs.readFileSync(outFile);
console.log('quoted first bytes:', b.slice(0, 8).toString('hex'), 'hasBOM:', b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF);

// 执行
const r = runPsql(`-v ON_ERROR_STOP=1 -f "${outFile}" -o "D:/阀门网站/scripts/_update_services_q_out.txt"`);
console.log('=== EXEC ===', r.ok ? 'OK' : 'FAIL code ' + r.code);
console.log(r.text);
if (fs.existsSync('D:/阀门网站/scripts/_update_services_q_out.txt')) {
  console.log('OUT:', fs.readFileSync('D:/阀门网站/scripts/_update_services_q_out.txt', 'utf8'));
}

// 验证
console.log('=== AFTER ===');
console.log(runPsql('-c "SELECT id, slug, title, subtitle FROM services ORDER BY id;"').text);
