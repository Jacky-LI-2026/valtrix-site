// 检查 valves-manifolds.json 实际结构
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'xinval-scrape', 'valves-manifolds.json'), 'utf8'));

console.log('Top keys:', Object.keys(data));
console.log('categories type:', Array.isArray(data.categories) ? 'array' : typeof data.categories);
if (data.categories && data.categories.length > 0) {
  console.log('First category keys:', Object.keys(data.categories[0]));
  console.log('First category name:', data.categories[0].name);
  const subcats = data.categories[0].subcategories || data.categories[0].categories || [];
  console.log('Subcategories count:', subcats.length);
  if (subcats.length > 0) {
    console.log('First subcat keys:', Object.keys(subcats[0]));
    console.log('First subcat name:', subcats[0].name);
    const prods = subcats[0].products || subcats[0].models || [];
    console.log('Products count:', prods.length);
    if (prods.length > 0) {
      console.log('First product keys:', Object.keys(prods[0]));
      console.log('First product:', JSON.stringify(prods[0], null, 2).substring(0, 500));
    }
  }
}
