const fs = require('fs');
const Z = 'D:/企业网站/';
function show(f, label, patterns) {
  const p = Z + f;
  if (!fs.existsSync(p)) { console.log('==', label, ': FILE MISSING'); return; }
  const s = fs.readFileSync(p, 'utf8');
  console.log('==', label);
  for (const [name, re] of patterns) {
    const m = s.match(re);
    console.log('   ', name, ':', m ? m[0].slice(0, 160).replace(/\n/g, '\\n') : 'NOT FOUND');
  }
}
show('components/layout/Footer.tsx', 'Footer', [
  ['tel-href', /<a href=\{`tel:[^\n]*/],
]);
show('app/products/[tab]/[id]/ProductDetailClient.tsx', 'ProductDetailClient', [
  ['tel-href', /href="tel:[^"]*"/],
  ['tel-dynamic', /tel:\$\{[^\n]*/],
  ['tel-static', /tel:\+86\d+/],
]);
show('app/services/[slug]/ServiceDetailClient.tsx', 'ServiceDetailClient', [
  ['tel-href', /href="tel:[^"]*"/],
  ['fake-tel', /010-8888-8888/],
  ['features-map', /features[^;\n]*\.map\([\s\S]{0,160}/],
  ['feature-title', /(?:feature|f)\.title/],
]);
show('app/about/[section]/AboutSectionClient.tsx', 'AboutSectionClient', [
  ['has-certifications', null],
]);
if (fs.existsSync(Z + 'app/about/[section]/AboutSectionClient.tsx')) {
  const s = fs.readFileSync(Z + 'app/about/[section]/AboutSectionClient.tsx', 'utf8');
  const m = s.match(/certifications[\s\S]{0,220}/);
  console.log('   About cert code:', m ? m[0].slice(0, 220).replace(/\n/g, '\\n') : 'no certifications keyword');
  const m2 = s.match(/\.map\(\(c[^)]*\)[\s\S]{0,150}/);
  console.log('   About cert map:', m2 ? m2[0].slice(0, 160) : 'no map');
}
