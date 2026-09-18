/** 修正 specs 规格名技术术语翻译 */
const { execSync } = require('child_process');
const fs = require('fs');
const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
function q(sql) {
  const fsql = 'D:/企业网站/_q_tmp.sql';
  const fout = 'D:/企业网站/_q_tmp_out.txt';
  fs.writeFileSync(fsql, sql, 'utf8');
  execSync(`"${PSQL}" "${DB}" -t -A -f "${fsql}" -o "${fout}"`, { encoding: 'buffer', maxBuffer: 200 * 1024 * 1024 });
  return fs.readFileSync(fout, 'utf8').trim();
}
// 术语修正表（zh → 各语正确翻译；undefined 表示保留现有）
const FIX = {
  '工作压力': { Ja: '動作圧力', Ko: '작동 압력', Fr: 'Pression de service', Ar: 'ضغط التشغيل' },
  '开启压力': { Ja: 'クラッキング圧力', Ko: '크래킹 압력', Fr: 'Pression de craquage', Ar: 'ضغط الفتح' },
  '连接': { Ja: '接続', Ko: '연결', Fr: 'Connexion', Ar: 'الاتصال' },
  '驱动': { Ja: '駆動方式', Ko: '구동 방식', Fr: 'Actionnement', Ar: 'التشغيل' },
  'CV 值': { Ar: 'قيمة CV' },
  '材质': { Ja: '材質' },
  '角度': { Fr: 'Angle' },
  '温度': { Fr: 'Température' },
};
const lines = [];
const raw = q(`SELECT id, specs::text FROM products WHERE jsonb_array_length(specs) > 0 ORDER BY id`);
for (const row of raw.split('\n')) {
  if (!row) continue;
  const i = row.indexOf('|');
  if (i < 0) continue;
  const id = row.slice(0, i).trim();
  let arr; try { arr = JSON.parse(row.slice(i + 1)); } catch (e) { continue; }
  let changed = false;
  for (const sp of arr) {
    // 清理小写脏键
    for (const k of ['nameja', 'nameko', 'namefr', 'namear']) {
      if (k in sp) { delete sp[k]; changed = true; }
    }
    const fx = FIX[sp.name];
    if (!fx) continue;
    for (const [suf, v] of Object.entries(fx)) {
      if (sp['name' + suf] !== v) { sp['name' + suf] = v; changed = true; }
    }
  }
  if (changed) lines.push(`UPDATE products SET specs = '${JSON.stringify(arr).replace(/'/g, "''")}'::jsonb WHERE id = ${id};`);
}
fs.writeFileSync('D:/企业网站/_ml_specs_fix.sql', lines.join('\n'), 'utf8');
console.log('修正行数:', lines.length);
