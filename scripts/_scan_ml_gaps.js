/** 动态扫描各模块多语列空值（text 列 TRIM，jsonb 列判空） */
const { execSync } = require('child_process');
const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
function q(sql) {
  return execSync(`"${PSQL}" "${DB}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }).trim();
}
const tables = ['products', 'industries', 'news', 'services', 'resource_items', 'about_sections', 'menu'];
for (const t of tables) {
  const rows = q(`SELECT column_name||'|'||data_type FROM information_schema.columns WHERE table_name='${t}' AND (column_name LIKE '%Ja' OR column_name LIKE '%Ko' OR column_name LIKE '%Fr' OR column_name LIKE '%Ar')`).split('\n').filter(Boolean).map(l => l.split('|'));
  if (!rows.length) { console.log(`${t}: 无 Ja/Ko/Fr/Ar 列`); continue; }
  const conds = rows.map(([c, ty]) => ty.startsWith('jsonb') ? `("${c}" IS NULL OR jsonb_array_length("${c}")=0)` : `(COALESCE(TRIM("${c}"),'')='')`);
  const cnt = q(`SELECT count(*) FROM ${t} WHERE ${conds.join(' OR ')}`);
  const detail = q(`SELECT id, string_agg(col, ',' ORDER BY col) FROM (SELECT id, unnest(ARRAY[${rows.map(r => `'${r[0]}'`).join(',')}]) AS col, unnest(ARRAY[${rows.map(([c, ty]) => ty.startsWith('jsonb') ? `(CASE WHEN "${c}" IS NULL OR jsonb_array_length("${c}")=0 THEN 1 ELSE 0 END)` : `(CASE WHEN COALESCE(TRIM("${c}"),'')='' THEN 1 ELSE 0 END)`).join(',')}]) AS miss FROM ${t}) x WHERE miss=1 GROUP BY id LIMIT 6`);
  console.log(`\n${t}: ${cnt} 行有多语缺失 | 列: ${rows.map(r => r[0]).join(',')}`);
  if (detail) detail.split('\n').filter(Boolean).forEach(l => console.log('  ', l));
}
