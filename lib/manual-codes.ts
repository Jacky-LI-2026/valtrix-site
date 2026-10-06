/**
 * 芯阀（XINVAL）产品手册的**型号编码规则**（逐系列、逐段位）
 * ==========================================================================
 * 来源：手册原文「型号说明-XXX系列」页（**逐字转录**，未做推断）。
 *   · 手册2《隔膜阀》 p007 ALD / p010 DV1 / p013 DV2 / p017 DV3 / p020 DV4 / p023 DV5 / p026 DV6 / p030 DV7
 *   · 手册1《高纯管阀件》同系列页 p055-p078（另有 减压阀 PRE1-3/PRT1-3、单向阀 CV3、计量阀 BSM、过滤器 FT4-6）
 *
 * 🔴 手册明确写着：「型号说明用于描述产品型号的组成规则，**不适用于产品的具体选型，不能随意组合**」
 *   ⇒ 本配置只用于**生成/解读订货号**（生成后必须与库中已有机型比对，命中才算有效），
 *     绝不当作"任意组合都能下单"的依据。
 *
 * 用途：产品页「货号生成器」优先用这里的**手册权威段位**（带中文含义、带缺省值），
 *   没有对应手册规则的系列才退回"从已有机型货号自动推导"。
 */

export interface CodeOption {
  /** 代号（写入货号的那一段） */
  code: string;
  /** 中文含义（手册原文） */
  label: string;
  /** 手册标注为缺省/默认值 */
  isDefault?: boolean;
}

export interface CodeSegment {
  /** 段号（手册里的 1…12） */
  no: number;
  /** 段名（手册原文） */
  name: string;
  en: string;
  options: CodeOption[];
  /** 手册说明（如"缺省：与入口相同"） */
  note?: string;
}

export interface ManualSeries {
  /** 系列代号（用于匹配产品型号/货号） */
  key: string;
  /** 系列中文名（手册原文） */
  name: string;
  segments: CodeSegment[];
  /** 手册给出的型号举例（**可直接校验解析逻辑**） */
  example: string;
  /** 来源页（便于回溯） */
  source: string;
}

/** 通用段位（各系列基本一致，个别系列段号/取值不同，见各系列定义） */
const MATERIAL: CodeSegment = {
  no: 1,
  name: "材料",
  en: "Material",
  options: [
    { code: "316L", label: "316L" },
    { code: "6V", label: "316L VAR" },
    { code: "6VV", label: "316L VIM-VAR" },
  ],
};
const CLEAN: CodeSegment = {
  no: 9,
  name: "洁净度等级",
  en: "Cleaning level",
  options: [
    { code: "GP", label: "标准工艺规范" },
    { code: "HP", label: "高纯工艺规范" },
    { code: "UHP", label: "超高纯工艺规范" },
  ],
};
const DRIVE_STD: CodeSegment = {
  no: 7,
  name: "驱动类型",
  en: "Actuation",
  note: "缺省：手动",
  options: [
    { code: "", label: "手动（缺省）", isDefault: true },
    { code: "NO", label: "常开气动（进气口 1/8 NPT）" },
    { code: "NC", label: "常闭气动（进气口 1/8 NPT）" },
    { code: "MNO", label: "常开气动（M5 或 10-32 UNF）" },
    { code: "MNC", label: "常闭气动（M5 或 10-32 UNF）" },
  ],
};
const DRIVE_SIMPLE: CodeSegment = {
  no: 6,
  name: "驱动类型",
  en: "Actuation",
  note: "缺省：手动",
  options: [
    { code: "", label: "手动（缺省）", isDefault: true },
    { code: "NO", label: "常开气动" },
    { code: "NC", label: "常闭气动" },
  ],
};
const port = (no: number, name: string, opts: [string, string][], note?: string): CodeSegment => ({
  no,
  name,
  en: no === 4 ? "Inlet" : no === 5 ? "Outlet" : "Other ports",
  note,
  options: opts.map(([code, label]) => ({ code, label })),
});

