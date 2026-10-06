/**
 * 芯阀（XINVAL）产品手册的**品类 / 系列 / 筛选维度**（选型器的唯一权威来源）
 * ==========================================================================
 * owner 2026-10-06 口径：**"产品的规格及细分严格从 PDF 手册里取"**
 *   ⇒ 本文件是"手册事实层"：品类怎么分、每个品类有哪些系列、每个品类按哪些维度筛选，
 *     全部来自手册（含原型目录页，原型本身即手册的网页化产物）。
 *
 * 来源（可回溯）：
 *   · 品类与系列：`产品手册/html版/<品类>目录页/<品类>目录页.html` 的系列清单（实测抽取）
 *   · 筛选维度名：同上（每个目录页自带"端口尺寸/压力范围/驱动方式…"等维度标签）
 *   · 编码段位：`lib/manual-codes.ts`（型号说明页逐段转录，隔膜阀 8 系列已完成）
 *
 * ⚠️ 与 `lib/spec-facets.ts`（从产品规格自动推导）的分工：
 *   自动推导只用于"我们的产品数据本身"的辅助筛选；**手册层是权威**——
 *   界面上的品类/系列/维度名一律用本文件，自动推导结果只在手册没有覆盖时兜底。
 */

export interface ManualCategory {
  /** 品类 key（对应手册目录页文件名） */
  key: string;
  /** 中文名（手册目录页原文） */
  zh: string;
  /** 英文名（手册原型给出的英文） */
  en: string;
  /** 手册系列清单（原文代号） */
  series: string[];
  /** 手册给出的筛选维度（原文标签） */
  dimensions: string[];
  /** 分组（原型目录页的 g 字段） */
  group: "fittings" | "valves" | "filters" | "others";
  /** 手册中的规则页（用于回溯；手册2 = 隔膜阀专册） */
  rulePages?: string;
}

/** 手册真实品类清单（顺序即手册目录页顺序） */
export const MANUAL_CATEGORIES: ManualCategory[] = [
  {
    key: "fittings",
    zh: "接头",
    en: "Fittings",
    // ⚠️ 手册原型目录页写的是中文"…系列"，官网型号是英文 "I Series/B Series/G Series/O Series"
    //    ⇒ 两种写法都要能匹配（实测：不补英文写法，接头品类一个都归不进去）
    series: ["I Series", "B Series", "G Series", "O Series", "Twin Ferrule", "Threaded", "I 系列", "B 系列", "G 系列", "O 系列"],
    dimensions: ["尺寸范围", "端接类型"],
    group: "fittings",
  },
  {
    key: "diaphragm",
    zh: "隔膜阀",
    en: "Diaphragm Valves",
    series: ["ALD3", "ALD3T", "ALD6", "ALD6T", "ALD", "DV1", "DV2", "DV3", "DV4", "DV5", "DV6", "DV7"],
    dimensions: ["端口尺寸", "压力范围", "驱动方式", "工作温度"],
    group: "valves",
    rulePages: "手册2 p007/010/013/017/020/023/026/030",
  },
  { key: "ball", zh: "球阀", en: "Ball Valves", series: ["BV1", "BV2", "BV3", "BV4", "BV5"], dimensions: ["类别体系"], group: "valves" },
  { key: "needle", zh: "针阀", en: "Needle Valves", series: ["NV1", "NV3", "NV5"], dimensions: ["压力等级", "工作温度"], group: "valves" },
  { key: "bellows", zh: "波纹管阀", en: "Bellows Valves", series: ["BSV1", "BSV2"], dimensions: ["压力范围", "工作温度"], group: "valves" },
  {
    key: "regulator",
    zh: "减压阀",
    en: "Regulators",
    series: ["PRE1", "PRE2", "PRE3", "PRT1", "PRT2", "PRT3"],
    dimensions: ["最大入口压力", "出口压力范围"],
    group: "valves",
    rulePages: "手册1 p083/086/089/092/095/098",
  },
  { key: "check", zh: "单向阀", en: "Check Valves", series: ["CV3"], dimensions: ["端口尺寸", "最大工作压力", "开启压力"], group: "valves", rulePages: "手册1 p102" },
  { key: "metering", zh: "计量阀", en: "Metering Valves", series: ["BSM"], dimensions: ["端口尺寸", "最大工作压力", "最大工作温度"], group: "valves", rulePages: "手册1 p107" },
  {
    key: "filter",
    zh: "过滤器",
    en: "Filters",
    series: ["气体过滤器", "FT4", "FT5", "FT6"],
    dimensions: ["过滤精度范围", "滤芯材质", "额定流量"],
    group: "filters",
    rulePages: "手册1 p112/115/118",
  },
  {
    key: "manifold",
    zh: "阀组",
    en: "Manifolds",
    // 手册目录页列的是「仪表阀组 2D/2R/2DH/2RH」；官网另有 3D/3R/3DH/3RH、5D/5R/5DH/5RH、GV/GVH
    // —— 同属"仪表阀组"这一手册品类，故并入系列清单（避免官网型号无处归类）
    series: ["仪表阀组", "2D", "2R", "2DH", "2RH", "3D", "3R", "3DH", "3RH", "5D", "5R", "5DH", "5RH", "GV", "GVH", "GV/GVH", "3D/3R/3DH/3RH", "5D/5R/5DH/5RH"],
    dimensions: ["产品类型", "阀体材料"],
    group: "filters",
  },
  { key: "integrated", zh: "集成系统", en: "Integrated Systems", series: ["定制"], dimensions: [], group: "others" },
  { key: "tubing", zh: "钢管", en: "Tubing", series: ["316L"], dimensions: [], group: "others" },
  { key: "tools", zh: "工具和其它", en: "Tools & Others", series: ["工具"], dimensions: [], group: "others" },
];

