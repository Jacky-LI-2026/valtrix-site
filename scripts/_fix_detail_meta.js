const fs = require('fs');
const edits = [
  // [file, oldFrag, newFrag]
  ['app/careers/[slug]/page.tsx',
   'fallbackTitle: record["title"] || "",\n      fallbackDescription: record["summary"] || "",',
   'fallbackTitle: record["titleEn"] || record["title"] || "",\n      fallbackDescription: record["summaryEn"] || record["summary"] || "",'],
  ['app/about/[section]/page.tsx',
   'fallbackTitle: record["title"] || "",\n      fallbackDescription: record["description"] || "",',
   'fallbackTitle: record["titleEn"] || record["title"] || "",\n      fallbackDescription: record["descriptionEn"] || record["description"] || "",'],
  ['app/news/[slug]/page.tsx',
   'fallbackTitle: record["title"] || "",\n      fallbackDescription: record["summary"] || "",',
   'fallbackTitle: record["titleEn"] || record["title"] || "",\n      fallbackDescription: record["summaryEn"] || record["summary"] || "",'],
  ['app/products/[tab]/[id]/page.tsx',
   'fallbackTitle: record["name"] || "",\n      fallbackDescription: record["summary"] || "",',
   'fallbackTitle: record["nameEn"] || record["name"] || "",\n      fallbackDescription: record["summaryEn"] || record["summary"] || "",'],
  ['app/industries/[slug]/page.tsx',
   'fallbackTitle: record["name"] || "",\n      fallbackDescription: record["tagline"] || "",',
   'fallbackTitle: record["nameEn"] || record["name"] || "",\n      fallbackDescription: record["taglineEn"] || record["tagline"] || "",'],
  ['app/services/[slug]/page.tsx',
   'fallbackTitle: record["title"] || "",\n      fallbackDescription: record["subtitle"] || "",',
   'fallbackTitle: record["titleEn"] || record["title"] || "",\n      fallbackDescription: record["subtitleEn"] || record["subtitle"] || "",'],
];
for (const [f, oldF, newF] of edits) {
  const p = 'D:/阀门网站/' + f;
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes(oldF)) { console.log('NOT FOUND in', f); continue; }
  s = s.replace(oldF, newF);
  fs.writeFileSync(p, s);
  console.log('OK', f);
}
// lib/seo-metadata.ts: pickField 回退顺序 —— buildSeoMetadata title 优先 fallbackTitle
const p2 = 'D:/阀门网站/lib/seo-metadata.ts';
let s2 = fs.readFileSync(p2, 'utf8');
const oldBlock = `export function buildSeoMetadata(opts: {
  record: any;
  locale?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
}): Metadata {
  const locale = opts.locale || getLocaleFromCookies();
  const title = pickField(opts.record, "seoTitle", locale) || opts.fallbackTitle || "";
  const description = pickField(opts.record, "seoDescription", locale) || opts.fallbackDescription || undefined;`;
const newBlock = `export function buildSeoMetadata(opts: {
  record: any;
  locale?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
}): Metadata {
  const locale = opts.locale || getLocaleFromCookies();
  // 回退顺序：seoTitle<语种> → 传入的 fallbackTitle（英文名优先） → seoTitle 中文兜底
  const title = pickField(opts.record, "seoTitle", locale) || opts.fallbackTitle || pickField(opts.record, "seoTitle", "zh") || "";
  const description = pickField(opts.record, "seoDescription", locale) || opts.fallbackDescription || pickField(opts.record, "seoDescription", "zh") || undefined;`;
if (s2.includes(oldBlock)) { s2 = s2.replace(oldBlock, newBlock); fs.writeFileSync(p2, s2); console.log('OK lib/seo-metadata.ts'); }
else console.log('NOT FOUND seo-metadata block');
