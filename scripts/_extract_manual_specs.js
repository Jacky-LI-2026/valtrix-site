#!/usr/bin/env node
/**
 * 从各"品类目录页"原型里**取出数值**，生成 `lib/manual-specs.ts`
 * ==========================================================================
 * owner 2026-10-06：「不要加工图片，只把数值取出即可」
 * 数据源：`产品手册/html版/<品类>目录页/<品类>目录页.html` 里的
 *   · `const SERIES = [...]` —— 每系列：名称/说明/型号示例/维度取值/`rows`（**数值规格表**）
 *   · `const FACETS = [...]` —— 该品类的筛选维度与可选值
 *   · `I18N.zh.th` —— 规格表列头
 * 这些是**手册数值的数字化形式**（不是我们加工出来的），本脚本只做搬运与结构化。
 *
 * 用法：node scripts/_extract_manual_specs.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const BASE = "D:/业务类/2-配件供应商/芯阀/品牌代理模型/产品手册/html版";
const OUT = path.resolve(__dirname, "../lib/manual-specs.ts");

const dirs = fs.readdirSync(BASE).filter((d) => d.includes("目录页") && d !== "产品目录页");

/** 安全求值页面里的字面量数组/对象（只允许纯数据） */
function evalLiteral(src) {
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`"use strict"; return (${src});`)();
  } catch {
    return null;
  }
}

function pickBlock(html, name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);`);
  const m = html.match(re);
  return m ? m[1] : null;
}

const CAT_KEY = {
  "接头目录页": "fittings",
  "隔膜阀目录页": "diaphragm",
  "球阀目录页": "ball",
  "针阀目录页": "needle",
  "波纹管阀目录页": "bellows",
  "减压阀目录页": "regulator",
  "单向阀目录页": "check",
  "计量阀目录页": "metering",
  "过滤器目录页": "filter",
  "阀组目录页": "manifold",
};

const out = [];
for (const d of dirs) {
  const key = CAT_KEY[d];
  const f = path.join(BASE, d, `${d}.html`);
  if (!key || !fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, "utf8");

  const seriesArr = evalLiteral(pickBlock(html, "SERIES") || "null");
  const facetsArr = evalLiteral(pickBlock(html, "FACETS") || "null");
  // 列头：全文找第一个 `th:[...]`（各页 zh 块位置不同，故不限定窗口）
  const thM = html.match(/th:\s*\[([^\]]+)\]/);
  const th = thM ? thM[1].split(",").map((s) => s.trim().replace(/^'|'$/g, "").replace(/^"|"$/g, "")) : [];

  if (!Array.isArray(seriesArr)) {
    console.log(`  ⚠ ${d}：未取到 SERIES`);
    continue;
  }
  out.push({
    category: key,
    source: `${d}/${d}.html`,
    columns: th,
    facets: (facetsArr || []).map((x) => ({ key: x.key, items: x.items || [] })),
    series: seriesArr.map((s) => ({
      id: s.id,
      nameZh: s.zh?.name || "",
      nameEn: s.en?.name || "",
      formsZh: s.zh?.forms || "",
      formsEn: s.en?.forms || "",
      models: s.models || [],
      /** 该系列在手册里的**数值规格表**（列头见 category.columns） */
      rows: s.rows || [],
      /** 维度取值（手册原文代号） */
      dims: Object.fromEntries(
        Object.entries(s).filter(([k, v]) => Array.isArray(v) && !["models", "rows"].includes(k)).map(([k, v]) => [k, v])
      ),
    })),
  });
  console.log(
    `  ✓ ${d} → ${key}：系列 ${seriesArr.length}，列头 [${th.join(" | ")}]，行数 ${seriesArr.reduce((n, s) => n + (s.rows?.length || 0), 0)}`
  );
}

const body = `/**
 * 手册**数值规格表**（自动生成，勿手改）
 * ==========================================================================
 * 由 \`scripts/_extract_manual_specs.js\` 从 \`产品手册/html版/<品类>目录页/*.html\` 抽出：
 *   · 每系列：名称 / 说明 / 型号示例 / 维度取值 / **rows（数值规格表）**
 *   · 每品类：规格表列头（columns）+ 筛选维度（facets）
 * owner 口径（2026-10-06）：**规格与细分严格从 PDF 手册取**；本文件即"手册数值"的唯一来源，
 * 不用图片加工，只搬运数值。重新抽取：\`node scripts/_extract_manual_specs.js\`
 */

export interface ManualSeriesSpec {
  id: string;
  nameZh: string;
  nameEn: string;
  formsZh: string;
  formsEn: string;
  models: string[];
  /** 数值规格表的行：值与 \`ManualCategorySpec.columns\` 一一对应 */
  rows: string[][];
  dims: Record<string, string[]>;
}

export interface ManualCategorySpec {
  /** 与 lib/manual-catalog.ts 的品类 key 对应 */
  category: string;
  /** 来源文件（便于回溯手册页） */
  source: string;
  /** 规格表列头（手册原文） */
  columns: string[];
  /** 该品类的筛选维度与可选值（手册原文代号） */
  facets: { key: string; items: string[] }[];
  series: ManualSeriesSpec[];
}

export const MANUAL_SPECS: ManualCategorySpec[] = ${JSON.stringify(out, null, 2)};

/** 按系列代号取手册规格（如 \`DV1\`、\`BV2\`、\`FT4\`） */
export function findSeriesSpec(seriesId: string): { category: ManualCategorySpec; series: ManualSeriesSpec } | null {
  const t = String(seriesId || "").toUpperCase();
  for (const c of MANUAL_SPECS) for (const s of c.series) if (s.id.toUpperCase() === t) return { category: c, series: s };
  return null;
}
`;

fs.writeFileSync(OUT, body);
console.log(`\n已写出 ${OUT}（${body.length} 字符，${out.length} 个品类）`);
