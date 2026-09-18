const fs = require('fs');
const t = fs.readFileSync('D:/阀门网站/lib/content-types/registry.ts', 'utf8').split(/\r?\n/);
let start = -1;
for (let i = 0; i < t.length; i++) {
  if (t[i].includes('products') && t[i].includes('name:') && t[i].includes('label')) { start = i; break; }
}
if (start < 0) {
  for (let i = 0; i < t.length; i++) { if (t[i].includes("'products'") || t[i].includes('"products"')) { start = i; break; } }
}
console.log('start line', start + 1);
console.log(t.slice(start, start + 60).join('\n'));
