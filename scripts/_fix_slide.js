const fs = require('fs');
const p = 'D:/阀门网站/components/sections/Hero.tsx';
let s = fs.readFileSync(p, 'utf8');
const line = '                  <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgGradient} opacity-35`} />';
if (!s.includes(line)) { console.log('LINE NOT FOUND'); process.exit(1); }
s = s.split(line).join('');
fs.writeFileSync(p, s, 'utf8');
console.log('OK removed:', s.includes('opacity-35') ? 'STILL EXISTS' : 'CLEAN');
