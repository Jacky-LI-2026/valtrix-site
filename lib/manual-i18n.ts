/**
 * 手册规格表的**英文渲染**（中文 → 英文）
 * ==========================================================================
 * owner 2026-10-07（`/products/selector` 英文版）：
 *   「这些在英文版，但还是显示中文」—— 规格表**列头**已经有手册自带的英文版（`columnsEn`），
 *   但**单元格数值**是手册原文中文（`I 微焊接`、`1/4" FMR 内螺纹面密封`、`真空 – 17.2 bar`…）。
 *
 * 口径：**只做术语级翻译，不发明数值**——
 *   · 数字、单位、尺寸、压力、温度一律**原样保留**（正则不碰它们）；
 *   · `PHRASES` 先按**整句**打补丁（例如 `依 O 形圈材料` → `per O-ring material`）；
 *   · `TERMS` 再逐词替换，**长词优先**（长度降序，避免 `面密封` 先吃掉 `金属面密封`）；
 *   · 替换点**自动补空格**（`不锈钢阀体` → `stainless steel body`，不是 `stainless steelbody`）；
 *   · 全角标点统一半角并补间距（`（）；，、：`）；
 *   · 表里没有的中文（将来手册新增行）**原样保留** —— 宁可露出中文，也不猜。
 *
 * 实测基数：`lib/manual-specs.ts` 里含中文的**不同**单元格值共 100 个 / 236 处，
 * 本表逐一覆盖（`_local_backup/_check_manual_en.js` 可复跑，要求「翻译后仍含中文 = 0」）。
 */

/** 整句 / 子句级补丁（长度降序应用；命中即整段替换） */
const PHRASES: [string, string][] = [
  ["BV1 切换 (3–7 通)", "BV1 switching (3–7 way)"],
  ["BV1 开关 (2 通)", "BV1 on/off (2-way)"],
  ["气体过滤器 系列总览", "Gas Filters — series overview"],
  ["依 O 形圈材料", "per O-ring material"],
  ["系列总览", "series overview"],
  ["仪表阀组", "instrument manifold"],
];

/** 术语表（**顺序不敏感：运行时按长度降序排**，长词先吃） */
const TERMS: [string, string][] = [
  // —— 端接 / 密封 ——
  ["金属垫片面密封", "metal gasket face seal"],
  ["金属对金属密封", "metal-to-metal seal"],
  ["公制卡套端接", "metric ferrule end"],
  ["内螺纹面密封", "female face seal"],
  ["外螺纹面密封", "male face seal"],
  ["液压成型波纹管", "hydraulic-formed bellows"],
  ["上填料二次密封", "upper-packing secondary seal"],
  ["高纯陶瓷滤芯", "high-purity ceramic element"],
  ["不锈钢滤芯", "stainless-steel element"],
  ["可旋转外螺纹", "swivel male"],
  ["金属面密封", "metal face seal"],
  ["整体外螺纹", "integral male"],
  ["卡套端接", "ferrule end"],
  ["六方棒料", "hex bar stock"],
  ["双卡套", "double-ferrule"],
  ["承插焊", "socket weld"],
  ["管对焊", "tube butt weld"],
  ["管螺纹", "pipe thread"],
  ["微焊接", "micro-weld"],
  ["长焊接", "long weld"],
  ["外螺纹", "male thread"],
  ["内螺纹", "female thread"],
  ["面密封", "face seal"],
  ["进出口同径", "same inlet/outlet size"],
  ["出口同入口", "outlet same as inlet"],
  ["同入口", "same as inlet"],
  ["卡套", "ferrule"],
  ["对焊", "butt weld"],
  ["插焊", "socket weld"],
  ["焊接", "weld"],
  ["螺纹", "thread"],
  ["端接", "end"],
  ["两孔", "2-hole"],
  ["锁定孔", "lock hole"],
  ["接头", "fitting"],
  ["O 形圈", "O-ring"],
  // —— 压力 / 温度 ——
  ["最大背压", "max back pressure"],
  ["材料待确认", "material TBD"],
  ["真空", "vacuum"],
  ["入口", "inlet"],
  ["出口", "outlet"],
  ["手动", "manual"],
  ["待确认", "TBD"],
  // —— 材料 / 结构 ——
  ["粉末烧结", "sintered powder"],
  ["石墨填料", "graphite packing"],
  ["不锈钢", "stainless steel"],
  ["滤芯", "element"],
  ["填料", "packing"],
  ["垫片", "gasket"],
  ["阀座", "seat"],
  ["阀体", "body"],
  ["阀组", "manifold"],
  ["石墨", "graphite"],
  ["密封", "seal"],
  // —— 性能 / 规格项 ——
  ["主要结构材料", "main construction material"],
  ["气动执行器", "pneumatic actuator"],
  ["过滤面积", "filter area"],
  ["流量系数", "flow coefficient"],
  ["开启压力", "cracking pressure"],
  ["工作压力", "working pressure"],
  ["工作温度", "working temp"],
  ["驱动方式", "actuation"],
  ["基本参数", "basic parameters"],
  ["工艺规范", "process spec"],
  ["内通径", "orifice"],
  ["泄露率", "leak rate"],
  ["泄漏率", "leak rate"],
  ["计量型", "metering"],
  ["调节型", "regulating"],
  ["高流量", "high flow"],
  ["耐热型", "heat-resistant"],
  ["条形", "bar"],
  ["圆形", "round"],
  ["开关", "on/off"],
  ["切换", "switching"],
  ["通径", "bore"],
  ["系列", "series"],
  ["同上", "as above"],
  ["标准", "standard"],
  ["可选", "optional"],
];

