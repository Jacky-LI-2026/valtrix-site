#!/usr/bin/env node
/**
 * scripts/_test_style_wiring.js
 * ---------------------------------------------------------------------------
 * 「前台模板风格引擎」接线验收（**只读**：只读文件，绝不写任何文件）
 *
 * 背景：preset.style 的字段曾经是死代码 —— globals.css 里有整套
 * .tpl-* / .btn-primary 规则，但 components/** 里一次都没用过这些类名，
 * 且 data-hero/header/card/cta-style 四个属性只被写入、没有读取方。
 * 本脚本断言「字段取值 ⇄ CSS 规则 ⇄ 组件钩子」三者真的接通了。
 *
 * 运行：npx tsx scripts/_test_style_wiring.js
 *       （也可 node scripts/_test_style_wiring.js，本文件是纯 CJS、无 TS 语法）
 *
 * 断言清单：
 *   1  取值覆盖：9 个字段的全部真实取值都要有落点
 *         - hero/header/card/cta：必须有 [data-<field>-style="<value>"] 选择器
 *         - titleWeight：必须有 [data-title-weight="<value>"] 选择器
 *         - radius/shadow/spacing/fontScale：走 CSS 变量，改查 .tpl-* 规则 + 变量接线
 *   2  钩子已接：tpl-section/tpl-card/tpl-title/tpl-scaled 出现次数各 ≥ 1，
 *       且 tpl-section 次数 == 含 `<section` 的文件数
 *   3  不越界：components/theme-unilok/** 与 components/theme-kitzsct/**
 *       里 tpl-section|tpl-card|btn-primary|tpl-btn 出现次数 == 0
 *   4  遗留清空：app/globals.css 里 `[data-template="t` 出现次数 == 0
 *   5  变量型字段在 layout.tsx 里有映射表条目（缺条目会静默走兜底值）
 *   6  负向对照：把一条选择器的取值在内存里改成不存在的值，
 *       断言「1」确实会 FAIL ⇒ 证明这个检查真的有能力失败
 * ---------------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const PATHS = {
  presets: "lib/templates/presets.ts",
  css: "app/globals.css",
  layout: "app/layout.tsx",
  sectionsDir: "components/sections",
  layoutDir: "components/layout",
  themeDirs: ["components/theme-unilok", "components/theme-kitzsct"],
};

/** 9 个 style 字段；4 个变量型 + 4 个属性选择器型 + 1 个字重字段 */
const VARIABLE_FIELDS = ["radius", "shadow", "spacing", "fontScale"];
const ATTR_FIELDS = ["hero", "header", "card", "cta"];
/**
 * 字重字段（2026-09-15 新增）：属性名是 `data-title-weight`，
 * **不是** ATTR_FIELDS 那套 `data-<field>-style` 派生命名，故单独处理。
 * 背景：原本有 3 条写死模板 slug 的 .tpl-title 字重规则被删除（字重不在字段集内），
 * 现升级为真实字段 style.titleWeight，取值覆盖必须逐条核对到 CSS 落点。
 */
const TITLE_WEIGHT_FIELD = "titleWeight";
const TITLE_WEIGHT_ATTR = "data-title-weight";
const ALL_FIELDS = [...VARIABLE_FIELDS, ...ATTR_FIELDS, TITLE_WEIGHT_FIELD];

/** 变量型字段 → 承载它的 .tpl-* 规则锚点（类名 + 必须出现的变量接线） */
const VARIABLE_ANCHORS = {
  radius: { classes: ["tpl-card", "btn-primary", "tpl-btn", "tpl-input"], vars: ["border-radius: var(--radius)"] },
  shadow: { classes: ["tpl-card"], vars: ["box-shadow: var(--tpl-shadow)"] },
  spacing: { classes: ["tpl-section"], vars: ["padding-top: var(--section-pad)", "padding-bottom: var(--section-pad)"] },
  fontScale: { classes: ["tpl-scaled"], vars: ["font-size: calc(1em * var(--font-scale))"] },
};

