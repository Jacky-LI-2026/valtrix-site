// 读取 valves-manifolds.json，输出正确的产品分类结构
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'xinval-scrape', 'valves-manifolds.json'), 'utf8'));

console.log('=== 阀门/阀组 正确产品结构 ===\n');
for (const cat of data.categories) {
  console.log(`【${cat.name}】(slug: ${cat.slug || 'N/A'})`);
  for (const prod of cat.products) {
    console.log(`  - ${prod.model || 'N/A'} | ${prod.name} | ${prod.nameEn || 'N/A'}`);
  }
  console.log('');
}
