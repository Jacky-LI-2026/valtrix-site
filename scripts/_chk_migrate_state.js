const fs = require('fs');
const Z = 'D:/企业网站/';
function ck(f, tests) {
  const p = Z + f;
  if (!fs.existsSync(p)) { console.log(f, '| MISSING'); return; }
  const s = fs.readFileSync(p, 'utf8');
  console.log('==', f);
  for (const [name, re] of tests) console.log('   ', name, ':', re.test(s) ? 'OK(已修)' : '缺(待修)');
}
// seo-metadata: 已被脚本覆盖，检查是否为 VALTRIX 版
{
  const s = fs.readFileSync(Z + 'lib/seo-metadata.ts', 'utf8');
  console.log('== lib/seo-metadata.ts');
  console.log('    getLocaleFromCookies 回退 defaultLocale:', /defaultLocale/.test(s) ? 'OK' : '仍写死zh');
  console.log('    回退顺序含中文兜底:', /pickField\(opts\.record, "seoTitle", locale\) \|\| opts\.fallbackTitle \|\| pickField\(opts\.record, "seoTitle", "zh"\)/.test(s) ? 'OK' : '缺');
}
ck('components/layout/Footer.tsx', [
  ['tel清洗', /tel:\$\{String\(contactData\?\.phone \|\| "[^"]*"\)\.replace\(/],
]);
ck('app/products/[tab]/[id]/ProductDetailClient.tsx', [
  ['tel动态化', /href=\{`tel:\$\{String\(contactData\?\.phone/],
]);
ck('app/services/[slug]/ServiceDetailClient.tsx', [
  ['features兼容字符串', /typeof feature === "string"/],
  ['features空项过滤', /if \(!featTitle/],
]);
ck('app/about/[section]/AboutSectionClient.tsx', [
  ['cert过滤', /certifications\.filter\(\(c: any\)/],
  ['cert条件渲染', /certName && <h3/],
  ['renderBlocks兼容En', /block\["heading" \+ sfx\]/],
]);
