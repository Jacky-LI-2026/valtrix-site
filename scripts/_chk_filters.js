// 检查 filters-systems-tools.json 的产品结构
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'xinval-scrape', 'filters-systems-tools.json'), 'utf8'));

console.log('Top keys:', Object.keys(data));
for (const cat of data.categories || []) {
  console.log(`\n【${cat.name}】`);
  for (const sub of cat.subcategories || []) {
    console.log(`  子类: ${sub.name}`);
    const prods = sub.products || [];
    for (const p of prods) {
      console.log(`    model=${p.model || 'N/A'} | name=${p.name} | specs=${(p.specs||[]).length} | img=${(p.imageUrls||[]).length}`);
    }
  }
}
