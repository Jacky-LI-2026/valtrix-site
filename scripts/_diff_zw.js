const fs = require('fs');
const path = require('path');
// VALTRIX 修复的文件列表（程序 bug 类）
const fixes = [
  ['lib/seo-metadata.ts'],
  ['app/careers/[slug]/page.tsx'],
  ['app/about/[section]/page.tsx'],
  ['app/news/[slug]/page.tsx'],
  ['app/products/[tab]/[id]/page.tsx'],
  ['app/industries/[slug]/page.tsx'],
  ['app/services/[slug]/page.tsx'],
  ['components/layout/Footer.tsx'],
  ['app/products/[tab]/[id]/ProductDetailClient.tsx'],
  ['app/services/[slug]/ServiceDetailClient.tsx'],
  ['app/about/[section]/AboutSectionClient.tsx'],
  ['components/sections/Hero.tsx'],
  ['app/contact/page.tsx'],
];
const V = 'D:/阀门网站/';
const Z = 'D:/企业网站/';
for (const [f] of fixes) {
  const vp = V + f, zp = Z + f;
  const ve = fs.existsSync(vp), ze = fs.existsSync(zp);
  if (!ve) { console.log('VALTRIX 不存在:', f); continue; }
  if (!ze) { console.log('左文 不存在:', f, '（VALTRIX 独有，跳过）'); continue; }
  const v = fs.readFileSync(vp, 'utf8');
  const z = fs.readFileSync(zp, 'utf8');
  console.log('====', f, '| VALTRIX', v.length, 'B / 左文', z.length, 'B');
}
