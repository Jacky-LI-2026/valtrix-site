const fs = require('fs');
const files = ['app/sitemap.ts','app/robots.ts','app/llms.txt/route.ts','lib/seo.ts','lib/seo/schema.ts','app/sitemap-images.xml/route.ts','lib/seo/baidu-push.ts','app/news/[slug]/page.tsx','app/products/[tab]/[id]/page.tsx','app/services/[slug]/page.tsx','app/careers/[slug]/JobDetailClient.tsx','app/contact/page.tsx','app/products/[tab]/[id]/ProductDetailClient.tsx','app/services/[slug]/ServiceDetailClient.tsx','app/careers/page.tsx','components/layout/Footer.tsx','app/admin/settings/site/page.tsx','app/admin/settings/seo/page.tsx','app/api/admin/email-marketing/route.ts'];
const re = /https?:\/\/[^'"\s\)\]\}]*?\.(?:com|cn|net|org|io)[^'"\s\)\]\}]*/g;
for (const f of files) {
  const p = 'D:/企业网站/' + f;
  if (!fs.existsSync(p)) { console.log('==', f, 'MISSING'); continue; }
  const s = fs.readFileSync(p, 'utf8');
  const m = s.match(re) || [];
  const uniq = [...new Set(m.filter(x => /valtrix|valvetrix|zuowen/.test(x)))];
  console.log('==', f);
  console.log('   ', uniq.slice(0, 6).join(' | ') || '(无站点域名)');
}
