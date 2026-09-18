const fs = require('fs');
const R = 'D:/企业网站/';
const checks = {
  'app/services/[slug]/ServiceDetailClient.tsx': ['relatedServiceSlugs', '加载中', '服务不存在'],
  'app/contact/page.tsx': ['item.sub', 'defaultContactInfo'],
  'components/layout/Header.tsx': ['locale === "en"', '成长里程碑', 'menuProfileDesc'],
  'app/careers/page.tsx': ['加载中'],
  'app/industries/page.tsx': ['加载中'],
  'app/careers/[slug]/JobDetailClient.tsx': ['加载中'],
  'app/industries/[slug]/IndustryDetailClient.tsx': ['加载中'],
  'app/about/[section]/AboutSectionClient.tsx': ['加载中'],
  'config/i18n.ts': ['loading: "加载中"', 'serviceNotFound'],
};
for (const [f, keys] of Object.entries(checks)) {
  const p = R + f;
  if (!fs.existsSync(p)) { console.log('==', f, 'MISSING'); continue; }
  const s = fs.readFileSync(p, 'utf8');
  const res = keys.map(k => k + ':' + (s.includes(k) ? 'YES' : 'no'));
  console.log('==', f, '|', res.join(' '));
}
