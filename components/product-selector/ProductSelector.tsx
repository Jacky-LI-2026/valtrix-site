"use client";

/**
 * 产品快速选型器（插件 product-selector 的前台主体）
 * ==========================================================================
 * owner 2026-10-07：
 *   「"D:\业务类\...\产品手册\html版\所有产品页\所有产品页.html" 按这个所有产品页的原型方式重构」
 *
 * **版式来源**：`产品手册/html版/所有产品页/所有产品页.html`
 *   · 样式 = 原型 <style> 原样移植到 `app/globals.css` 的 `#vs-all` 作用域块
 *     （种子脚本 `scripts/_port_allproducts_css.js`，变量与数值逐条未改）；
 *   · 本组件只用原型自己的类名，不另造视觉：
 *     面包屑 `.crumb` → Hero `.hero/.kicker/h1/.desc/.searchbar/.stats/.stat`
 *     → 主体 `.main`（左 `.facets/.fg/.opt/.rg` 粘性筛选栏 + 右 `.results`）
 *     → 结果条 `.bar` → 每品类 `.cathead` → 每系列 `.group`（`.ghead` + `.gbody`
 *       = 左 `.thumb` 图 + 右 `.ginfo`（`.chips` 型号片段 + `.ptable` 规格表））
 *     → 空态 `.empty` → 型号解读 `.explain` → 服务中心 `.svc` → 安全提示 `.safety` → `.toast`。
 *
 * **数据来源（owner 口径：规格与细分严格从 PDF 手册取）**：
 *   · 品类 / 系列 / 列头 / **数值规格行** 全部来自 `lib/manual-specs.ts`
 *     （由 `scripts/_extract_manual_specs.js` 从各"品类目录页"原型抽出，未加工）；
 *   · 品类中英文名、分组顺序来自 `lib/manual-catalog.ts`。
 *
 * **与产品中心关联**：另外拉 `/api/public/products` 拿到官网在售产品，
 *   用 `matchManualSeries()` 把官网型号归到手册系列上 ⇒ 每组显示官网在售图/型号，
 *   型号可直接跳产品详情页、也可一键加入询价车（`lib/quote-cart.ts`）。
 *
 * 说明：站点自身的顶栏/页脚由 layout 提供，故不重复原型里那份独立 `.topbar` 与 `<footer>`。
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { addToQuoteCart } from "@/lib/quote-cart";
import { MANUAL_CATEGORIES, MANUAL_GROUPS, matchManualSeries } from "@/lib/manual-catalog";
import { MANUAL_SPECS } from "@/lib/manual-specs";
import { manualCellToEn } from "@/lib/manual-i18n";
import PageHero from "@/components/ui/PageHero";

/* ==========================================================================
   一、界面文案（**中文 + 英文两套**）
   ==========================================================================
   owner 2026-10-07：「完善此页面中英文多语种，**非中文语种自动跳转英文**」
   ⇒ 只维护 zh / en 两套；ja / ko / fr / ar 等一律回退英文（不显示半成品翻译，也不回退中文）。
      组件内用 `isZh` 统一判定（见 `ProductSelector()` 里 `const isZh = locale === "zh"`）。
   ========================================================================== */
