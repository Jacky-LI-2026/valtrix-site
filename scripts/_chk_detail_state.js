const fs = require('fs');
const Z = 'D:/企业网站/';
const detailMap = {
  'app/careers/[slug]/page.tsx': ['title', 'summary'],
  'app/about/[section]/page.tsx': ['title', 'description'],
  'app/news/[slug]/page.tsx': ['title', 'summary'],
  'app/products/[tab]/[id]/page.tsx': ['name', 'summary'],
  'app/industries/[slug]/page.tsx': ['name', 'tagline'],
  'app/services/[slug]/page.tsx': ['title', 'subtitle'],
};
for (const [f, [t, d]] of Object.entries(detailMap)) {
  const s = fs.readFileSync(Z + f, 'utf8');
  const isNew = s.includes(`fallbackTitle: record["${t}En"] || record["${t}"] || "",`) && s.includes(`fallbackDescription: record["${d}En"] || record["${d}"] || "",`);
  const isOld = s.includes(`fallbackTitle: record["${t}"] || "",`);
  console.log(f, '| new(En优先):', isNew, '| old(中文):', isOld);
}
