/**
 * 只读断言脚本：校验 components/theme-kitzsct/ 首页区块块（只读，不写任何文件）
 * 用法：node scripts/_test_kitz_home.js
 *
 * 断言三类：
 *  A. 10 个文件存在 + 导出名逐字正确
 *  B. 硬编码扫描为 0（品牌/联系方式/G2 词表 + 网址）
 *  C. 视频兜底：Hero 既有 <video 分支也有图片回退分支，且 <video 与 poster= 配套
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "components", "theme-kitzsct");

const EXPECTED = [
  ["KitzHome.tsx", "default function KitzHome()"],
  ["Hero.tsx", "default function KitzHero()"],
  ["ProductSearch.tsx", "default function KitzProductSearch()"],
  ["Downloads.tsx", "default function KitzDownloads()"],
  ["ValueProps.tsx", "default function KitzValueProps()"],
  ["Capabilities.tsx", "default function KitzCapabilities()"],
  ["ProductShowcase.tsx", "default function KitzProductShowcase()"],
  ["Industries.tsx", "default function KitzIndustries()"],
  ["NewsSection.tsx", "default function KitzNewsSection()"],
  ["CTASection.tsx", "default function KitzCTASection()"],
];

/** 契约中其它块交付的 5 个文件，本块**不得写**——只报告其存在性 */
const OTHER_BLOCK_FILES = ["Header.tsx", "Footer.tsx", "PageHero.tsx", "ProductCard.tsx", "CornerAccent.tsx"];

// G2 硬编码词表（大小写不敏感）+ 网址
// 说明：主题代号「KITZ」不在词表内 —— 它是**主题目录名**（theme-kitzsct），
//       不是品牌/联系方式硬编码；报告里单独给出其出现位置与性质说明。
const BANNED = [
  "VALTRIX", "valtrix", "左文科技", "ZUO WEN", "zuowen",
  "MPCVD", "金刚石",
  "http://", "https://", "www.",
];

let fail = 0;
const ok = (m) => console.log("  PASS  " + m);
const bad = (m) => { fail++; console.log("  FAIL  " + m); };

console.log("=== A. 文件与导出名 ===");
const files = {};
for (const [file, sig] of EXPECTED) {
  const p = path.join(DIR, file);
  if (!fs.existsSync(p)) { bad(file + " 不存在"); continue; }
  const src = fs.readFileSync(p, "utf8");
  files[file] = src;
  if (src.includes("export " + sig)) ok(file + "  →  export " + sig);
  else bad(file + " 缺少逐字导出「export " + sig + "」");
  if (/^\s*"use client";/m.test(src)) ok("  " + file + " 含 \"use client\"");
  else bad("  " + file + " 缺 \"use client\"");
}

console.log("\n=== A2. 契约中其它块的文件（只读观察，本块不得写） ===");
for (const f of OTHER_BLOCK_FILES) {
  const exists = fs.existsSync(path.join(DIR, f));
  console.log("  INFO  " + f + " : " + (exists ? "已存在" : "尚未交付"));
}

console.log("\n=== B. 硬编码扫描（应为 0） ===");
let hits = 0;
for (const [file, src] of Object.entries(files)) {
  src.split(/\r?\n/).forEach((line, i) => {
    for (const w of BANNED) {
      if (line.toLowerCase().includes(w.toLowerCase())) {
        hits++;
        bad(file + ":" + (i + 1) + " 命中「" + w + "」 → " + line.trim().slice(0, 90));
      }
    }
  });
}
if (hits === 0) ok("品牌/联系方式/网址词表命中 0 条");

console.log("\n=== B2. 违规多语言写法（locale === … 三元 / pickLang 自写取值）应为 0 ===");
let langHits = 0;
for (const [file, src] of Object.entries(files)) {
  src.split(/\r?\n/).forEach((line, i) => {
    if (/locale\s*===\s*['"]/.test(line) || /\bpickLang\b/.test(line)) {
      langHits++;
      bad(file + ":" + (i + 1) + " 命中违规多语言写法 → " + line.trim().slice(0, 90));
    }
  });
}
if (langHits === 0) ok("未使用 locale === … 三元 / pickLang");

console.log("\n=== C. Hero 视频兜底 ===");
const hero = files["Hero.tsx"] || "";
// 断言必须只看**真实 JSX**：注释里也会写 <video> / poster 字样，
// 不剥离注释会把「注释条数」当成「元素条数」，得到假阳性。
const heroCode = hero
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/)
  .map((l) => l.replace(/(^|\s)\/\/.*$/, ""))
  .join("\n");
const videoCount = (heroCode.match(/<video[\s>]/g) || []).length;
const posterCount = (heroCode.match(/poster=/g) || []).length;
const imgBranch = (heroCode.match(/<img[\s>]/g) || []).length;
console.log("  INFO  <video 出现次数 = " + videoCount + "，poster= 出现次数 = " + posterCount + "，<img 出现次数 = " + imgBranch);
if (videoCount >= 1) ok("存在 <video 分支"); else bad("缺少 <video 分支");
if (videoCount === posterCount && videoCount >= 1) ok("<video 与 poster= 一一配套");
else bad("<video(" + videoCount + ") 与 poster=(" + posterCount + ") 不配套");
if (imgBranch >= 1) ok("存在图片回退分支（<img）"); else bad("缺少图片回退分支");
for (const attr of ["muted", "loop", "playsInline", "autoPlay"]) {
  if (new RegExp("(^|\\s)" + attr + "(\\s|$|\\n)").test(hero)) ok("<video> 含 " + attr);
  else bad("<video> 缺 " + attr);
}
if (/video\s*\?/.test(hero) || /hasVideo/.test(hero)) ok("视频/图片走条件分支（有视频才渲染 <video>）");
else bad("未见「有视频才渲染」的条件分支");

console.log("\n=== C2. KitzHome 渲染顺序 ===");
const home = files["KitzHome.tsx"] || "";
const ORDER = ["KitzHero", "KitzProductSearch", "KitzDownloads", "KitzValueProps", "KitzCapabilities", "KitzProductShowcase", "KitzIndustries", "KitzNewsSection", "KitzCTASection"];
let cursor = -1, orderOk = true;
for (const name of ORDER) {
  const idx = home.indexOf("<" + name);
  if (idx < 0) { bad("KitzHome 未渲染 <" + name + " />"); orderOk = false; continue; }
  if (idx < cursor) { bad("KitzHome 顺序错误：" + name + " 出现位置早于前一项"); orderOk = false; }
  cursor = idx;
}
if (orderOk) ok("9 个区块按契约顺序渲染");

console.log("\n=== 结果 ===");
console.log(fail === 0 ? "ALL ASSERTIONS PASSED" : fail + " 条断言失败");
process.exit(fail === 0 ? 0 : 1);
