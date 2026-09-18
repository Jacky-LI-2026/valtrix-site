// 扫描前台详情页组件中硬编码中文渲染文本（临时审计脚本，审计后可归档）
const fs = require("fs");
const files = [
  "app/news/[slug]/NewsDetailClient.tsx",
  "app/industries/[slug]/IndustryDetailClient.tsx",
  "app/careers/[slug]/JobDetailClient.tsx",
  "app/about/[section]/AboutSectionClient.tsx",
  "app/resources/[type]/page.tsx",
  "app/cases/[slug]/page.tsx",
  "app/shop/[slug]/page.tsx",
  "app/shop/cart/page.tsx",
  "app/quote/cart/page.tsx",
  "app/faqs/page.tsx",
  "app/services/[slug]/ServiceDetailClient.tsx",
  "app/products/[tab]/[id]/ProductDetailClient.tsx",
];
const CJK = /[\u4e00-\u9fff]/;
for (const f of files) {
  try {
    const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
    let hits = 0;
    lines.forEach((line, i) => {
      // 只匹配 JSX 文本节点或字符串字面量里的中文（排除注释/import/console）
      if (/^\s*(\/\/|\*|import |export |const |let |console\.|fetch\(|await )/.test(line)) return;
      if (!CJK.test(line)) return;
      // 提取中文片段
      const segs = line.match(/[^'"]*[\u4e00-\u9fff][^'"]*/g) || [];
      const printable = segs.filter((s) => s.trim().length > 0 && s.length < 120);
      if (printable.length) {
        hits++;
        console.log(`${f}:${i + 1}: ${line.trim().slice(0, 180)}`);
      }
    });
    if (!hits) console.log(`${f}: (无中文渲染文本)`);
  } catch (e) {
    console.log(`${f}: ERR ${e.message}`);
  }
}
