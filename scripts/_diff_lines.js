const fs = require('fs');
const V = 'D:/阀门网站/';
const Z = 'D:/企业网站/';
function diffLines(f) {
  const v = fs.readFileSync(V + f, 'utf8').split(/\r?\n/);
  const z = fs.readFileSync(Z + f, 'utf8').split(/\r?\n/);
  const out = [];
  let i = 0, j = 0;
  // 简化：逐行对齐输出差异块（前后各带1行上下文）
  const vSet = new Map(), zSet = new Map();
  v.forEach((l, idx) => { const k = l.trim(); if (!vSet.has(k)) vSet.set(k, []); vSet.get(k).push(idx); });
  z.forEach((l, idx) => { const k = l.trim(); if (!zSet.has(k)) zSet.set(k, []); zSet.get(k).push(idx); });
  let zi = 0;
  for (let vi = 0; vi < v.length; vi++) {
    const kv = v[vi].trim();
    if (kv === '' ) { if (zi < z.length && z[zi].trim() === '') { zi++; } continue; }
    if (zi < z.length && v[vi].trim() === z[zi].trim()) { zi++; continue; }
    // 不匹配：在左文中找该行
    const cand = vSet.get(kv);
    let found = false;
    if (cand) {
      for (const idx of cand) {
        if (idx >= zi && idx < zi + 30) { 
          // 左文该行在 VALTRIX 行后方：说明左文有额外内容或 VALTRIX 删除内容
          out.push('  [左文-额外行] L' + idx + ': ' + z[idx].trim().slice(0, 110));
          found = true; break;
        }
      }
    }
    if (!found && zi < z.length) {
      out.push('  [差异] V' + vi + '「' + v[vi].trim().slice(0, 110) + '」 vs Z' + zi + '「' + z[zi].trim().slice(0, 110) + '」');
    }
  }
  return out.slice(0, 60);
}
for (const f of process.argv.slice(2)) {
  console.log('\n########', f);
  const d = diffLines(f);
  if (d.length === 0) console.log('  （无差异）');
  else d.forEach(x => console.log(x));
}
