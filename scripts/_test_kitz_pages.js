/**
 * 临时只读验收脚本（theme-kitzsct 内页）
 * =====================================
 * 只读扫描，不写任何文件；退出码 0 = 全部断言通过。
 *
 * 运行：node scripts/_test_kitz_pages.js
 *
 * 断言：
 *   A. 7 个交付文件存在
 *   B. 每个文件的 default export 名称逐字一致
 *   C. 两个带 params 的组件：props 形状（interface PageProps + 解构 { params }: PageProps）
 *   D. 契约对齐：KitzNewsDetailPage 用 params.slug、KitzAboutSectionPage 用 params.section
 *      （派发页原样透传 props.params，形状写错会静默变成 undefined）
 *   E. "use client" 指令存在
 *   F. 硬编码扫描：品牌/行业词表 + 网址
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "components", "theme-kitzsct");

let pass = 0;
let fail = 0;
const failures = [];

function ok(label, extra) {
  pass++;
  console.log(`PASS  ${label}${extra ? "  " + extra : ""}`);
}
function bad(label, detail) {
  fail++;
  failures.push(`${label} :: ${detail}`);
  console.log(`FAIL  ${label}  -> ${detail}`);
}
function assert(cond, label, detail) {
  if (cond) ok(label);
  else bad(label, detail);
}

/** 归一化：去掉多余空白，便于对签名做逐字比对 */
function normalize(src) {
  return src.replace(/\s+/g, " ");
}

// ---------------------------------------------------------------- A. 文件存在
const FILES = [
  "ProductsPage.tsx",
  "ProductDetailPage.tsx",
  "NewsPage.tsx",
  "NewsDetailPage.tsx",
  "AboutPage.tsx",
  "AboutSectionPage.tsx",
  "ContactPage.tsx",
];

console.log("== A. 文件存在 ==");
const sources = {};
for (const f of FILES) {
  const p = path.join(DIR, f);
  const exists = fs.existsSync(p);
  assert(exists, `exists: ${f}`, `未找到 ${p}`);
  if (exists) sources[f] = fs.readFileSync(p, "utf8");
}

// ------------------------------------------------- B/C/D/E. 导出签名与 props
console.log("\n== B. default export 名称逐字一致 ==");
const SIG = {
  "ProductsPage.tsx": "export default function KitzProductsPage()",
  "ProductDetailPage.tsx": "export default function KitzProductDetailPage()",
  "NewsPage.tsx": "export default function KitzNewsPage()",
  "NewsDetailPage.tsx":
    "export default function KitzNewsDetailPage({ params }: PageProps)",
  "AboutPage.tsx": "export default function KitzAboutPage()",
  "AboutSectionPage.tsx":
    "export default function KitzAboutSectionPage({ params }: PageProps)",
  "ContactPage.tsx": "export default function KitzContactPage()",
};
for (const f of FILES) {
  const src = sources[f];
  if (src === undefined) continue;
  assert(
    normalize(src).includes(SIG[f]),
    `signature: ${SIG[f]}`,
    `文件中未找到该签名（归一化空白后逐字比对）`
  );
}

console.log("\n== C. props 形状（带 params 的两个组件） ==");
const SHAPE = [
  {
    file: "NewsDetailPage.tsx",
    iface: /interface PageProps \{ params: \{ slug: string \};? \}/,
    ifaceText: "interface PageProps { params: { slug: string } }",
    prop: "slug",
  },
  {
    file: "AboutSectionPage.tsx",
    iface: /interface PageProps \{ params: \{ section: string \};? \}/,
    ifaceText: "interface PageProps { params: { section: string } }",
    prop: "section",
  },
];
for (const s of SHAPE) {
  const src = sources[s.file];
  if (src === undefined) continue;
  assert(
    s.iface.test(normalize(src)),
    `PageProps 形状: ${s.file} -> params.${s.prop}`,
    `未找到 "${s.ifaceText}"`
  );
  assert(
    normalize(src).includes(`({ params }: PageProps)`),
    `props 解构: ${s.file} -> ({ params }: PageProps)`,
    `未找到解构签名（派发页透传 props.params，形状必须一致）`
  );
}

console.log("\n== D. 契约对齐：实际读取的 params 字段 ==");
assert(
  /params\??\.slug/.test(sources["NewsDetailPage.tsx"] || ""),
  "KitzNewsDetailPage 读取 params.slug",
  "未发现 params.slug 读取"
);
assert(
  /params\??\.section/.test(sources["AboutSectionPage.tsx"] || ""),
  "KitzAboutSectionPage 读取 params.section",
  "未发现 params.section 读取"
);
// 反向断言：不得出现「接收 params 却去读另一个字段」的错配
assert(
  !/params\??\.section/.test(sources["NewsDetailPage.tsx"] || ""),
  "KitzNewsDetailPage 不误读 params.section",
  "出现了 params.section（字段错配）"
);
assert(
  !/params\??\.slug/.test(sources["AboutSectionPage.tsx"] || ""),
  "KitzAboutSectionPage 不误读 params.slug",
  "出现了 params.slug（字段错配）"
);

console.log('\n== E. "use client" 指令 ==');
for (const f of FILES) {
  const src = sources[f];
  if (src === undefined) continue;
  assert(/^"use client";/m.test(src), `use client: ${f}`, "缺少 use client 指令");
}

// ------------------------------------------------------------- F. 硬编码扫描
console.log("\n== F. 硬编码扫描（词表 + 网址） ==");
const TOKENS = [
  "VALTRIX",
  "valtrix",
  "左文科技",
  "ZUO WEN",
  "zuowen",
  "MPCVD",
  "金刚石",
  "kitzsct",
];
// 域名/网址：http(s):// 或裸域名（含常见 TLD）
const URL_RE =
  /https?:\/\/|(?:^|[^@\w.\/-])(?:www\.)?[a-z0-9][a-z0-9-]*\.(?:com|cn|net|org|io|co|jp|de|ru|info|biz)\b/i;

let tokenHits = 0;
let urlHits = 0;
for (const f of FILES) {
  const src = sources[f];
  if (src === undefined) continue;
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const tok of TOKENS) {
      if (line.includes(tok)) {
        tokenHits++;
        console.log(`HIT   ${f}:${i + 1}  词表[${tok}]  ${line.trim().slice(0, 120)}`);
      }
    }
    if (URL_RE.test(line)) {
      urlHits++;
      console.log(`HIT   ${f}:${i + 1}  网址正则      ${line.trim().slice(0, 120)}`);
    }
  });
}
assert(tokenHits === 0, "词表命中数 = 0", `命中 ${tokenHits} 处（见上方 HIT 行）`);
assert(urlHits === 0, "网址命中数 = 0", `命中 ${urlHits} 处（见上方 HIT 行）`);

// ------------------------------------------------------------------- 汇总
console.log("\n================ 汇总 ================");
console.log(`PASS: ${pass}   FAIL: ${fail}`);
if (fail > 0) {
  console.log("失败明细：");
  failures.forEach((f) => console.log("  - " + f));
}
process.exit(fail === 0 ? 0 : 1);