/** 全角 → 半角（只处理标点，绝不碰数字/字母），并按英文习惯补间距 */
const PUNCT: [RegExp, string][] = [
  [/（/g, " ("],
  [/）/g, ") "],
  [/；/g, "; "],
  [/，/g, ", "],
  [/、/g, ", "],
  [/：/g, ": "],
];

const ALNUM = /[A-Za-z0-9]/;

/** 把 `z` 全部替换成 `e`，并在**紧邻字母数字**的接缝处补空格（`不锈钢阀体` → `stainless steel body`） */
function replaceTerm(src: string, z: string, e: string): string {
  if (!src.includes(z)) return src;
  const firstAlnum = ALNUM.test(e[0] ?? "");
  const lastAlnum = ALNUM.test(e[e.length - 1] ?? "");
  let out = "";
  let i = 0;
  for (;;) {
    const p = src.indexOf(z, i);
    if (p < 0) {
      out += src.slice(i);
      break;
    }
    const prev = p > 0 ? src[p - 1] : "";
    const next = src[p + z.length] ?? "";
    const before = firstAlnum && ALNUM.test(prev) ? " " : "";
    const after = lastAlnum && ALNUM.test(next) ? " " : "";
    out += src.slice(i, p) + before + e + after;
    i = p + z.length;
  }
  return out;
}

/** 按长度降序（长词优先）应用一组替换 */
function applySorted(src: string, pairs: [string, string][]): string {
  let out = src;
  for (const [z, e] of [...pairs].sort((a, b) => b[0].length - a[0].length)) {
    out = replaceTerm(out, z, e);
  }
  return out;
}

/** 把手册原文单元格翻成英文（术语级；未覆盖的中文原样保留） */
export function manualCellToEn(zh: string): string {
  let out = String(zh ?? "");
  if (!out) return out;
  out = applySorted(out, PHRASES);
  out = applySorted(out, TERMS);
  for (const [re, e] of PUNCT) out = out.replace(re, e);
  return out
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** 兼容旧调用点（语义与 `manualCellToEn` 相同；整句补丁已并入 `PHRASES`） */
export const manualCellToEnSmart = manualCellToEn;

export default manualCellToEn;