const TPL_HOOKS = ["tpl-section", "tpl-card", "tpl-title", "tpl-scaled"];
const THEME_FORBIDDEN = ["tpl-section", "tpl-card", "btn-primary", "tpl-btn"];

/**
 * 「暂不实现」登记表 —— 允许某个取值没有视觉差异，但**必须同时满足**：
 *   ① 在此登记并写明原因；
 *   ② app/globals.css 的某个注释块里同时出现该取值的字面选择器
 *      （如 `[data-hero-style="split"]`）与标记词 `暂不实现`。
 * 只登记不改 CSS 注释 ⇒ 仍然 FAIL。
 * 设计意图：不允许用登记表偷偷掩盖真的漏做；豁免必须「有据可查」。
 *
 * ⚠️ 2026-09-15：**当前为空**。原本唯一的豁免 hero=split 已用纯 CSS
 *    （逻辑属性 inset-inline-start: 50% 分栏，不改 Hero.tsx 的 DOM）真正实现，
 *    登记与 CSS 注释里的「暂不实现」标记已一并删除 ⇒ split 现在是**真实覆盖**的取值。
 *    （项目铁律：豁免一旦被实现，必须立刻销账，否则检查会长期放水。）
 */
const DOCUMENTED_NOT_IMPLEMENTED = {};
const EXEMPT_MARKER = "暂不实现";