const T: Record<string, Record<string, string>> = {
  zh: {
    crumbHome: "首页", crumbCat: "产品中心", crumbCur: "快速选型",
    kicker: "ALL PRODUCTS · 所有产品",
    title: "高纯管阀件全产品目录",
    desc: "接头、隔膜阀、减压阀、单向阀、计量阀、过滤器、球阀、针阀、波纹管阀与阀组全部系列集中展示，支持多维筛选与型号搜索。316L 不锈钢锻件/棒料，电解抛光表面，GP / HP / UHP 工艺规范。",
    ph: "搜索型号，如 DV12A / PRE1C / FT4 / 316L-CEJ",
    st1: "产品品类", st1s: "接头 · 阀门 · 过滤器 · 阀组",
    st2: "系列", st2s: "I/B/G/O · ALD · DV1–7 · PRE/PRT 等",
    st3: "型号", st3s: "覆盖端口 / 驱动 / 阀座 / 洁净度组合",
    st4: "材料体系", st4s: "316L · 6V (VAR) · 6VV (VIM-VAR) · 316",
    show: "显示", units: "个型号", reset: "重置筛选",
    empty: "未找到匹配产品，请调整筛选条件或搜索词。",
    fCat: "类别", fMat: "材料", fPress: "压力范围 (bar)", fSize: "端口尺寸", fClean: "洁净工艺", fDrive: "驱动方式",
    pressPh: "最大 bar，如 100", sizePh: "最大尺寸", sizeUnit: "单位：", mm: "mm", inch: "inch",
    explainT: "型号解读 · 代码即产品",
    explainP: "VALTRIX 型号由「材料前缀 + 系列 + 端口/驱动/阀座/洁净度」各段依次排列组成，读懂规则即可自助确认型号：",
    exK1: "材料前缀",
    exK2: "系列 · 流道",
    exK3: "功能段", exD3: "入口 – 出口 – 其余端口 – 驱动 – 阀座 – 洁净度，依系列而定（端口 FMR / MR / SMR / TB / F 等）",
    exNote: "数据依据 2026-10-04 版《高纯管阀件》产品手册；标「待确认」的参数项为手册未披露，确认后统一更新。",
    svcP: "您当地的 VALTRIX 授权销售与服务中心可能有其他选项与定制方案。",
    svcBtn: "联系我们",
    safetyT: "安全的产品选择",
    safetyP: "选择产品时必须考虑总体系统设计，以保证安全、无故障的性能。功能、材料兼容性、充分的额定值、正确的安装、使用和维护是系统设计者和用户的重要责任。请勿将 VALTRIX 产品或不符合工业设计标准的元件与其他制造商的产品或元件混用/互换。",
    inSale: "官网在售", addCart: "加入询价车", added: "已加入", detail: "查看产品详情",
    copyHint: "手册示例型号（点击复制）", copied: "已复制型号", noSite: "官网暂无对应型号",
    pending: "待确认", fromManual: "规格取自产品手册",
    dMan: "手动", dNC: "常闭气动 NC", dNO: "常开气动 NO",
    dMNC: "常闭气动 M5/10-32", dMNO: "常开气动 M5/10-32", dPneu: "气动执行器可选",
  },
  en: {
    crumbHome: "Home", crumbCat: "Products", crumbCur: "Quick Selector",
    kicker: "ALL PRODUCTS · CATALOG",
    title: "High-Purity Valves & Fittings Catalog",
    desc: "All series of fittings, diaphragm, regulator, check, metering, filter, ball, needle, bellows valves and manifolds in one view, with multi-facet filtering and part-number search. 316L stainless forgings/bar, electropolished, GP / HP / UHP clean specs.",
    ph: "Search part no., e.g. DV12A / PRE1C / FT4 / 316L-CEJ",
    st1: "Categories", st1s: "Fittings · Valves · Filters · Manifolds",
    st2: "Series", st2s: "I/B/G/O · ALD · DV1–7 · PRE/PRT etc.",
    st3: "Part numbers", st3s: "Covering port / drive / seat / clean combos",
    st4: "Materials", st4s: "316L · 6V (VAR) · 6VV (VIM-VAR) · 316",
    show: "Showing", units: "models", reset: "Reset",
    empty: "No matching products. Adjust the filters or the search term.",
    fCat: "Category", fMat: "Body material", fPress: "Pressure range (bar)", fSize: "Port size", fClean: "Clean spec", fDrive: "Actuation",
    pressPh: "max bar e.g. 100", sizePh: "max size", sizeUnit: "Unit:", mm: "mm", inch: "inch",
    explainT: "Model decoding · the code is the product",
    explainP: "A VALTRIX model is built from material prefix + series + port/drive/seat/clean segments. Read the rule and confirm the model yourself:",
    exK1: "Material prefix",
    exK2: "Series · flow path",
    exK3: "Function segments", exD3: "inlet – outlet – remaining ports – actuation – seat – clean spec, depending on series (ports FMR / MR / SMR / TB / F etc.)",
    exNote: "Data per the 2026-10-04 \"High-Purity Valves & Fittings\" catalog; items marked “待确认” are not disclosed by the catalog and will be updated once confirmed.",
    svcP: "Your local VALTRIX authorized sales & service center may have additional options and custom solutions.",
    svcBtn: "Contact us",
    safetyT: "Safe product selection",
    safetyP: "Consider the overall system design to ensure safe, trouble-free performance. Function, material compatibility, adequate ratings, correct installation, use and maintenance are the responsibility of the system designer and user. Do not mix VALTRIX products or non-industry-standard components with products of other manufacturers.",
    inSale: "On site", addCart: "Add to quote cart", added: "Added", detail: "View product",
    copyHint: "Catalog example models (click to copy)", copied: "Part number copied", noSite: "Not listed on site yet",
    pending: "TBD", fromManual: "Specs from the catalog",
    dMan: "Manual", dNC: "NC pneumatic", dNO: "NO pneumatic",
    dMNC: "MNC pneumatic M5/10-32", dMNO: "MNO pneumatic M5/10-32", dPneu: "Pneumatic actuator optional",
  },
};

/* ==========================================================================
   二、手册代号 → 显示标签
   —— 材料/洁净代号本身就是手册原文（拉丁字符，跨语种通用），
      只有「驱动方式」是需要翻译的自然语言，故按语种给标签。
   ========================================================================== */
const MAT_ORDER = ["316L", "6V", "6VV", "316"];
const MAT_LABEL: Record<string, string> = {
  "316L": "316L SS",
  "6V": "316L VAR (6V)",
  "6VV": "316L VIM-VAR (6VV)",
  "316": "316 SS",
};
const CLEAN_ORDER = ["GP", "HP", "UHP", "-"];
const CLEAN_LABEL: Record<string, string> = {
  GP: "GP",
  HP: "HP",
  UHP: "UHP",
  "-": "—",
};
const DRIVE_ORDER = ["man", "NC", "NO", "MNC", "MNO", "pneu"];
const DRIVE_KEY: Record<string, string> = {
  man: "dMan",
  NC: "dNC",
  NO: "dNO",
  MNC: "dMNC",
  MNO: "dMNO",
  pneu: "dPneu",
};