/** DV1 口径端口（手册 p010/p020 原文） */
const PORTS_DV1: [string, string][] = [
  ["FMR4", '1/4" 金属面密封内螺纹'],
  ["MR4", '1/4" 金属面密封整体外螺纹'],
  ["SMR4", '1/4" 金属面密封可旋转外螺纹'],
  ["TB4", '1/4" 英制管对焊'],
  ["TB6", '3/8" 英制管对焊'],
  ["TB6M", "6 mm 公制管对焊"],
  ["TB8M", "8 mm 公制管对焊"],
  ["F4", '1/4" 英制卡套端口'],
  ["F6M", "6 mm 公制卡套端口"],
  ["F8M", "8 mm 公制卡套端口"],
];
/** DV2 口径端口（手册 p013/p023 原文） */
const PORTS_DV2: [string, string][] = [
  ["FMR8", '1/2" 金属面密封内螺纹'],
  ["MR8", '1/2" 金属面密封整体外螺纹'],
  ["SMR8", '1/2" 金属面密封可旋转外螺纹'],
  ["TB6", '3/8" 英制管对焊'],
  ["TB8", '1/2" 英制管对焊'],
  ["TB10M", "10 mm 公制管对焊"],
  ["TB12M", "12 mm 公制管对焊"],
  ["F8", '1/2" 英制卡套端口'],
  ["F10M", "10 mm 公制卡套端口"],
  ["F12M", "12 mm 公制卡套端口"],
];
/** DV3 口径端口（手册 p017 原文） */
const PORTS_DV3: [string, string][] = [
  ["FMR8", '1/2" 金属面密封内螺纹'],
  ["SMR8", '1/2" 金属面密封可旋转外螺纹'],
  ["FMR12", '3/4" 金属面密封内螺纹'],
  ["SMR12", '3/4" 金属面密封可旋转外螺纹'],
  ["FMR16", '1" 金属面密封内螺纹'],
  ["SMR16", '1" 金属面密封可旋转外螺纹'],
];

const FLOW_NOTE = "缺省：与入口相同；其余形式见「入口形式和尺寸」";
const FLOW_DIAGRAM = "请参阅手册「流道形式示意图」（2 流道 2A-2D / 3 流道 3A-3G / 4 流道 4A-4D）";

