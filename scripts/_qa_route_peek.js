const fs = require('fs');
const path = require('path');
const dir = 'D:/阀门网站/app/api/admin/content';
function walk(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('route.ts')) out.push(p);
  }
  return out;
}
const files = walk(dir, []);
console.log(files.join('\n'));
const idRoute = files.find(f => f.includes('[id]'));
if (idRoute) console.log('===== ' + idRoute + ' =====\n' + fs.readFileSync(idRoute, 'utf8').slice(0, 2500));
