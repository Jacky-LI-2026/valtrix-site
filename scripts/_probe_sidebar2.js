const fs = require('fs');
const s = fs.readFileSync('D:/阀门网站/components/admin/AdminSidebar.tsx', 'utf8');
const i = s.indexOf("label: '能力市场'");
console.log(s.slice(i - 60, i + 1100));
