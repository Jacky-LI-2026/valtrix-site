const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'xinval-scrape', 'consolidated_all_v2.json'), 'utf8'));
console.log('Top keys:', Object.keys(data));
if (data.tabs) {
  console.log('Tabs:', data.tabs.length);
  const t = data.tabs[1]; // valves
  console.log('Tab1:', t.name, 'categories:', t.categories?.length);
  const c = t.categories?.[0];
  console.log('Cat0:', c.name, 'products:', c.products?.length);
  const p = c.products?.[0];
  console.log('Product0 keys:', Object.keys(p));
  console.log('Product0:', JSON.stringify({slug:p.slug, name:p.name, nameEn:p.nameEn, model:p.model, coverImage:p.coverImage, specs:(p.specs||[]).length}, null, 2));
}
