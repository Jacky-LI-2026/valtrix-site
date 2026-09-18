/**
 * scripts/_test_kitz_wiring.js — 只读断言脚本（kitz-clean 主题接入模板机制）
 * =====================================================
 * 本脚本**只读**文件，不写入、不构建、不联网。用法：node scripts/_test_kitz_wiring.js
 * 退出码 0 = 全部通过；1 = 有失败项。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0;
let fail = 0;
const results = [];

function check(name, ok, detail) {
  if (ok) {
    pass++;
    results.push(`  PASS  ${name}`);
  } else {
    fail++;
    results.push(`  FAIL  ${name}${detail ? "  <-- " + detail : ""}`);
  }
}

// ---------- 1) presets.ts ----------
const presets = read("lib/templates/presets.ts");

check(
  'presets.ts 含 slug: "kitz-clean"（双引号）',
  presets.includes('slug: "kitz-clean"') || presets.includes("slug: 'kitz-clean'")
);
check(
  'presets.ts 的 DEFAULT_TEMPLATE_SLUG 仍为 "t2-industrial"',
  /export const DEFAULT_TEMPLATE_SLUG = "t2-industrial";/.test(presets),
  "默认模板被改动 = 违反 G1/ADR-005"
);

// 条目数 = 12（每个预设的 slug 字段均为 4 空格缩进）
const slugMatches = presets.match(/^ {4}slug: "/gm) || [];
check("TEMPLATE_PRESETS 条目数 = 12", slugMatches.length === 12, `实际 ${slugMatches.length}`);

// 原 T1–T11 逐条 slug 仍在（不是只数条目）
const T1_T11 = [
  "t1-tech-blue",
  "t2-industrial",
  "t3-carbon-black",
  "t4-medical",
  "t5-education",
  "t6-ecommerce",
  "t7-finance",
  "t8-realestate",
  "t9-restaurant",
  "t10-creative",
  "unilok-industrial",
];
const missingSlugs = T1_T11.filter((s) => !presets.includes(`slug: "${s}"`));
check(
  "T1–T11 全部 11 个 slug 仍然存在",
  missingSlugs.length === 0,
  missingSlugs.length ? "缺失: " + missingSlugs.join(", ") : ""
);

// T11 原描述首句仍在（逐字）
check(
  "T11(unilok-industrial) description 首句仍在（逐字）",
  presets.includes(
    "description: \"深蓝主色 + 橙红点缀，白底洁净室质感，模仿韩国 UNILOK 阀门企业官网：全宽 Hero 轮播、大字标题+小字 eyebrow、L 形角标装饰、线框图标能力卡片、产品参数表，适合高端阀门/流体控制/半导体设备企业。\""
  )
);

// T11 的 theme / style / industries / sections 关键字面量仍在（抽样逐字）
check(
  "T11 theme 主色 #0F3460 / accent #E84C22 仍在",
  presets.includes('primary: "#0F3460"') && presets.includes('accent: "#E84C22"')
);
check(
  "T11 industries 行仍在（逐字）",
  presets.includes('industries: ["阀门", "流体控制", "半导体", "精密制造", "氢能", "生物医药"],')
);
check(
  "T11 sections 行仍在（逐字）",
  presets.includes('sections: ["hero", "whoweare", "capabilities", "products", "industries", "news", "cta"],')
);

// T12 关键字段
check('T12 category = "工业"（联合类型枚举内）', /slug: "kitz-clean",[\s\S]{0,400}?category: "工业",/.test(presets));
check("T12 name = 洁净科技风", presets.includes('name: "洁净科技风"'));
check("T12 nameEn = Clean Tech", presets.includes('nameEn: "Clean Tech"'));
check(
  "T12 theme 七个 hex 字段齐全",
  presets.includes('primary: "#123A6B"') &&
    presets.includes('primaryLight: "#2A5C99"') &&
    presets.includes('primaryDark: "#0B2748"') &&
    presets.includes('accent: "#0E7C86"') &&
    presets.includes('dark: "#111827"') &&
    presets.includes('darkLight: "#374151"')
);
check(
  "T12 style 六项 + radius/card 与要求一致",
  /slug: "kitz-clean",[\s\S]*?style: \{[\s\S]*?radius: "sharp",[\s\S]*?shadow: "soft",[\s\S]*?spacing: "spacious",[\s\S]*?fontScale: "normal",[\s\S]*?hero: "full",[\s\S]*?header: "solid",[\s\S]*?card: "bordered",[\s\S]*?cta: "solid",/.test(
    presets
  )
);

// T12 必须位于数组末尾（T11 之后）
const idxT11 = presets.indexOf('slug: "unilok-industrial"');
const idxT12 = presets.indexOf('slug: "kitz-clean"');
check("T12 位于 T11 之后（追加在数组末尾）", idxT11 > 0 && idxT12 > idxT11);

// ---------- 2) 常量与 active-theme.ts ----------
const activeTheme = read("lib/templates/active-theme.ts");
check("active-theme.ts 仍含 isUnilok（后向兼容）", activeTheme.includes("isUnilok"));
check("active-theme.ts 新增 isKitz", activeTheme.includes("isKitz"));
check(
  "active-theme.ts isUnilok 语义未变（=== UNILOK_SLUG）",
  activeTheme.includes("isUnilok: template === UNILOK_SLUG,")
);
check(
  "active-theme.ts isKitz 语义（=== KITZ_CLEAN_SLUG）",
  activeTheme.includes("isKitz: template === KITZ_CLEAN_SLUG,")
);
check(
  'active-theme.ts 导出 KITZ_CLEAN_SLUG = "kitz-clean"',
  /export const KITZ_CLEAN_SLUG = "kitz-clean";/.test(activeTheme)
);
check(
  "active-theme.ts 仍读 document.documentElement.dataset.template",
  activeTheme.includes("document.documentElement.dataset.template")
);

const getActive = read("lib/templates/get-active-template.ts");
check(
  'get-active-template.ts 导出 KITZ_CLEAN_SLUG = "kitz-clean"',
  /export const KITZ_CLEAN_SLUG = "kitz-clean";/.test(getActive)
);
check(
  'get-active-template.ts UNILOK_INDUSTRIAL_SLUG 原样保留',
  /export const UNILOK_INDUSTRIAL_SLUG = "unilok-industrial";/.test(getActive)
);

// ---------- 3) LayoutWrapper.tsx ----------
const lw = read("components/LayoutWrapper.tsx");
check("LayoutWrapper 仍 import UnilokHeader", lw.includes('import UnilokHeader from "@/components/theme-unilok/Header"'));
check("LayoutWrapper 仍 import Header", lw.includes('import Header from "@/components/layout/Header"'));
check("LayoutWrapper import KitzHeader", lw.includes('import KitzHeader from "@/components/theme-kitzsct/Header"'));
check("LayoutWrapper import KitzFooter", lw.includes('import KitzFooter from "@/components/theme-kitzsct/Footer"'));
check("LayoutWrapper 取用 isKitz", lw.includes("const { isUnilok, isKitz } = useActiveTemplate();"));
check(
  "LayoutWrapper 页头三分支 kitz / unilok / 默认",
  lw.includes("{isKitz ? <KitzHeader /> : isUnilok ? <UnilokHeader /> : <Header />}")
);
check(
  "LayoutWrapper 页脚三分支 kitz / unilok / 默认",
  lw.includes("{isKitz ? <KitzFooter /> : isUnilok ? <UnilokFooter /> : <Footer />}")
);

// ---------- 4) 8 个派发页 ----------
const dispatchPages = [
  "app/page.tsx",
  "app/products/page.tsx",
  "app/news/page.tsx",
  "app/contact/page.tsx",
  "app/about/page.tsx",
  "app/about/[section]/page.tsx",
  "app/products/[tab]/[id]/page.tsx",
  "app/news/[slug]/page.tsx",
];

for (const p of dispatchPages) {
  const src = read(p);
  check(`${p} 有 kitz 分支（KITZ_CLEAN_SLUG）`, src.includes("KITZ_CLEAN_SLUG"));
  check(`${p} 保留 force-dynamic`, src.includes('export const dynamic = "force-dynamic"'));
  check(`${p} 从 get-active-template 导入 KITZ_CLEAN_SLUG`, /import \{[^}]*KITZ_CLEAN_SLUG[^}]*\} from "@\/lib\/templates\/get-active-template"/.test(src));
  check(`${p} 未硬编码 slug 字面量 "kitz-clean"`, !src.includes('"kitz-clean"') && !src.includes("'kitz-clean'"));
}

// 每页必须仍保留 UNILOK 分支（不得改坏）
const unilokBranchChecks = {
  "app/page.tsx": "templateSlug === UNILOK_INDUSTRIAL_SLUG",
  "app/products/page.tsx": "templateSlug === UNILOK_SLUG",
  "app/news/page.tsx": "templateSlug === UNILOK_SLUG",
  "app/contact/page.tsx": "templateSlug === UNILOK_SLUG",
  "app/about/page.tsx": "templateSlug === UNILOK_SLUG",
  "app/about/[section]/page.tsx": "templateSlug === UNILOK_INDUSTRIAL_SLUG",
  "app/products/[tab]/[id]/page.tsx": "templateSlug === UNILOK_INDUSTRIAL_SLUG",
  "app/news/[slug]/page.tsx": "templateSlug === UNILOK_INDUSTRIAL_SLUG",
};
for (const [p, needle] of Object.entries(unilokBranchChecks)) {
  check(`${p} 保留原 UNILOK 分支（${needle}）`, read(p).includes(needle));
}

// ---------- 5) 两个详情页的 params 传递 ----------
const newsDetail = read("app/news/[slug]/page.tsx");
const prodDetail = read("app/products/[tab]/[id]/page.tsx");

check(
  "app/news/[slug] 仍透传 props.params（params={props.params as any}）",
  newsDetail.includes("params={props.params as any}") && newsDetail.includes("<KitzNewsDetailPage params={props.params as any} />")
);
check(
  "app/products/[tab]/[id] 仍使用 props.params（props.params.tab / .id）",
  prodDetail.includes("props.params.id") && prodDetail.includes("props.params.tab")
);
check(
  "app/products/[tab]/[id] kitz 分支与 UNILOK 分支一致（不传 props，契约 KitzProductDetailPage 无 props）",
  prodDetail.includes("{isKitz ? <KitzProductDetailPage /> : isUnilok ? <UnilokProductDetailPage /> : <ProductDetailClient />}")
);
check(
  "app/about/[section] kitz 分支透传 props.params",
  read("app/about/[section]/page.tsx").includes("<KitzAboutSectionPage params={props.params as any} />")
);

// ---------- 6) 11 个目标文件均存在 ----------
const targetFiles = [
  "lib/templates/presets.ts",
  "lib/templates/active-theme.ts",
  "components/LayoutWrapper.tsx",
  ...dispatchPages,
];
const missingFiles = targetFiles.filter((p) => !fs.existsSync(path.join(ROOT, p)));
check("11 个目标文件均存在", missingFiles.length === 0, missingFiles.join(", "));
check(
  "components/theme-kitzsct/ 目录当前是否存在（组件由他人并行编写，缺失属预期）",
  true,
  fs.existsSync(path.join(ROOT, "components/theme-kitzsct"))
    ? "存在（内容未由本任务验证）"
    : "尚不存在 —— tsc 报 cannot find module 属预期"
);

// ---------- 输出 ----------
console.log("=== scripts/_test_kitz_wiring.js （只读断言） ===");
console.log(results.join("\n"));
console.log(`\n合计: ${pass} 通过 / ${fail} 失败 / 共 ${pass + fail} 条`);
process.exit(fail === 0 ? 0 : 1);