/**
 * 把官网产品中心的**产品/型号**归到手册品类与系列（按型号代号匹配手册系列清单）。
 * 返回 null 表示"手册里没有这个系列"（例如自研/其它品牌产品）——此时界面如实标注，不硬塞。
 */
export function matchManualSeries(text: string): { category: ManualCategory; series: string } | null {
  const t = String(text || "").toUpperCase();
  if (!t) return null;
  // 长的系列代号优先（ALD3T 先于 ALD3；2DH 先于 2D）
  const all = MANUAL_CATEGORIES.flatMap((c) => c.series.map((s) => ({ c, s })));
  all.sort((a, b) => b.s.length - a.s.length);
  for (const { c, s } of all) {
    const code = s.toUpperCase().replace(/\s/g, "");
    if (!code || /[\u4e00-\u9fa5]/.test(code)) continue; // 中文系列名（如"气体过滤器"）用包含匹配
    // 型号里通常形如 DV13A / BV1 / FT4 —— 允许后面紧跟数字/字母，但不允许直接被更长代号吞掉
    if (new RegExp(`(^|[^A-Z0-9])${code}(?![0-9A-Z])`).test(t) || new RegExp(`(^|[^A-Z0-9])${code}[0-9]`).test(t)) {
      return { category: c, series: s };
    }
  }
  for (const c of MANUAL_CATEGORIES) {
    for (const s of c.series) {
      if (/[\u4e00-\u9fa5]/.test(s) && t.includes(s.toUpperCase())) return { category: c, series: s };
    }
  }
  /**
   * 品类级兜底：官网有些型号**手册目录页的系列清单里没列**（实测 BV6/BV7、NV2/NV4 等 ——
   * 目录页原型只列到 BV1-5 / NV1/3/5），但它们显然属于该品类。
   * 这里按**品类前缀**归类（只归品类，不硬塞系列名），界面据此如实显示"官网另有"。
   */
  const PREFIX: [RegExp, string][] = [
    [/^(I|B|G|O)[\s-]?SERIES/i, "fittings"],
    [/^(TWIN\s*FERRULE|THREADED|TRICLOVER)/i, "fittings"],
    [/^(ALD|DV)/i, "diaphragm"],
    [/^BV/i, "ball"],
    [/^NV/i, "needle"],
    [/^BSV/i, "bellows"],
    [/^(PRE|PRT)/i, "regulator"],
    [/^CV/i, "check"],
    [/^BSM/i, "metering"],
    [/^FT/i, "filter"],
    [/^(GV|GVH|[2-5]D|[$2-5][DR])/i, "manifold"],
  ];
  for (const [re, key] of PREFIX) {
    if (re.test(t)) {
      const c = MANUAL_CATEGORIES.find((x) => x.key === key);
      if (c) {
        // 找出该品类里最接近的系列（前缀匹配），找不到就用品类名代替系列
        const guess = c.series.find((s) => s && t.startsWith(s.toUpperCase())) || "";
        return { category: c, series: guess };
      }
    }
  }
  return null;
}

/** 品类按分组的展示顺序（对应原型目录页 GROUP 顺序） */
export const MANUAL_GROUPS: { key: ManualCategory["group"]; zh: string; en: string }[] = [
  { key: "fittings", zh: "接头", en: "FITTINGS" },
  { key: "valves", zh: "阀门", en: "VALVES" },
  { key: "filters", zh: "过滤 · 阀组 · 系统", en: "FILTERS · MANIFOLDS" },
  { key: "others", zh: "钢管 · 工具", en: "TUBING · TOOLS" },
];
