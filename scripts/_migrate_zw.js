// 左文站程序 bug 移植脚本（仅代码逻辑，不动任何内容/数据）
// 来源基线：D:/阀门网站 已修复并线上验证的代码
const fs = require('fs');
const Z = 'D:/企业网站/';
const V = 'D:/阀门网站/';
let changed = [];
function w(f, content) { fs.writeFileSync(Z + f, content); changed.push(f); }
function rd(f) { return fs.readFileSync(f, 'utf8'); }

// ============ 1. lib/seo-metadata.ts 整文件覆盖（纯逻辑，import 与左文兼容） ============
const seoV = rd(V + 'lib/seo-metadata.ts');
// 确认 VALTRIX 版 import 引用的 defaultLocale/locales 在左文 config/i18n.ts 存在
const i18n = rd(Z + 'config/i18n.ts');
if (!/defaultLocale/.test(i18n)) throw new Error('左文 config/i18n.ts 无 defaultLocale');
w('lib/seo-metadata.ts', seoV);
console.log('[1] lib/seo-metadata.ts 覆盖 OK');

// ============ 2-7. 六个详情页 fallbackTitle/fallbackDescription 英文优先 ============
const detailMap = {
  'app/careers/[slug]/page.tsx': ['title', 'summary'],
  'app/about/[section]/page.tsx': ['title', 'description'],
  'app/news/[slug]/page.tsx': ['title', 'summary'],
  'app/products/[tab]/[id]/page.tsx': ['name', 'summary'],
  'app/industries/[slug]/page.tsx': ['name', 'tagline'],
  'app/services/[slug]/page.tsx': ['title', 'subtitle'],
};
for (const [f, [t, d]] of Object.entries(detailMap)) {
  let s = rd(Z + f);
  const tEn = t + 'En';
  const dEn = d + 'En';
  const oldT = `fallbackTitle: record["${t}"] || "",`;
  const newT = `fallbackTitle: record["${tEn}"] || record["${t}"] || "",`;
  if (!s.includes(oldT)) throw new Error(f + ' 未匹配 fallbackTitle 原样: ' + oldT);
  s = s.replace(oldT, newT);
  const oldD = `fallbackDescription: record["${d}"] || "",`;
  const newD = `fallbackDescription: record["${dEn}"] || record["${d}"] || "",`;
  if (!s.includes(oldD)) throw new Error(f + ' 未匹配 fallbackDescription 原样');
  s = s.replace(oldD, newD);
  w(f, s);
  console.log('[2] ' + f + ' fallback 英文优先 OK');
}

// ============ 8. Footer.tsx tel href 清洗（fallback 保留左文原值） ============
{
  let s = rd(Z + 'components/layout/Footer.tsx');
  const oldH = 'href={`tel:${contactData?.phone || "+8617722813298"}`}';
  const newH = 'href={`tel:${String(contactData?.phone || "+8617722813298").replace(/[^\\d+]/g, "")}`}';
  if (!s.includes(oldH)) throw new Error('Footer 未匹配 tel href');
  s = s.replace(oldH, newH);
  w('components/layout/Footer.tsx', s);
  console.log('[3] Footer.tsx tel 清洗 OK');
}

// ============ 9. ProductDetailClient.tsx tel 动态清洗 ============
{
  let s = rd(Z + 'app/products/[tab]/[id]/ProductDetailClient.tsx');
  const oldH = 'href="tel:+8617722813298"';
  // 找到 href 所在 <a> 块的显示文本 span，改为动态
  if (!s.includes(oldH)) throw new Error('ProductDetailClient 未匹配 tel href');
  const newH = 'href={`tel:${String(contactData?.phone || "+86 177-2281-3298").replace(/[^\\d+]/g, "")}`}';
  s = s.replace(oldH, newH);
  w('app/products/[tab]/[id]/ProductDetailClient.tsx', s);
  console.log('[4] ProductDetailClient.tsx tel 动态化 OK');
}

// ============ 10. ServiceDetailClient.tsx features 兼容字符串/对象 + 过滤空项 ============
{
  let s = rd(Z + 'app/services/[slug]/ServiceDetailClient.tsx');
  const oldBlock = `{features.map((feature: any, index: number) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={20} className="text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {loc.get(feature, "title") || loc.get(feature, "name")}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {loc.get(feature, "desc") || loc.get(feature, "description")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}`;
  const newBlock = `{features.map((feature: any, index: number) => {
                // features 可能是字符串数组或对象数组（兼容两种数据结构）
                const isString = typeof feature === "string";
                const featTitle = isString ? feature : (loc.get(feature, "title") || loc.get(feature, "name"));
                const featDesc = isString ? "" : (loc.get(feature, "desc") || loc.get(feature, "description"));
                if (!featTitle || String(featTitle).trim() === "") return null;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={20} className="text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {featTitle}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {featDesc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}`;
  if (!s.includes(oldBlock)) {
    // 若空白细节略有不同则报错人工处理
    throw new Error('ServiceDetailClient 未匹配 features.map 块');
  }
  s = s.replace(oldBlock, newBlock);
  w('app/services/[slug]/ServiceDetailClient.tsx', s);
  console.log('[5] ServiceDetailClient.tsx features 兼容 OK');
}