/** 隔膜阀 8 个系列（手册2 全部） */
export const MANUAL_SERIES: ManualSeries[] = [
  {
    key: "DV1",
    name: "低压小流量隔膜阀",
    example: "316L-DV13A-FMR4-FMR4-MR4-NC-PA-HP",
    source: "手册2 p010（型号说明-DV1系列）",
    segments: [
      MATERIAL,
      { no: 2, name: "阀门系列", en: "Series", options: [{ code: "DV1", label: "低压小流量隔膜阀" }] },
      { no: 3, name: "流道形式", en: "Flow pattern", note: FLOW_DIAGRAM, options: [{ code: "3A", label: "两入口·一出口（3 流道）" }, { code: "2A", label: "直通（2 流道）" }] },
      port(4, "入口形式、尺寸", PORTS_DV1),
      port(5, "出口形式、尺寸", PORTS_DV1, FLOW_NOTE),
      port(6, "其余端口形式、尺寸", PORTS_DV1, FLOW_NOTE),
      DRIVE_STD,
      { no: 8, name: "阀座材质", en: "Seat", note: "缺省：PCTFE", options: [{ code: "", label: "PCTFE（缺省）", isDefault: true }, { code: "PA", label: "PFA" }] },
      CLEAN,
    ],
  },
  {
    key: "DV2",
    name: "低压中流量隔膜阀",
    example: "316L-DV23A-FMR8-FMR8-MR8-NC-PA-HP",
    source: "手册2 p013（型号说明-DV2系列）",
    segments: [
      MATERIAL,
      { no: 2, name: "阀门系列", en: "Series", options: [{ code: "DV2", label: "低压中流量隔膜阀" }] },
      { no: 3, name: "流道形式", en: "Flow pattern", note: FLOW_DIAGRAM, options: [{ code: "3A", label: "两入口·一出口（3 流道）" }, { code: "2A", label: "直通（2 流道）" }] },
      port(4, "入口形式、尺寸", PORTS_DV2),
      port(5, "出口形式、尺寸", PORTS_DV2, FLOW_NOTE),
      port(6, "其余端口形式、尺寸", PORTS_DV2, FLOW_NOTE),
      DRIVE_STD,
      { no: 8, name: "阀座材质", en: "Seat", note: "缺省：PCTFE", options: [{ code: "", label: "PCTFE（缺省）", isDefault: true }, { code: "PA", label: "PFA" }] },
      CLEAN,
    ],
  },
  {
    key: "DV3",
    name: "低压大流量隔膜阀",
    example: "316L-DV32A-FMR12-SMR12-NC-PI-HP",
    source: "手册2 p017（型号说明-DV3系列）· **8 段**（无「其余端口」段）",
    segments: [
      MATERIAL,
      { no: 2, name: "阀门系列", en: "Series", options: [{ code: "DV3", label: "低压大流量隔膜阀" }] },
      { no: 3, name: "流道形式", en: "Flow pattern", options: [{ code: "2A", label: "直通型" }] },
      port(4, "入口形式、尺寸", PORTS_DV3),
      port(5, "出口形式、尺寸", PORTS_DV3, FLOW_NOTE),
      DRIVE_SIMPLE,
      { no: 7, name: "阀座材质", en: "Seat", note: "缺省：PCTFE", options: [{ code: "", label: "PCTFE（缺省）", isDefault: true }, { code: "PI", label: "Vespel" }] },
      { ...CLEAN, no: 8 },
    ],
  },
  {
    key: "DV4",
    name: "高压小流量隔膜阀",
    example: "316L-DV43A-FMR4-FMR4-MR4-NC-PI-HP",
    source: "手册2 p020（型号说明-DV4系列）",
    segments: [
      MATERIAL,
      { no: 2, name: "阀门系列", en: "Series", options: [{ code: "DV4", label: "高压小流量隔膜阀" }] },
      { no: 3, name: "流道形式", en: "Flow pattern", note: FLOW_DIAGRAM, options: [{ code: "3A", label: "两入口·一出口（3 流道）" }, { code: "2A", label: "直通（2 流道）" }] },
      port(4, "入口形式、尺寸", PORTS_DV1),
      port(5, "出口形式、尺寸", PORTS_DV1, FLOW_NOTE),
      port(6, "其余端口形式、尺寸", PORTS_DV1, FLOW_NOTE),
      DRIVE_STD,
      { no: 8, name: "阀座材质", en: "Seat", note: "缺省：PCTFE", options: [{ code: "", label: "PCTFE（缺省）", isDefault: true }, { code: "PI", label: "Vespel" }] },
      CLEAN,
    ],
  },
  {
    key: "DV5",
    name: "高压中流量隔膜阀",
    example: "316L-DV53A-FMR8-FMR8-MR8-NC-PI-HP",
    source: "手册2 p023（型号说明-DV5系列）",
    segments: [
      MATERIAL,
      { no: 2, name: "阀门系列", en: "Series", options: [{ code: "DV5", label: "高压中流量隔膜阀" }] },
      { no: 3, name: "流道形式", en: "Flow pattern", note: FLOW_DIAGRAM, options: [{ code: "3A", label: "两入口·一出口（3 流道）" }, { code: "2A", label: "直通（2 流道）" }] },
      port(4, "入口形式、尺寸", PORTS_DV2),
      port(5, "出口形式、尺寸", PORTS_DV2, FLOW_NOTE),
      port(6, "其余端口形式、尺寸", PORTS_DV2, FLOW_NOTE),
      DRIVE_STD,
      { no: 8, name: "阀座材质", en: "Seat", note: "缺省：PCTFE", options: [{ code: "", label: "PCTFE（缺省）", isDefault: true }, { code: "PI", label: "Vespel" }] },
      CLEAN,
    ],
  },
  {
    key: "DV6",
    name: "中压中流量隔膜阀",
    example: "316L-DV63A-FMR8-FMR8-MR8-NC-PA-HP",
    source: "手册2 p026（型号说明-DV6系列）",
    segments: [
      MATERIAL,
      { no: 2, name: "阀门系列", en: "Series", options: [{ code: "DV6", label: "中压中流量隔膜阀" }] },
      { no: 3, name: "流道形式", en: "Flow pattern", note: FLOW_DIAGRAM, options: [{ code: "3A", label: "两入口·一出口（3 流道）" }, { code: "2A", label: "直通（2 流道）" }] },
      port(4, "入口形式、尺寸", PORTS_DV2),
      port(5, "出口形式、尺寸", PORTS_DV2, FLOW_NOTE),
      port(6, "其余端口形式、尺寸", PORTS_DV2, FLOW_NOTE),
      DRIVE_STD,
      { no: 8, name: "阀座材质", en: "Seat", note: "缺省：PCTFE", options: [{ code: "", label: "PCTFE（缺省）", isDefault: true }, { code: "PA", label: "PFA" }] },
      CLEAN,
    ],
  },
  {
    key: "DV7",
    name: "高压弹簧隔膜阀",
    example: "316L-DV73A-FMR4-FMR4-MR4-NC-PI-HP",
    source: "手册2 p030（型号说明-DV7系列）",
    segments: [
      MATERIAL,
      { no: 2, name: "阀门系列", en: "Series", options: [{ code: "DV7", label: "高压弹簧隔膜阀" }] },
      { no: 3, name: "流道形式", en: "Flow pattern", note: FLOW_DIAGRAM, options: [{ code: "3A", label: "两入口·一出口（3 流道）" }, { code: "2A", label: "直通（2 流道）" }] },
      port(4, "入口形式、尺寸", PORTS_DV1),
      port(5, "出口形式、尺寸", PORTS_DV1, FLOW_NOTE),
      port(6, "其余端口形式、尺寸", PORTS_DV1, FLOW_NOTE),
      DRIVE_STD,
      { no: 8, name: "阀座材质", en: "Seat", note: "缺省：PCTFE", options: [{ code: "", label: "PCTFE（缺省）", isDefault: true }, { code: "PI", label: "Vespel" }] },
      CLEAN,
    ],
  },
];

