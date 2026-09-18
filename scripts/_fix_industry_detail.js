// 修复 IndustryDetailClient.tsx 英文副标题（同类 bug：仅 zh 显示）
const fs = require("fs");
const p = "D:/阀门网站/app/industries/[slug]/IndustryDetailClient.tsx";
let s = fs.readFileSync(p, "utf8");
function rep(oldS, newS) {
  const n = s.split(oldS).length - 1;
  if (n !== 1) { console.error("match count = " + n + " for: " + oldS.slice(0, 50)); process.exit(1); }
  s = s.replace(oldS, newS);
  console.log("OK: " + oldS.slice(0, 50));
}
rep('{!isEn && industry.nameEn && <p className="text-lg text-primary-200 font-medium mb-4">{industry.nameEn}</p>}',
    '{locale === "zh" && industry.nameEn && <p className="text-lg text-primary-200 font-medium mb-4">{industry.nameEn}</p>}');
rep('{!isEn && industry.nameEn && <p className="text-white/60 text-sm">{industry.nameEn}</p>}',
    '{locale === "zh" && industry.nameEn && <p className="text-white/60 text-sm">{industry.nameEn}</p>}');
// isEn 不再使用，移除声明
rep('  const isEn = locale === "en";\n', '');
fs.writeFileSync(p, s, "utf8");
console.log("IndustryDetailClient.tsx fixed");