// ============ 11a. AboutSectionClient.tsx certifications 过滤空记录 + 卡片条件渲染（完整块替换） ============
{
  let s = rd(Z + 'app/about/[section]/AboutSectionClient.tsx');
  const oldFull = `      {section.certifications && section.certifications.length > 0 && (
        <section className="py-16 lg:py-20 bg-dark-50">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {section.certifications.map((cert: any, i: number) => (
                <div key={i} className="bg-white rounded-lg p-6 border border-dark-100 hover:border-primary hover:shadow-lg transition-all">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Award size={24} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-dark mb-2">{loc.get(cert, "name")}</h3>
                  <p className="text-dark-500 text-sm mb-2">{loc.get(cert, "issuer")}</p>
                  <p className="text-primary text-sm font-medium">{cert.year}</p>
                </div>
              ))}`;
  const newFull = `      {section.certifications && section.certifications.filter((c: any) => (c?.name || c?.nameEn || c?.nameJa || c?.nameKo || c?.nameFr || c?.nameAr) && String(c.name || c.nameEn || "").trim() !== "").length > 0 && (
        <section className="py-16 lg:py-20 bg-dark-50">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {section.certifications.filter((c: any) => (c?.name || c?.nameEn || c?.nameJa || c?.nameKo || c?.nameFr || c?.nameAr) && String(c.name || c.nameEn || "").trim() !== "").map((cert: any, i: number) => {
                const certName = loc.get(cert, "name");
                const certIssuer = loc.get(cert, "issuer");
                const certYear = cert?.year;
                return (
                <div key={i} className="bg-white rounded-lg p-6 border border-dark-100 hover:border-primary hover:shadow-lg transition-all">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Award size={24} className="text-primary" />
                  </div>
                  {certName && <h3 className="text-lg font-bold text-dark mb-2">{certName}</h3>}
                  {certIssuer && <p className="text-dark-500 text-sm mb-2">{certIssuer}</p>}
                  {certYear && <p className="text-primary text-sm font-medium">{certYear}</p>}
                </div>
                );
              })}`;
  if (!s.includes(oldFull)) throw new Error('AboutSectionClient 未匹配 cert 完整块');
  s = s.replace(oldFull, newFull);
  w('app/about/[section]/AboutSectionClient.tsx', s);
  console.log('[6] AboutSectionClient cert 完整替换 OK');
}

// ============ 11b. AboutSectionClient.tsx renderBlocks 兼容硬编码 headingEn/paragraphsEn（culture 修复） ============
{
  let s = rd(Z + 'app/about/[section]/AboutSectionClient.tsx');
  const oldRB = `const renderBlocks = (blocks: any[]) => blocks.map((block: any, i: number) => (
                  <div key={i}>
                    <h2 className="text-2xl font-bold text-dark mb-4">{block.heading}</h2>
                    <div className="space-y-4">
                      {(block.paragraphs || []).map((p: string, j: number) => (
                        <p key={j} className="text-dark-600 leading-relaxed">{p}</p>
                      ))}
                    </div>
                  </div>
                ));`;
  const newRB = `const renderBlocks = (blocks: any[]) => blocks.map((block: any, i: number) => {
                  // 兼容硬编码 fallback 结构（lib/about.ts）：heading/paragraphs + headingEn/Ja/Ko/Fr/Ar + paragraphsEn/Ja/Ko/Fr/Ar
                  const sfx = locale === "zh" ? "" : locale.charAt(0).toUpperCase() + locale.slice(1);
                  const heading = (sfx && block["heading" + sfx]) || block.heading || "";
                  const paras = (sfx && block["paragraphs" + sfx]) || block.paragraphs || [];
                  return (
                    <div key={i}>
                      <h2 className="text-2xl font-bold text-dark mb-4">{heading}</h2>
                      <div className="space-y-4">
                        {(paras || []).map((p: string, j: number) => (
                          <p key={j} className="text-dark-600 leading-relaxed">{p}</p>
                        ))}
                      </div>
                    </div>
                  );
                });`;
  if (!s.includes(oldRB)) throw new Error('AboutSectionClient 未匹配 renderBlocks（可能已被上一段修改过，需人工核对）');
  s = s.replace(oldRB, newRB);
  w('app/about/[section]/AboutSectionClient.tsx', s);
  console.log('[7] AboutSectionClient renderBlocks 兼容 OK');
}

console.log('\n=== 变更文件 ===');
changed.forEach(f => console.log(' *', f));