/* ==========================================================================
   三、手册数据 → 选型器数据模型（模块级常量，服务端/客户端完全一致）
   ========================================================================== */
interface CatRow {
  /** 手册规格行原文（与品类 columns 一一对应） */
  cells: string[];
  /** 行内出现过的最大压力（bar）—— 解析不出为 null */
  bar: number | null;
  /** 行内最小端口尺寸（inch）—— 解析不出为 null */
  inch: number | null;
}
interface CatSeries {
  key: string;
  catKey: string;
  id: string;
  nameZh: string;
  nameEn: string;
  formsZh: string;
  formsEn: string;
  models: string[];
  mats: string[];
  cleans: string[];
  drives: string[];
  rows: CatRow[];
  /** 搜索用的大写无关长串 */
  hay: string;
}
interface CatBlock {
  key: string;
  zh: string;
  en: string;
  columns: string[];
  /** 手册列头的**英文版**（原型 `I18N.en.th` 原文）；英文页用它，缺省回退中文列头 */
  columnsEn: string[];
  series: CatSeries[];
}
interface SiteItem {
  id: string;
  model: string;
  name: string;
  image: string;
  href: string;
}

/** 与原型 `parseBar()` 同一口径：只认 bar / psig，取最大值（1 psig = 0.06895 bar） */
function parseBar(text: string): number | null {
  let max: number | null = null;
  const reBar = /(\d+(?:\.\d+)?)\s*bar/gi;
  const rePsi = /(\d+(?:\.\d+)?)\s*psig?/gi;
  let m: RegExpExecArray | null;
  while ((m = reBar.exec(text))) {
    const v = parseFloat(m[1]);
    if (max === null || v > max) max = v;
  }
  while ((m = rePsi.exec(text))) {
    const v = parseFloat(m[1]) * 0.06895;
    if (max === null || v > max) max = v;
  }
  return max;
}