const results = [];
function check(id, title, ok, detail) {
  results.push({ id, title, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  [${id}] ${title}`);
  if (detail) {
    String(detail)
      .split("\n")
      .forEach((line) => console.log(`        ${line}`));
  }
}

function abs(p) {
  return path.join(ROOT, p);
}
function readText(p) {
  return fs.readFileSync(abs(p), "utf8");
}
function exists(p) {
  return fs.existsSync(abs(p));
}
/** 去掉 CSS 注释，避免注释里的文字干扰计数断言 */
function stripCssComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "");
}
/** 提取 CSS 注释块的正文（保留，用于校验「暂不实现」登记是否有据可查） */
function cssCommentBlocks(s) {
  const out = [];
  const re = /\/\*([\s\S]*?)\*\//g;
  let m;
  while ((m = re.exec(s)) !== null) out.push(m[1]);
  return out;
}
function countAll(haystack, needles) {
  let n = 0;
  for (const needle of needles) {
    const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    n += (haystack.match(re) || []).length;
  }
  return n;
}
function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 解析 lib/templates/presets.ts —— 枚举全部 style 字段的真实取值
// ---------------------------------------------------------------------------
function parsePresetStyleValues() {
  const src = readText(PATHS.presets);
  // 取所有 `style: { ... }` 块；类型声明块里是 `radius: string;`（无引号），
  // 预设块里是 `radius: "medium"`（有引号）⇒ 用「含带引号的 radius」过滤掉类型块
  const blocks = [];
  const re = /style:\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(src)) !== null) blocks.push(m[1]);
  const presetBlocks = blocks.filter((b) => /radius\s*:\s*["']/.test(b));

  const values = {};
  ALL_FIELDS.forEach((f) => (values[f] = new Set()));
  const missing = [];
  for (const b of presetBlocks) {
    for (const f of ALL_FIELDS) {
      const fm = b.match(new RegExp(`${f}\\s*:\\s*["']([^"']+)["']`));
      if (fm) values[f].add(fm[1]);
      else missing.push(f);
    }
  }
  const out = {};
  ALL_FIELDS.forEach((f) => (out[f] = Array.from(values[f]).sort()));
  return { count: presetBlocks.length, values: out, missing };
}

// ---------------------------------------------------------------------------
// 检查 1（可复用：负向对照要在改过的 CSS 上重跑同一份逻辑）
// ---------------------------------------------------------------------------
function evalCoverage(cssRaw, presetValues, opts = {}) {
  const label = opts.label || "取值覆盖";
  const css = stripCssComments(cssRaw);
  const comments = cssCommentBlocks(cssRaw);
  const lines = [];
  const problems = [];
  const exemptions = [];

  lines.push(`预设条数 = ${presetValues.count}`);
  for (const f of ALL_FIELDS) {
    lines.push(`  ${f.padEnd(10)} = ${presetValues.values[f].join(" | ")}`);
  }

  // (a) 属性选择器型：每个真实取值都要有 [data-<field>-style="<value>"]
  //     例外：登记在册 + CSS 注释里有据可查 ⇒ 计为「已登记未实现」，不算缺失
  for (const f of ATTR_FIELDS) {
    const vals = presetValues.values[f];
    const implemented = [];
    const exempted = [];
    const missing = [];
    for (const v of vals) {
      const sel = `[data-${f}-style="${v}"]`;
      if (css.includes(sel)) {
        implemented.push(v);
        continue;
      }
      const reason = DOCUMENTED_NOT_IMPLEMENTED[f] && DOCUMENTED_NOT_IMPLEMENTED[f][v];
      const documented =
        !!reason && comments.some((c) => c.includes(sel) && c.includes(EXEMPT_MARKER));
      if (documented) {
        exempted.push(v);
        exemptions.push({ field: f, value: v, reason });
      } else {
        missing.push(v);
      }
    }
    lines.push(
      `  [data-${f}-style] 已实现 ${implemented.length}/${vals.length}` +
        (implemented.length ? ` (${implemented.join(", ")})` : "") +
        (exempted.length ? `  | 已登记未实现 ${exempted.length} (${exempted.join(", ")})` : "") +
        (missing.length ? `  缺失: ${missing.join(", ")}` : "  ✅")
    );
    if (missing.length) problems.push(`字段 ${f} 缺属性选择器: ${missing.join(", ")}`);
  }

  // (a2) 字重字段：每个真实取值都要有 [data-title-weight="<value>"] 落点
  //      （属性名是 data-title-weight，不走上面的 data-<field>-style 派生）
  {
    const vals = presetValues.values[TITLE_WEIGHT_FIELD] || [];
    const implemented = vals.filter((v) => css.includes(`[${TITLE_WEIGHT_ATTR}="${v}"]`));
    const missingVals = vals.filter((v) => !implemented.includes(v));
    lines.push(
      `  [${TITLE_WEIGHT_ATTR}="…"] 已实现 ${implemented.length}/${vals.length}` +
        (implemented.length ? ` (${implemented.join(", ")})` : "") +
        (missingVals.length ? `  缺失: ${missingVals.join(", ")}` : "  ✅")
    );
    if (missingVals.length) {
      problems.push(`字段 ${TITLE_WEIGHT_FIELD} 缺属性选择器: ${missingVals.join(", ")}`);
    }
  }

  // (b) 变量型：必须有 .tpl-* 规则 + 变量接线
  for (const f of VARIABLE_FIELDS) {
    const a = VARIABLE_ANCHORS[f];
    const missClass = a.classes.filter((c) => !css.includes(`.${c}`));
    const missVar = a.vars.filter((v) => !css.includes(v));
    lines.push(
      `  ${f.padEnd(10)} → .tpl-* 规则 ${a.classes.join("/")}: ` +
        `${a.classes.length - missClass.length}/${a.classes.length}`
    );
    lines.push(
      `  ${f.padEnd(10)} → 变量接线 ${a.vars.length - missVar.length}/${a.vars.length}` +
        (missVar.length ? `  缺失: ${missVar.join(" , ")}` : "  ✅")
    );
    if (missClass.length) problems.push(`字段 ${f} 缺 .tpl-* 规则: ${missClass.join(", ")}`);
    if (missVar.length) problems.push(`字段 ${f} 缺变量接线: ${missVar.join(", ")}`);
  }

  if (problems.length) lines.push(`  ❌ ${label} 不通过：${problems.join(" ; ")}`);
  return { ok: problems.length === 0, lines, problems, exemptions };
}

// ===========================================================================
// 主流程
// ===========================================================================
console.log("=".repeat(78));
console.log("前台模板风格引擎 · 接线验收（只读）");
console.log(`项目根: ${ROOT}`);
console.log("=".repeat(78));

for (const p of Object.values(PATHS).filter((x) => typeof x === "string")) {
  if (!exists(p)) {
    console.log(`FAIL  [0] 缺少必需文件: ${p}`);
    process.exit(1);
  }
}

const presetData = parsePresetStyleValues();
const cssRaw = readText(PATHS.css);

console.log("\n--- 9 个 style 字段的真实取值枚举（来源 lib/templates/presets.ts）---");
const coverage = evalCoverage(cssRaw, presetData, { label: "取值覆盖" });
coverage.lines.forEach((l) => console.log(l));
console.log("");

check(
  "1",
  "取值覆盖：9 个字段的全部真实取值都有落点（缺一个即 FAIL；已登记「暂不实现」者除外）",
  coverage.ok,
  [
    coverage.ok ? "全部真实取值均有 CSS 落点" : coverage.problems.join(" ; "),
    coverage.exemptions.length
      ? `已登记「暂不实现」的取值（${coverage.exemptions.length} 个，均有 CSS 注释佐证）:\n` +
        coverage.exemptions
          .map((e) => `  - ${e.field}=${e.value}：${e.reason}`)
          .join("\n")
      : "无「暂不实现」取值（所有取值均已实现视觉差异）",
  ].join("\n")
);

// ---------------------------------------------------------------------------
// 检查 2：钩子已接
// ---------------------------------------------------------------------------
const hookFiles = [];
for (const f of fs.readdirSync(abs(PATHS.sectionsDir))) {
  if (/\.tsx$/.test(f)) hookFiles.push(path.join(abs(PATHS.sectionsDir), f));
}
for (const f of ["Header.tsx", "Footer.tsx"]) {
  const p = path.join(abs(PATHS.layoutDir), f);
  if (fs.existsSync(p)) hookFiles.push(p);
}

const hookCounts = {};
TPL_HOOKS.forEach((h) => (hookCounts[h] = 0));
const filesWithSection = [];
const perFile = [];
/**
 * 只统计**真正的 className 用法**，不统计注释里的字面量。
 * ⚠️ 2026-09-15 修：上一版直接 `txt.match(new RegExp(h,'g'))`，把注释里的 `tpl-section`
 *    也数了进去 —— 我在 Hero.tsx 里加了一段解释「为什么刻意不挂 tpl-section」的注释，
 *    脚本立刻把该文件的计数从 1 变成 2，检查 2 假 FAIL。
 *    （同类缺陷本项目已踩过一次：主题树单测把注释里的 `<video>` 当成真实渲染节点。）
 * 判据：把文件里的注释剥掉后再数；**不做更聪明的解析**，只求"注释不算数"。
 */
function stripCommentsForCounting(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ") // JSX 注释 {/* ... */}
    .replace(/\/\*[\s\S]*?\*\//g, " ")     // 块注释
    .replace(/^\s*\/\/.*$/gm, " ")          // 整行行注释
    .replace(/([^:'"`])\/\/[^\n]*$/gm, "$1 "); // 行尾注释（避开 http:// 这类）
}
for (const file of hookFiles) {
  const txt = fs.readFileSync(file, "utf8");
  const code = stripCommentsForCounting(txt);
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const counts = {};
  for (const h of TPL_HOOKS) {
    counts[h] = (code.match(new RegExp(h, "g")) || []).length;
    hookCounts[h] += counts[h];
  }
  const hasSection = /<section/.test(code);
  if (hasSection) filesWithSection.push(rel);
  perFile.push(
    `${rel.padEnd(38)} tpl-section=${counts["tpl-section"]} tpl-card=${counts["tpl-card"]} ` +
      `tpl-title=${counts["tpl-title"]} tpl-scaled=${counts["tpl-scaled"]}` +
      (hasSection ? "   <section ✓" : "")
  );
}

