const fs = require("fs");
const path = require("path");
const ROOT = "D:/阀门网站";

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}

const checks = [];

// 1. Hero.tsx 统计标签 → t()
{
  const s = read("components/sections/Hero.tsx");
  checks.push([
    "1.Hero stats",
    ["t(\"statsProductSeries\")", "t(\"statsIndustriesServed\")", "t(\"statsAnnualOutput\")", "t(\"statsGlobalClients\")"].every((k) => s.includes(k)) && !s.includes("locale === \"en\" ? [{label:\"Product Series\""),
  ]);
}

// 2. Header 12 desc → t()
{
  const s = read("components/layout/Header.tsx");
  const keys = ["navDescVcrFittings","navDescDiaphragmValves","navDescPressureReducers","navDescCheckValves","navDescGasFilters","navDescWeldedFittings","navDescSemiconductor","navDescBiopharma","navDescLed","navDescSolar","navDescHydrogen","navDescResearch"];
  checks.push(["2.Header 12 desc", keys.every((k) => s.includes(`t("${k}")`)) && (s.match(/locale === "en" \? ".*desc/g) || []).length === 0]);
}

// 3. Header language 标签
{
  const s = read("components/layout/Header.tsx");
  checks.push(["3.Header language", s.includes('t("language")') && !s.includes('locale === "en" ? "Language" : "语言"')]);
}

// 4. 加载态/404
{
  const files = ["app/news/[slug]/NewsDetailClient.tsx","app/about/page.tsx","app/faqs/page.tsx","app/news/page.tsx","app/services/page.tsx","app/resources/page.tsx","app/resources/[type]/page.tsx","app/cases/page.tsx","app/cases/[slug]/page.tsx"];
  let ok = true;
  for (const f of files) {
    const s = read(f);
    if (s.includes("加载中")) { ok = false; console.log("  残留 加载中 ->", f); }
  }
  const nd = read("app/news/[slug]/NewsDetailClient.tsx");
  ok = ok && nd.includes('t("newsNotFound")') && nd.includes('t("backToNews")');
  checks.push(["4.加载态/404", ok]);
}

// 5. Industries 仅 zh
{
  const s = read("components/sections/Industries.tsx");
  checks.push(["5.Industries", s.includes('locale === "zh" && industry.nameEn') && !s.includes('!isEn && industry.nameEn') && !s.includes("const isEn")]);
  const s2 = read("app/industries/[slug]/IndustryDetailClient.tsx");
  checks.push(["5b.IndustryDetail", (s2.match(/locale === "zh" && industry\.nameEn/g) || []).length >= 2 && !s2.includes("const isEn")]);
}

// 6. contact sub 去重
{
  const s = read("app/contact/page.tsx");
  checks.push(["6.contact sub", s.includes('sub: ""') && s.includes("item.sub && item.sub !== item.label")]);
}

// 7. 手册 PDF
{
  const s = read("app/products/[tab]/[id]/ProductDetailClient.tsx");
  checks.push(["7.manual url", s.includes('"/downloads/valtrix-product-catalog-2026.pdf"') && !s.includes("valve-tech-product-manual.pdf")]);
  checks.push(["7b.manualOk", s.includes("manualOk") && s.includes('t("noManual")')]);
}

// 8. bdi
{
  const files = ["app/contact/page.tsx","app/products/[tab]/[id]/ProductDetailClient.tsx","components/sections/CTA.tsx","components/layout/Footer.tsx","app/services/[slug]/ServiceDetailClient.tsx"];
  let ok = true;
  for (const f of files) {
    const s = read(f);
    const n = (s.match(/<bdi dir="ltr">/g) || []).length;
    if (n === 0) { ok = false; console.log("  无 bdi ->", f); }
  }
  checks.push(["8.bdi", ok]);
}

// 9. 左文科技 活动代码
{
  const dirs = ["app","components","lib","config"];
  let hits = [];
  function walk(d) {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const p = d + "/" + e.name;
      if (e.isDirectory()) { if (!["node_modules", ".next"].includes(e.name)) walk(p); }
      else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
        const s = fs.readFileSync(path.join(ROOT, p), "utf8");
        if (s.includes("左文科技")) hits.push(p);
      }
    }
  }
  walk("app"); walk("components"); walk("lib"); walk("config");
  checks.push(["9.左文科技", hits.length === 0 ? true : "HITS:" + hits.join(",")]);
}

// i18n 21 key 六语种
{
  const s = read("config/i18n.ts");
  const newKeys = ["statsProductSeries","statsIndustriesServed","statsAnnualOutput","statsGlobalClients","navDescVcrFittings","navDescWeldedFittings","navDescDiaphragmValves","navDescPressureReducers","navDescCheckValves","navDescGasFilters","navDescSemiconductor","navDescBiopharma","navDescLed","navDescSolar","navDescHydrogen","navDescResearch","language","newsNotFound","modelDrawings","downloadFile","noManual"];
  let ok = true;
  for (const k of newKeys) {
    const n = (s.match(new RegExp("\\b" + k + "\\b", "g")) || []).length;
    if (n < 6) { ok = false; console.log("  key 不足6语种 ->", k, n); }
  }
  checks.push(["i18n 21key", ok]);
}

for (const [name, ok] of checks) {
  console.log((ok === true ? "PASS" : "FAIL") + "  " + name + (ok === true ? "" : "  => " + JSON.stringify(ok)));
}