/** 与原型 `parseInch()` 同一口径：mm / 分数 / 小数英寸，取**最小值**（最小端口） */
function parseInch(text: string): number | null {
  const vals: number[] = [];
  let m: RegExpExecArray | null;
  const reMm = /(\d+(?:\.\d+)?)\s*mm/gi;
  while ((m = reMm.exec(text))) vals.push(parseFloat(m[1]) / 25.4);
  const reFrac = /(\d+)\s*\/\s*(\d+)(?:\s*["″]|\s*in\.|\s*英寸)?/gi;
  while ((m = reFrac.exec(text))) {
    const den = parseFloat(m[2]);
    if (den) vals.push(parseFloat(m[1]) / den);
  }
  const reDec = /(\d+(?:\.\d+)?)(?:\s*["″]|\s*in\.|\s*英寸)/gi;
  while ((m = reDec.exec(text))) vals.push(parseFloat(m[1]));
  return vals.length ? Math.min(...vals) : null;
}

const CAT_META = new Map(MANUAL_CATEGORIES.map((c) => [c.key, c]));
const GROUP_ORDER = MANUAL_GROUPS.map((g) => g.key);

/** 品类展示顺序：先按 `MANUAL_GROUPS` 分组（接头 → 阀门 → 过滤·阀组），再按手册目录顺序 */
function catRank(key: string): number {
  const meta = CAT_META.get(key);
  const gi = meta ? GROUP_ORDER.indexOf(meta.group) : 99;
  const ci = MANUAL_CATEGORIES.findIndex((c) => c.key === key);
  return (gi < 0 ? 99 : gi) * 1000 + (ci < 0 ? 999 : ci);
}

function normCodes(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const v of list) {
    const s = String(v ?? "").trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

const CATALOG: CatBlock[] = MANUAL_SPECS.map((c) => {
  const meta = CAT_META.get(c.category);
  const series: CatSeries[] = c.series.map((s) => {
    const rows: CatRow[] = s.rows.map((cells) => {
      const all = cells.join(" ");
      return {
        cells,
        bar: parseBar(all),
        inch: parseInch(cells.slice(0, 2).join(" ")),
      };
    });
    const dims = (s.dims || {}) as Record<string, unknown>;
    const mats = normCodes(dims.mats).length ? normCodes(dims.mats) : normCodes(dims.mat);
    const cleans = normCodes(dims.cleans).length ? normCodes(dims.cleans) : normCodes(dims.procs);
    const drives = normCodes(dims.drives).length ? normCodes(dims.drives) : normCodes(dims.drive);
    return {
      key: `${c.category}::${s.id}`,
      catKey: c.category,
      id: s.id,
      nameZh: s.nameZh || s.nameEn || s.id,
      nameEn: s.nameEn || s.nameZh || s.id,
      formsZh: s.formsZh || "",
      formsEn: s.formsEn || "",
      models: s.models || [],
      mats,
      cleans,
      drives,
      rows,
      hay: [
        meta?.zh || "",
        meta?.en || "",
        s.nameZh || "",
        s.nameEn || "",
        s.formsZh || "",
        s.formsEn || "",
        (s.models || []).join(" "),
        rows.map((r) => r.cells.join(" ")).join(" "),
      ]
        .join(" ")
        .toLowerCase(),
    };
  });
  return {
    key: c.category,
    zh: meta?.zh || c.category,
    en: meta?.en || c.category,
    columns: c.columns,
    columnsEn: c.columnsEn || [],
    series,
  };
}).sort((a, b) => catRank(a.key) - catRank(b.key));

const ALL_SERIES = CATALOG.flatMap((c) => c.series);
const TOTAL_ROWS = ALL_SERIES.reduce((n, s) => n + s.rows.length, 0);

function pickOptions(found: string[], order: string[]): string[] {
  const set = new Set(found);
  const out = order.filter((o) => set.has(o));
  for (const f of found) if (!out.includes(f)) out.push(f);
  return out;
}
const MAT_OPTIONS = pickOptions(ALL_SERIES.flatMap((s) => s.mats), MAT_ORDER);
const CLEAN_OPTIONS = pickOptions(ALL_SERIES.flatMap((s) => s.cleans), CLEAN_ORDER);
const DRIVE_OPTIONS = pickOptions(ALL_SERIES.flatMap((s) => s.drives), DRIVE_ORDER);

/**
 * 把 `matchManualSeries()` 给出的系列名对齐到 `MANUAL_SPECS` 的系列 id。
 * 起因：手册目录页写的是「I 系列 / I Series」，而数值表里的 id 是 `I`；
 *      隔膜阀目录页又写 `ALD3/ALD3T`，数值表里只有 `ALD`。三种写法都要能落到同一行数据上。
 */
function seriesIdOf(catKey: string, label: string): string | null {
  const spec = MANUAL_SPECS.find((c) => c.category === catKey);
  if (!spec) return null;
  const up = String(label || "").toUpperCase().replace(/\s/g, "");
  if (!up) return null;
  const ids = spec.series.map((s) => s.id);
  const direct = ids.find((id) => id.toUpperCase().replace(/\s/g, "") === up);
  if (direct) return direct;
  const head = /^([A-Z0-9]+)/.exec(up);
  if (head) {
    const hit = ids.find((id) => id.toUpperCase() === head[1]);
    if (hit) return hit;
  }
  const prefix = ids.find((id) => up.startsWith(id.toUpperCase()));
  return prefix || null;
}

type FacetKey = "cat" | "mat" | "press" | "size" | "clean" | "drive";
type Sel = Record<"cat" | "mat" | "clean" | "drive", string[]>;
type NumRange = Record<"pressMin" | "pressMax" | "sizeMin" | "sizeMax", string>;

export default function ProductSelector() {
  const { t, locale } = useI18n();
  /**
   * 本页**语种策略**（owner 2026-10-07：「完善此页面中英文多语种，非中文语种自动跳转英文」）：
   *   · 中文 → 中文；**其余任何语种（en/ja/ko/fr/ar…）一律英文**；
   *   · 页面文案与**本页解析出来的数据**（产品名等）都按这个口径走，
   *     避免出现"英文外壳 + 半成品他语翻译"的混排。
   */
  const isZh = locale === "zh";
  const L = isZh ? T.zh : T.en;

  /**
   * 页头数据源：**与产品中心同一份** `page-config?page=products`
   * （owner 2026-10-07：「这个页面需要继承产品中心的页头」）。
   * 这样后台"页面配置 → 产品中心"里改标题/副标题/面包屑，选型页跟着一起变；
   * 背景图/遮罩由 `PageHero` 按**路径前缀**自动继承（`/products/selector` 前缀匹配到 `/products`）。
   */
  const [pageConfig, setPageConfig] = useState<any>(null);
  useEffect(() => {
    fetch("/api/public/page-config?page=products")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) setPageConfig(d.data);
      })
      .catch(() => {});
  }, []);

  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>({ cat: [], mat: [], clean: [], drive: [] });
  const [num, setNum] = useState<NumRange>({ pressMin: "", pressMax: "", sizeMin: "", sizeMax: "" });
  const [sizeUnit, setSizeUnit] = useState<"in" | "mm">("in");
  const [folded, setFolded] = useState<Record<FacetKey, boolean>>({
    cat: false,
    mat: false,
    press: true,
    size: true,
    clean: true,
    drive: true,
  });
  /** 手册系列 key → 官网在售产品 */
  const [siteMap, setSiteMap] = useState<Record<string, SiteItem[]>>({});
  const [toast, setToast] = useState("");
  /** 刚加入询价车的系列 key（按钮短暂显示「已加入」） */
  const [addedKey, setAddedKey] = useState("");

  // 数据取值也走同一策略：非中文一律取英文字段（取不到时 `getLocalizedField` 会回退中文，属数据缺失）
  const loc = useMemo(() => createLocalizedGetter(isZh ? "zh" : "en"), [isZh]);

  useEffect(() => {
    let alive = true;
    fetch("/api/public/products?specs=40&lite=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const map: Record<string, SiteItem[]> = {};
        const tabs: any[] = d?.data || [];
        for (const tab of tabs) {
          for (const cat of tab.categories || []) {
            for (const m of cat.models || []) {
              const model = String(m.model || "").trim();
              const name = String(loc.get(m, "name") || model).trim();
              const hit = matchManualSeries(`${model} ${name}`);
              if (!hit) continue;
              const sid = seriesIdOf(hit.category.key, hit.series);
              if (!sid) continue;
              const key = `${hit.category.key}::${sid}`;
              const list = (map[key] = map[key] || []);
              if (list.some((x) => x.id === String(m.id))) continue;
              list.push({
                id: String(m.id),
                model,
                name,
                image: String(m.image || (Array.isArray(m.images) ? m.images[0] : "") || ""),
                href: `/products/${encodeURIComponent(String(tab.id))}/${encodeURIComponent(String(m.id))}`,
              });
            }
          }
        }
        setSiteMap(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loc]);

  /**
   * 按型号把手册规格行/示例型号对到官网在售产品上。
   * 命中口径（实测阀门站在售型号就是系列级产品页，如 `DV2` / `I Series` / `FT4系列`）：
   *   ① 等值；② 官网型号更长（`DV2` vs `DV2-...`）；③ **loose** 时还允许官网型号是规格型号的前缀
   *   （`DV2` → `DV22A-MR8`，用于规格表的型号列给出「去该系列产品页」的入口）；
   *   比对前先剥掉型号尾部的非字母数字（`FT4系列` → `FT4`）。
   * 型号片段（chips）用严格口径，避免把每个手册示例都染成链接。
   */
  const siteFor = (series: CatSeries, code: string, loose = false): SiteItem | null => {
    const list = siteMap[series.key];
    if (!list || !list.length) return null;
    const c = code.toUpperCase().replace(/\s+/g, "");
    if (!c) return null;
    for (const it of list) {
      const m = it.model.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]+$/, "");
      if (!m) continue;
      if (m === c || m.startsWith(c) || (loose && m.length >= 2 && c.startsWith(m))) return it;
    }
    return null;
  };

  const numBag = {
    pressMin: num.pressMin.trim() === "" ? null : Number(num.pressMin),
    pressMax: num.pressMax.trim() === "" ? null : Number(num.pressMax),
    sizeMin: num.sizeMin.trim() === "" ? null : Number(num.sizeMin),
    sizeMax: num.sizeMax.trim() === "" ? null : Number(num.sizeMax),
  };
  const sizeToInch = (v: number | null) => (v === null ? null : sizeUnit === "mm" ? v / 25.4 : v);
  const pMin = Number.isFinite(numBag.pressMin as number) ? (numBag.pressMin as number) : null;
  const pMax = Number.isFinite(numBag.pressMax as number) ? (numBag.pressMax as number) : null;
  const sMin = sizeToInch(Number.isFinite(numBag.sizeMin as number) ? (numBag.sizeMin as number) : null);
  const sMax = sizeToInch(Number.isFinite(numBag.sizeMax as number) ? (numBag.sizeMax as number) : null);

  /** 数值区间只过滤**规格行**（与原型一致：区间匹配的行才算「显示」） */
  const rowPass = (r: CatRow): boolean => {
    if (pMin === null && pMax === null && sMin === null && sMax === null) return true;
    if (pMin !== null || pMax !== null) {
      if (r.bar === null) return false;
      if (pMin !== null && r.bar < pMin) return false;
      if (pMax !== null && r.bar > pMax) return false;
    }
    if (sMin !== null || sMax !== null) {
      if (r.inch === null) return false;
      if (sMin !== null && r.inch < sMin) return false;
      if (sMax !== null && r.inch > sMax) return false;
    }
    return true;
  };

  const hasOption = (s: CatSeries, facet: FacetKey, v: string): boolean => {
    if (facet === "cat") return s.catKey === v;
    if (facet === "mat") return s.mats.includes(v);
    if (facet === "clean") return s.cleans.includes(v);
    if (facet === "drive") return s.drives.includes(v);
    return true;
  };

  const seriesPass = (s: CatSeries, ignore?: FacetKey): boolean => {
    for (const f of ["cat", "mat", "clean", "drive"] as const) {
      if (f === ignore) continue;
      const want = sel[f];
      if (!want.length) continue;
      if (!want.some((v) => hasOption(s, f, v))) return false;
    }
    const kw = q.trim().toLowerCase();
    if (kw && !s.hay.includes(kw)) return false;
    return true;
  };

  /** 每个选项后面的计数（其余条件生效时，该选项还能命中多少条规格行） */
  const optionCount = (facet: FacetKey, v: string): number => {
    let n = 0;
    for (const s of ALL_SERIES) {
      if (!hasOption(s, facet, v)) continue;
      if (!seriesPass(s, facet)) continue;
      for (const r of s.rows) if (rowPass(r)) n += 1;
    }
    return n;
  };

  /**
   * 结果分组。总行数只有 101 行 —— 直接在渲染期算，不套 `useMemo`
   * （少一层依赖数组的坑：`seriesPass`/`rowPass` 每次渲染都新建）。
   */
  const view = (() => {
    const blocks: { cat: CatBlock; groups: { s: CatSeries; rows: CatRow[] }[] }[] = [];
    let shown = 0;
    for (const c of CATALOG) {
      const groups: { s: CatSeries; rows: CatRow[] }[] = [];
      for (const s of c.series) {
        if (!seriesPass(s)) continue;
        const rows = s.rows.filter(rowPass);
        if (!rows.length) continue;
        groups.push({ s, rows });
        shown += rows.length;
      }
      if (groups.length) blocks.push({ cat: c, groups });
    }
    return { blocks, shown };
  })();

  const toggle = (facet: "cat" | "mat" | "clean" | "drive", v: string) =>
    setSel((p) => ({ ...p, [facet]: p[facet].includes(v) ? p[facet].filter((x) => x !== v) : [...p[facet], v] }));

  const resetAll = () => {
    setSel({ cat: [], mat: [], clean: [], drive: [] });
    setNum({ pressMin: "", pressMax: "", sizeMin: "", sizeMax: "" });
    setQ("");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  };
  const copyCode = (code: string) => {
    try {
      navigator.clipboard?.writeText(code);
      showToast(`${L.copied} · ${code}`);
    } catch {
      showToast(code);
    }
  };
  const addSeries = (key: string, list: SiteItem[]) => {
    for (const it of list) addToQuoteCart(it.id, 1);
    setAddedKey(key);
    showToast(`${L.added} · ${list.length}`);
    window.setTimeout(() => setAddedKey(""), 2000);
  };

  const statModels = TOTAL_ROWS;

  return (
    <div id="vs-all">
      {/*
        页头：**继承产品中心**（owner 2026-10-07）
        —— 用同一个 `PageHero` 组件 + 同一份 `/api/public/page-config?page=products`：
           标题 / 副标题 / 面包屑跟着产品中心走（后台改一处，两页同时变）；
           背景图与遮罩由 `PageHero` 的**路径前缀匹配**自动继承 `/products` 的配置。
        原来这里是原型自带的面包屑 + kicker/h1/desc 自造页头，已移除（避免双层页头）。
      */}
      <PageHero
        title={pageConfig?.title || t("productsPageTitle")}
        titleEn={pageConfig?.titleEn || "Products"}
        subtitle={pageConfig?.subtitle || t("productsPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || ""}
        breadcrumb={pageConfig?.breadcrumb || t("productsPageTitle")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "Products"}
      />

      {/* 搜索 + 四统计（原型的 .searchbar / .stats **保留**：它们是选型器的功能件，不属于页头） */}
      <section className="hero">
        <div className="wrap">
          <div className="searchbar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L.ph}
              aria-label={L.ph}
            />
            <span className="q">
              {q.trim() ? `${view.shown} / ${statModels}` : view.shown === statModels ? "" : String(view.shown)}
            </span>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="l">{L.st1}</div>
              <div className="v">{CATALOG.length}</div>
              <div className="s">{L.st1s}</div>
            </div>
            <div className="stat">
              <div className="l">{L.st2}</div>
              <div className="v">{ALL_SERIES.length}</div>
              <div className="s">{L.st2s}</div>
            </div>
            <div className="stat">
              <div className="l">{L.st3}</div>
              <div className="v">{statModels}</div>
              <div className="s">{L.st3s}</div>
            </div>
            <div className="stat">
              <div className="l">{L.st4}</div>
              <div className="v">{MAT_OPTIONS[0] || "316L"}</div>
              <div className="s">{L.st4s}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 主体：左筛选栏 + 右结果（原型 .main / .facets / .results） */}
      <div className="main wrap">
        <aside className="facets">
          {/* 类别 */}
          <div className={"fg" + (folded.cat ? " folded" : "")}>
            <h3 onClick={() => setFolded((f) => ({ ...f, cat: !f.cat }))}>
              {L.fCat}
              <span className="ar">▼</span>
            </h3>
            <div className="opts">
              {CATALOG.map((c) => {
                const n = optionCount("cat", c.key);
                const on = sel.cat.includes(c.key);
                const dis = n === 0 && !on;
                return (
                  /**
                   * ⚠️ 勾选必须走 input 的 `onChange`，**不要**在 `<label>` 上挂 onClick：
                   *   点 label 时浏览器会把激活再转发给内部 checkbox，于是 click 事件冒泡两次
                   *   ⇒ 两次 toggle 相互抵消（实测「点了没反应」）。原型是原生 JS 不受影响，
                   *   这里必须换成受控 checkbox。
                   */
                  <label key={c.key} className={"opt" + (on ? " sel" : "") + (dis ? " dis" : "")}>
                    <input type="checkbox" checked={on} disabled={dis} onChange={() => toggle("cat", c.key)} />
                    <span className="nm">{isZh ? c.zh : c.en}</span>
                    <span className="n">({n})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 材料 */}
          <div className={"fg" + (folded.mat ? " folded" : "")}>
            <h3 onClick={() => setFolded((f) => ({ ...f, mat: !f.mat }))}>
              {L.fMat}
              <span className="ar">▼</span>
            </h3>
            <div className="opts">
              {MAT_OPTIONS.map((v) => {
                const n = optionCount("mat", v);
                const on = sel.mat.includes(v);
                const dis = n === 0 && !on;
                return (
                  <label key={v} className={"opt" + (on ? " sel" : "") + (dis ? " dis" : "")}>
                    <input type="checkbox" checked={on} disabled={dis} onChange={() => toggle("mat", v)} />
                    <span className="nm">{MAT_LABEL[v] || v}</span>
                    <span className="n">({n})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 压力范围 */}
          <div className={"fg" + (folded.press ? " folded" : "")}>
            <h3 onClick={() => setFolded((f) => ({ ...f, press: !f.press }))}>
              {L.fPress}
              <span className="ar">▼</span>
            </h3>
            <div className="opts">
              <div className="rg">
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={num.pressMin}
                  onChange={(e) => setNum((p) => ({ ...p, pressMin: e.target.value }))}
                />
                <span className="dash">–</span>
                <input
                  type="number"
                  min={0}
                  placeholder={L.pressPh}
                  value={num.pressMax}
                  onChange={(e) => setNum((p) => ({ ...p, pressMax: e.target.value }))}
                />
                <button className="clr" onClick={() => setNum((p) => ({ ...p, pressMin: "", pressMax: "" }))}>
                  ×
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--mut)", paddingBottom: 8 }}>{L.pressPh}</div>
            </div>
          </div>

          {/* 端口尺寸 */}
          <div className={"fg" + (folded.size ? " folded" : "")}>
            <h3 onClick={() => setFolded((f) => ({ ...f, size: !f.size }))}>
              {L.fSize}
              <span className="ar">▼</span>
            </h3>
            <div className="opts">
              <div className="rg">
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={num.sizeMin}
                  onChange={(e) => setNum((p) => ({ ...p, sizeMin: e.target.value }))}
                />
                <span className="dash">–</span>
                <input
                  type="number"
                  min={0}
                  placeholder={L.sizePh}
                  value={num.sizeMax}
                  onChange={(e) => setNum((p) => ({ ...p, sizeMax: e.target.value }))}
                />
                <button className="clr" onClick={() => setNum((p) => ({ ...p, sizeMin: "", sizeMax: "" }))}>
                  ×
                </button>
              </div>
              <div className="unit">
                {L.sizeUnit}
                <button className={sizeUnit === "in" ? "on" : ""} onClick={() => setSizeUnit("in")}>
                  {L.inch}
                </button>
                <button className={sizeUnit === "mm" ? "on" : ""} onClick={() => setSizeUnit("mm")}>
                  {L.mm}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--mut)", paddingBottom: 8 }}>{L.sizePh}</div>
            </div>
          </div>

          {/* 洁净工艺 */}
          <div className={"fg" + (folded.clean ? " folded" : "")}>
            <h3 onClick={() => setFolded((f) => ({ ...f, clean: !f.clean }))}>
              {L.fClean}
              <span className="ar">▼</span>
            </h3>
            <div className="opts">
              {CLEAN_OPTIONS.map((v) => {
                const n = optionCount("clean", v);
                const on = sel.clean.includes(v);
                const dis = n === 0 && !on;
                return (
                  <label key={v} className={"opt" + (on ? " sel" : "") + (dis ? " dis" : "")}>
                    <input type="checkbox" checked={on} disabled={dis} onChange={() => toggle("clean", v)} />
                    <span className="nm">{CLEAN_LABEL[v] || v}</span>
                    <span className="n">({n})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 驱动方式 */}
          <div className={"fg" + (folded.drive ? " folded" : "")}>
            <h3 onClick={() => setFolded((f) => ({ ...f, drive: !f.drive }))}>
              {L.fDrive}
              <span className="ar">▼</span>
            </h3>
            <div className="opts">
              {DRIVE_OPTIONS.map((v) => {
                const n = optionCount("drive", v);
                const on = sel.drive.includes(v);
                const dis = n === 0 && !on;
                return (
                  <label key={v} className={"opt" + (on ? " sel" : "") + (dis ? " dis" : "")}>
                    <input type="checkbox" checked={on} disabled={dis} onChange={() => toggle("drive", v)} />
                    <span className="nm">{L[DRIVE_KEY[v]] || v}</span>
                    <span className="n">({n})</span>
                  </label>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="results">
          <div className="bar">
            <span className="cnt">
              {L.show} <b>{view.shown}</b> / <b>{statModels}</b> {L.units}
            </span>
            <button className="btn-reset" onClick={resetAll}>
              {L.reset}
            </button>
          </div>

          {view.blocks.map(({ cat, groups }) => (
            <div key={cat.key}>
              <div className="cathead">
                <span className="cn">{isZh ? cat.zh : cat.en}</span>
                <span className="ce">{isZh ? cat.en : cat.zh}</span>
                <span className="ct">{groups.reduce((n, g) => n + g.rows.length, 0)}</span>
              </div>

              {groups.map(({ s, rows }) => {
                const list = siteMap[s.key] || [];
                const img = list.find((x) => x.image)?.image || "";
                const chips = [...list.map((x) => ({ code: x.model, href: x.href })), ...s.models.map((code) => ({ code, href: siteFor(s, code)?.href || "" }))].filter(
                  (c, i, arr) => c.code && arr.findIndex((x) => x.code.toUpperCase() === c.code.toUpperCase()) === i
                );
                const forms = isZh ? s.formsZh : s.formsEn;
                return (
                  <div className="group" key={s.key}>
                    <div className="ghead">
                      <span className="gh">{isZh ? s.nameZh : s.nameEn}</span>
                      {list.length > 0 ? (
                        <span className="chip" style={{ marginLeft: 4 }}>
                          {L.inSale} {list.length}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: "var(--mut)" }}>{L.noSite}</span>
                      )}
                      {forms ? <span className="ge">{forms}</span> : <span className="ge" />}
                    </div>
                    <div className="gbody">
                      <div className="thumb">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={isZh ? s.nameZh : s.nameEn} loading="lazy" />
                        ) : (
                          <span style={{ fontFamily: "Consolas,Menlo,monospace", fontWeight: 700, color: "var(--mut)", fontSize: 18 }}>
                            {s.id}
                          </span>
                        )}
                      </div>
                      <div className="ginfo">
                        <div className="chips">
                          {chips.map((c) =>
                            c.href ? (
                              <Link key={c.code} className="chip" href={c.href} title={L.detail} style={{ color: "var(--red)" }}>
                                {c.code}
                              </Link>
                            ) : (
                              <button key={c.code} className="chip" type="button" onClick={() => copyCode(c.code)} title={L.copyHint}>
                                {c.code}
                              </button>
                            )
                          )}
                        </div>
                        <table className="ptable">
                          <thead>
                            <tr>
                              {(isZh || !cat.columnsEn.length ? cat.columns : cat.columnsEn).map((c, i) => (
                                <th key={i}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, ri) => (
                              <tr key={ri}>
                                {r.cells.map((cell, ci) => {
                                  const hit = ci === 0 ? siteFor(s, cell, true) : null;
                                  const tbd = cell === "待确认";
                                  const shown = isZh ? cell : manualCellToEn(cell);
                                  return (
                                    <td key={ci}>
                                      {ci === 0 ? <b>{shown}</b> : tbd ? <i style={{ color: "var(--red)" }}>{L.pending}</i> : shown}
                                      {hit && (
                                        <Link href={hit.href} title={L.detail} className="vsa-lnk">
                                          ↗
                                        </Link>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="vsa-row">
                          <span className="vsa-hint">{L.fromManual}</span>
                          {list.length > 0 && (
                            <button type="button" className="vsa-btn" onClick={() => addSeries(s.key, list)}>
                              {addedKey === s.key ? L.added : `${L.addCart}（${list.length}）`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="empty" style={{ display: view.shown === 0 ? "block" : "none" }}>
            {L.empty}
          </div>
        </div>
      </div>

      {/* 型号解读（原型 .explain） */}
      <section className="wrap">
        <div className="explain">
          <div className="xh">
            <span className="mk" />
            <span>{L.explainT}</span>
          </div>
          <div className="xb">
            <p>{L.explainP}</p>
            <div className="steps">
              <div className="st">
                <div className="k">{L.exK1}</div>
                <div className="d">
                  <code>316L</code> / <code>316</code> · <code>6V</code> · <code>6VV</code>
                </div>
              </div>
              <div className="st">
                <div className="k">{L.exK2}</div>
                <div className="d">
                  <code>I/B/G/O</code> <code>ALD</code> <code>DV1–DV7</code> <code>PRE/PRT1–3</code> <code>CV3</code>{" "}
                  <code>BSM</code> <code>FT4–FT6</code> <code>BV</code> <code>NV</code> <code>BSV</code>
                </div>
              </div>
              <div className="st">
                <div className="k">{L.exK3}</div>
                <div className="d">{L.exD3}</div>
              </div>
            </div>
            <p className="note">{L.exNote}</p>
          </div>
        </div>
      </section>

      {/* 服务中心提示（原型 .svc） */}
      <section className="wrap">
        <div className="svc">
          <p>{L.svcP}</p>
          <Link className="btn" href="/contact">
            {L.svcBtn}
          </Link>
        </div>
      </section>

      {/* 安全提示（原型 .safety） */}
      <section className="wrap">
        <div className="safety">
          <div className="t">{L.safetyT}</div>
          <p>{L.safetyP}</p>
        </div>
      </section>

      <div className={"toast" + (toast ? " on" : "")}>{toast}</div>
    </div>
  );
}
