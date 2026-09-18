const fs = require('fs');
const Z = 'D:/企业网站/';
// ServiceDetailClient features 渲染
let s = fs.readFileSync(Z + 'app/services/[slug]/ServiceDetailClient.tsx', 'utf8');
const m = s.match(/features\.map\(\(feature[\s\S]{0,400}/);
console.log('== Service features block:');
console.log(m ? m[0].slice(0, 420) : 'NOT FOUND');
// Footer fallback 显示文本
s = fs.readFileSync(Z + 'components/layout/Footer.tsx', 'utf8');
const m2 = s.match(/\{contactData\?\.phone \|\| "[^"]*"\}/);
console.log('\n== Footer phone display:', m2 ? m2[0] : 'NOT FOUND');
const m3 = s.match(/tel:\$\{contactData\?\.phone \|\| "[^"]*"\}/);
console.log('== Footer tel full:', m3 ? m3[0] : 'NOT FOUND');
// AboutSectionClient certifications 完整渲染段
s = fs.readFileSync(Z + 'app/about/[section]/AboutSectionClient.tsx', 'utf8');
const m4 = s.match(/certifications && section\.certifications[\s\S]{0,700}/);
console.log('\n== About cert block:');
console.log(m4 ? m4[0].slice(0, 700) : 'NOT FOUND');