/** 供 UI 展示的"段位速查"（ALD 系列 12 段，结构最复杂，单独给出） */
export const ALD_SEGMENTS: { no: number; name: string; values: string }[] = [
  { no: 1, name: "阀体材料", values: "316L / 6V（316L VAR）/ 6VV（316L VIM-VAR）" },
  { no: 2, name: "产品系列", values: "ALD3（标准）/ ALD3T（耐热）/ ALD6（标准）/ ALD6T（耐热）" },
  { no: 3, name: "流道形式", values: "缺省 C-Seal 和 W-Seal（见流道示意图）" },
  { no: 4, name: "入口形式和尺寸", values: 'FMR4 1/4"面密封内螺纹 / MR4 整体外螺纹 / SMR4 可旋转外螺纹 / TB4 英制对焊' },
  { no: 5, name: "出口形式和尺寸", values: '缺省同入口；CS18-3 1.125"三孔C-Seal / WS18-3 / CS24-2 1.5"两孔 / CS24-3' },
  { no: 6, name: "其余端口形式和尺寸", values: '缺省同入口；CS24H-2/CS24H-3（1.5" 高流量）/ WS18-2 / FMR8 1/2" / SMR8 / TB8' },
  { no: 7, name: "驱动类型", values: "缺省手动 / NO 气动常开 / NC 气动常闭" },
  { no: 8, name: "电磁导阀组件", values: "缺省无 / V：电磁阀组" },
  { no: 9, name: "位置传感器", values: "缺省无 / S1 常闭传感器 / S2 常开传感器" },
  { no: 10, name: "气源接口", values: "缺省 1/8-27 NPT / PQ4 4mm 气动弯头 / PU4 4mm 气动直通" },
  { no: 11, name: "其他", values: "（手册 p007 该项与第 6 段相邻，原页排版拆行；如需精确值请以原页渲染图为准）" },
  { no: 12, name: "工艺规范", values: "UHP：超高纯工艺规范" },
];

/** 按产品型号/货号匹配手册系列（如 `DV13A` → DV1；`6V-ALD32A` → ALD） */
export function findManualSeries(text: string): ManualSeries | null {
  const t = String(text || "").toUpperCase();
  if (!t) return null;
  // 先匹配更长的 key（DV1 先于 DV；ALD 单独）
  const keys = [...MANUAL_SERIES].sort((a, b) => b.key.length - a.key.length);
  return keys.find((s) => new RegExp(`${s.key}(?![0-9A-Z])`).test(t) || t.includes(`${s.key}3`) || t.includes(`${s.key}2`)) || null;
}

/**
 * 用手册规则**解析**一个订货号（把每段对上手册取值）。
 * 返回 null 表示段数不匹配（说明不是该系列的规则号）。
 * ⚠️ 只做"解读"，**不判定合法性** —— 手册明确"不能随意组合"，是否可下单要看库里有没有该机型。
 */
export function parseByManual(code: string, series: ManualSeries): { no: number; name: string; value: string; meaning: string }[] | null {
  const parts = String(code || "").trim().split("-").filter(Boolean);
  // 手册示例：材料-系列+流道-入口-出口-其余端口-驱动-阀座-洁净度
  if (parts.length < 2) return null;
  const out: { no: number; name: string; value: string; meaning: string }[] = [];
  const segs = series.segments;
  // 第 1 段材料、第 2 段"系列+流道"连写（如 DV13A）
  out.push({ no: segs[0].no, name: segs[0].name, value: parts[0], meaning: segs[0].options.find((o) => o.code === parts[0])?.label || "" });
  if (parts[1]) {
    const s2 = segs[1];
    out.push({ no: s2.no, name: s2.name, value: parts[1], meaning: s2.options.find((o) => o.code === parts[1])?.label || `${series.name}` });
  }
  /**
   * ⚠️ 手册的**第 3 段「流道形式」与第 2 段「系列」连写**（示例 `DV13A` = DV1 + 3A），
   *   所以第 3 个及之后的横杠片段对应的是 **segs.slice(3)**（段 4 入口、段 5 出口…）。
   *   踩过：早期按下标 segs[i] 取值，会把入口 FMR4 错配到"流道形式"上。
   */
  const rest = segs.slice(3);
  for (let i = 2; i < parts.length; i++) {
    const seg = rest[i - 2];
    if (!seg) break;
    out.push({ no: seg.no, name: seg.name, value: parts[i], meaning: seg.options.find((o) => o.code === parts[i])?.label || "" });
  }
  return out;
}