const hookDetail = [
  ...perFile,
  "",
  `合计: ` + TPL_HOOKS.map((h) => `${h}=${hookCounts[h]}`).join("  "),
  `含 <section 的文件数 = ${filesWithSection.length}  →  ${filesWithSection.join(", ")}`,
  `tpl-section 出现次数 = ${hookCounts["tpl-section"]}`,
];
const eachAtLeastOne = TPL_HOOKS.every((h) => hookCounts[h] >= 1);
// ⚠️ 2026-09-15 修订：**Hero 刻意不挂 `tpl-section`**（登记例外，不是漏挂）。
//    原因（浏览器实测）：Hero 是全幅 banner，内容容器自带 `py-20 md:py-28`(112px)，
//    再叠 `.tpl-section` 的 `padding: var(--section-pad)` 会双重内边距 ——
//    实测 t2 上下各 200px / t3 上下各 224px，Hero 高度 864→912px。已改为只保留 `tpl-hero`。
//    ⇒ 断言从「相等」放宽为「相等 - 已登记例外数」，**例外必须逐条登记，不能靠放宽蒙混**。
const SECTION_HOOK_EXCEPTIONS = ["components/sections/Hero.tsx"];
const expectedSectionHooks = filesWithSection.length - SECTION_HOOK_EXCEPTIONS.filter((f) => filesWithSection.includes(f)).length;
const sectionMatches = hookCounts["tpl-section"] === expectedSectionHooks;
check(
  "2",
  "钩子已接：四个钩子各 ≥1 次，且 tpl-section 次数 == 含 <section 的文件数 − 已登记例外",
  eachAtLeastOne && sectionMatches,
  hookDetail
    .concat([
      `已登记不挂 tpl-section 的例外 = ${SECTION_HOOK_EXCEPTIONS.join(", ") || "（无）"}`,
      `期望 tpl-section 次数 = ${expectedSectionHooks}（含 <section 文件数 ${filesWithSection.length} − 例外 ${filesWithSection.length - expectedSectionHooks}）`,
    ])
    .join("\n")
);

