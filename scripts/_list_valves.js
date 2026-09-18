// 深入检查 valves-manifolds.json 结构并输出完整产品清单
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'xinval-scrape', 'valves-manifolds.json'), 'utf8'));

for (const cat of data.categories) {
  console.log(`\n===== 【${cat.name}】 =====`);
  for (const sub of cat.subcategories) {
    console.log(`\n  --- 子类: ${sub.name} ---`);
    const seriesList = sub.series || [];
    for (const s of seriesList) {
      const prods = s.products || [s];
      for (const p of prods) {
        console.log(`    model=${p.model || 'N/A'} | name=${p.name} | nameEn=${p.nameEn || 'N/A'} | url=${p.url || 'N/A'}`);
      }
    }
  }
}