// ---------------------------------------------------------------------------
// 检查 3：没有把钩子接到主题树（防止越界）
// ---------------------------------------------------------------------------
const themeReport = [];
let themeViolations = 0;
for (const dir of PATHS.themeDirs) {
  const files = walkFiles(abs(dir));
  let n = 0;
  const hits = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    const c = countAll(txt, THEME_FORBIDDEN);
    if (c > 0) {
      hits.push(`${path.relative(ROOT, f).replace(/\\/g, "/")} (${c})`);
      n += c;
    }
  }
  themeViolations += n;
  themeReport.push(
    `${dir}: 扫描 ${files.length} 个文件, 命中 ${n} 次` + (hits.length ? `  ← ${hits.join(", ")}` : "  ✅")
  );
}
check(
  "3",
  "没有把钩子接到主题树：theme-unilok / theme-kitzsct 里钩子出现次数 == 0",
  themeViolations === 0,
  themeReport.join("\n")
);

// ---------------------------------------------------------------------------
// 检查 4：遗留写死 slug 规则已清空
// ---------------------------------------------------------------------------
const cssNoComment = stripCssComments(cssRaw);
const legacyTotal = (cssRaw.match(/\[data-template="t/g) || []).length;
const legacyInRules = (cssNoComment.match(/\[data-template="t/g) || []).length;
check(
  "4",
  '遗留写死规则已清：app/globals.css 里 `[data-template="t` 出现次数 == 0',
  legacyTotal === 0 && legacyInRules === 0,
  `原始计数（含注释）= ${legacyTotal}；去 CSS 注释后计数 = ${legacyInRules}（断言依据后者）`
);

// ---------------------------------------------------------------------------
// 检查 5：变量型字段在 layout.tsx 里有映射表条目
// ---------------------------------------------------------------------------
const layoutSrc = readText(PATHS.layout);
const mapSpec = {
  radius: { map: "radiusMap", anchor: "radiusMap" },
  spacing: { map: "padMap", anchor: "padMap" },
  fontScale: { map: "scaleMap", anchor: "scaleMap" },
  shadow: { map: "shadowMap", anchor: "shadowMap" },
};
const layoutLines = [];
const layoutProblems = [];
for (const f of VARIABLE_FIELDS) {
  const vals = presetData.values[f];
  // 抓 layout.tsx 里对应的映射表对象字面量内容
  const re = new RegExp(`${mapSpec[f].map}\\s*:\\s*Record<string,\\s*[^>]+>\\s*=\\s*\\{([\\s\\S]*?)\\}`);
  const m = layoutSrc.match(re);
  if (!m) {
    layoutProblems.push(`${f}: 未找到 ${mapSpec[f].map} 映射表`);
    layoutLines.push(`${f.padEnd(10)} ❌ 未找到 ${mapSpec[f].map}`);
    continue;
  }
  const body = m[1];
  const covered = vals.filter((v) => new RegExp(`\\b${v}\\s*:`).test(body));
  const miss = vals.filter((v) => !covered.includes(v));
  layoutLines.push(
    `${f.padEnd(10)} ${mapSpec[f].map}: 覆盖 ${covered.length}/${vals.length}` + (miss.length ? `  缺: ${miss.join(", ")}` : "  ✅")
  );
  if (miss.length) layoutProblems.push(`${f}: ${mapSpec[f].map} 缺 ${miss.join(", ")}`);
}
check(
  "5",
  "变量型字段在 app/layout.tsx 的映射表里都有条目（缺条目会静默走兜底值）",
  layoutProblems.length === 0,
  layoutLines.join("\n")
);

// ---------------------------------------------------------------------------
// 检查 6：负向对照 —— 证明检查「1」真的有能力失败
// ---------------------------------------------------------------------------
const probeField = "card";
const probeValue = "gradient";
const probeFrom = `[data-${probeField}-style="${probeValue}"]`;
const probeTo = `[data-${probeField}-style="__definitely_not_a_real_value__"]`;
const mutatedCss = cssRaw.split(probeFrom).join(probeTo);
const mutationApplied = mutatedCss !== cssRaw;
const negative = evalCoverage(mutatedCss, presetData, { label: "负向对照" });
check(
  "6",
  "负向对照：把一条规则的选择器改成不存在的值后，检查「1」必须 FAIL",
  mutationApplied && negative.ok === false,
  [
    `替换: ${probeFrom}  →  ${probeTo}`,
    `替换已生效 = ${mutationApplied}（仅在内存中做字符串替换，未写文件）`,
    `负向对照下检查「1」结果 = ${negative.ok ? "PASS（❌ 说明检查没有失败能力）" : "FAIL（✅ 符合预期）"}`,
    `负向对照检出的问题: ${negative.problems.join(" ; ")}`,
  ].join("\n")
);

// ---------------------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
console.log("\n" + "=".repeat(78));
console.log(`汇总: ${results.length - failed.length}/${results.length} 项通过`);
results.forEach((r) => console.log(`  ${r.ok ? "PASS" : "FAIL"}  [${r.id}] ${r.title}`));
console.log("=".repeat(78));

if (failed.length) {
  console.log(`\n结果: FAIL（${failed.length} 项未通过）`);
  process.exit(1);
}
console.log("\n结果: PASS（全部通过）");
process.exit(0);
