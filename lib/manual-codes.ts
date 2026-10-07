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
  /**
   * 本段与**下一段**在手册里是**连写**的（如 `DV1` + `3A` → `DV13A`）。
   * 默认 `true`（手册2 的写法：系列+流道形式连写）；手册1 里有几个系列**不连写**，显式写 `false`。
   */
  mergeNext?: boolean;
}

export interface ManualSeries {
  /** 系列代号（用于匹配产品型号/货号） */
  key: string;
  /**
   * 匹配产品型号用的正则（**可省**）。
   * 手册1 的接头系列是**单个字母**（I / B / G / O），且后面紧跟形态字母（`316L-GN-FMR4` 的 `GN`），
   * 默认的"key 后面不能跟字母数字"规则会漏掉它们 ⇒ 这类系列必须自带 pattern。
   */
  pattern?: RegExp;
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

/* ==========================================================================
 * 手册1《高纯管阀件》—— 型号规则
 * ==========================================================================
 * 口径（owner 2026-10-08「可以」）：与手册2 同一套做法，**逐字转录手册原文**，不推断。
 *
 * 手册1 有 **「型号说明-XXX系列」页** 的系列（→ 段位可逐段转录，货号生成器可用）：
 *   p102 CV3 · p107 BSM · p112 FT4 · p115 FT5 · p118 FT6
 * 手册1 **只给「订购信息」表**（没有型号说明页）的系列（→ 只登记系列，段位留空）：
 *   焊接接头 I/B（p007–p017）· 面密封接头 G/O（p018–p048）
 * 两本手册都**没有规则页**的系列（→ 只登记系列，段位留空；规格数值来自对应目录页）：
 *   球阀 BV1–BV5 · 针阀 NV1/3/5 · 波纹管阀 BSV1/2 · 阀组 MAN/2V · 气体过滤器家族 GAS
 *   —— 这些系列的手册只有"订购信息/尺寸表"，逐行枚举几百个基础订购号，没有段位规则可转录；
 *      界面上**不硬造**生成器（仍退回"从已有机型货号推导"），但"手册规格（数值）"表与
 *      「接口与端接」手册兜底**照常生效**。
 *
 * ⚠️ 段位留空的条目：`segments: []` + `example: ""` —— UI 会据此跳过"按手册生成"分支。
 */

const BODY_MATERIAL: CodeSegment = {
  no: 1,
  name: "阀体材料",
  en: "Body material",
  options: [
    { code: "316L", label: "316L" },
    { code: "6V", label: "316L VAR" },
    { code: "6VV", label: "316L VIM-VAR" },
  ],
};
const PROCESS_STD: CodeSegment = {
  no: 5,
  name: "工艺规范",
  en: "Process spec",
  options: [
    { code: "GP", label: "标准工艺规范" },
    { code: "HP", label: "高纯工艺规范" },
    { code: "UHP", label: "超高纯工艺规范" },
  ],
};
const OUTLET_SAME: (opts: CodeOption[]) => CodeSegment = (opts) => ({
  no: 5,
  name: "出口形式和尺寸",
  en: "Outlet form & size",
  note: "缺省：与入口相同；其他形式见「入口形式和尺寸」",
  options: [{ code: "", label: "与入口相同（缺省）", isDefault: true }, ...opts],
});

export const MANUAL_SERIES_1: ManualSeries[] = [
  /* —— 单向阀 CV3（手册1 p102）—— */
  {
    key: "CV3",
    name: "CV3 系列 全焊接单向阀",
    example: "316L-CV3-FMR4-N-HP",
    source: "手册1 p102（型号说明-CV3系列）",
    segments: [
      BODY_MATERIAL,
      { no: 2, name: "产品系列", en: "Series", mergeNext: false, options: [{ code: "CV3", label: "CV3 系列" }] },
      {
        no: 3,
        name: "进出口形式和尺寸",
        en: "Inlet/outlet form & size",
        mergeNext: false,
        options: [
          { code: "FMR4", label: '1/4" 内螺纹面密封' },
          { code: "MR4", label: '1/4" 整体外螺纹面密封' },
          { code: "SMR4", label: '1/4" 可旋转外螺纹面密封' },
          { code: "TB4", label: '1/4" 对焊接口' },
          { code: "FMR8", label: '1/2" 内螺纹面密封' },
          { code: "MR8", label: '1/2" 整体外螺纹面密封' },
          { code: "SMR8", label: '1/2" 可旋转外螺纹面密封' },
          { code: "TB8", label: '1/2" 对焊接口' },
        ],
      },
      {
        no: 4,
        name: "密封材料",
        en: "Seal material",
        note: "缺省：氟橡胶（FKM）",
        options: [
          { code: "", label: "氟橡胶（FKM）（缺省）", isDefault: true },
          { code: "N", label: "丁腈橡胶（NBR）" },
          { code: "E", label: "三元乙丙橡胶（EPDM）" },
          { code: "F", label: "全氟橡胶（FFKM）" },
        ],
      },
      { ...PROCESS_STD, no: 5 },
    ],
  },
  /* —— 计量阀 BSM（手册1 p107）—— */
  {
    key: "BSM",
    name: "BSM 系列 波纹管计量阀",
    example: "316-BSM2A-MR4-FMR4-G-W-HP",
    source: "手册1 p107（型号说明-BSM系列）",
    segments: [
      {
        no: 1,
        name: "阀体材料",
        en: "Body material",
        options: [
          { code: "316L", label: "316L" },
          { code: "316", label: "316SS" },
        ],
      },
      { no: 2, name: "阀门系列", en: "Series", options: [{ code: "BSM", label: "波纹管计量阀" }] },
      { no: 3, name: "流道形式", en: "Flow pattern", options: [{ code: "2A", label: "直通" }] },
      {
        no: 4,
        name: "入口形式和尺寸",
        en: "Inlet",
        mergeNext: false,
        options: [
          { code: "FMR4", label: '1/4" 金属面密封内螺纹' },
          { code: "MR4", label: '1/4" 金属面密封整体外螺纹' },
          { code: "FMR8", label: '1/2" 金属面密封内螺纹' },
          { code: "F4", label: '1/4" 英制卡套端口' },
          { code: "F6M", label: "6 mm 公制卡套端口" },
          { code: "TW4", label: '1/4" 英制管承插焊或 3/8" 英制管对焊' },
        ],
      },
      OUTLET_SAME([
        { code: "FMR4", label: '1/4" 金属面密封内螺纹' },
        { code: "MR4", label: '1/4" 金属面密封整体外螺纹' },
        { code: "FMR8", label: '1/2" 金属面密封内螺纹' },
        { code: "F4", label: '1/4" 英制卡套端口' },
        { code: "F6M", label: "6 mm 公制卡套端口" },
        { code: "TW4", label: '1/4" 英制管承插焊或 3/8" 英制管对焊' },
      ]),
      {
        no: 6,
        name: "阀杆头类型",
        en: "Stem head",
        options: [
          { code: "G", label: "计量型" },
          { code: "RG", label: "调节型" },
        ],
      },
      {
        no: 7,
        name: "阀门密封形式",
        en: "Seal form",
        note: "缺省：垫片密封",
        options: [
          { code: "", label: "垫片密封（缺省）", isDefault: true },
          { code: "W", label: "焊接形式" },
        ],
      },
      { ...PROCESS_STD, no: 8, options: [{ code: "GP", label: "标准工艺规范" }, { code: "HP", label: "高纯工艺规范" }] },
    ],
  },
  /* —— 气体过滤器 FT4 / FT5 / FT6（手册1 p112 / p115 / p118）—— */
  {
    key: "FT4",
    name: "FT4 系列 粉末烧结滤芯过滤器",
    example: "316L-FT4-MR4-05-HP",
    source: "手册1 p112（型号说明-FT4系列）",
    segments: [
      { ...BODY_MATERIAL, options: [{ code: "316L", label: "316L" }, { code: "6V", label: "316L VAR" }] },
      { no: 2, name: "产品系列", en: "Series", mergeNext: false, options: [{ code: "FT4", label: "粉末烧结滤芯气体过滤器" }] },
      {
        no: 3,
        name: "入口形式和尺寸",
        en: "Inlet form & size",
        mergeNext: false,
        options: [
          { code: "MR2", label: '1/8" 外螺纹金属面密封' },
          { code: "MR4", label: '1/4" 外螺纹金属面密封' },
          { code: "MR8", label: '1/2" 外螺纹金属面密封' },
          { code: "F2", label: '1/8" 双卡套' },
          { code: "F4", label: '1/4" 双卡套' },
          { code: "F8", label: '1/2" 双卡套' },
          { code: "N2", label: '1/8" NPT 外螺纹' },
          { code: "N4", label: '1/4" NPT 外螺纹' },
          { code: "N8", label: '1/2" NPT 外螺纹' },
        ],
      },
      OUTLET_SAME([
        { code: "MR2", label: '1/8" 外螺纹金属面密封' },
        { code: "MR4", label: '1/4" 外螺纹金属面密封' },
        { code: "MR8", label: '1/2" 外螺纹金属面密封' },
        { code: "F2", label: '1/8" 双卡套' },
        { code: "F4", label: '1/4" 双卡套' },
        { code: "F8", label: '1/2" 双卡套' },
        { code: "N2", label: '1/8" NPT 外螺纹' },
        { code: "N4", label: '1/4" NPT 外螺纹' },
        { code: "N8", label: '1/2" NPT 外螺纹' },
      ]),
      {
        no: 7,
        name: "滤芯精度",
        en: "Element rating",
        options: [
          { code: "05", label: "0.5 μm" },
          { code: "2", label: "2 μm" },
          { code: "5", label: "5 μm" },
          { code: "15", label: "15 μm" },
          { code: "40", label: "40 μm" },
          { code: "60", label: "60 μm" },
          { code: "80", label: "80 μm" },
        ],
      },
      { ...PROCESS_STD, no: 8, options: [{ code: "GP", label: "标准工艺规范" }, { code: "HP", label: "高纯工艺规范" }] },
    ],
  },
  ...([
    ["FT5", "FT5 系列 陶瓷滤芯过滤器", "316L-FT5-MR4-F120-UHP", "手册1 p115（型号说明-FT5系列）", "陶瓷滤芯气体过滤器", [
      ["F60", "60 标准升/分钟"],
      ["F120", "120 标准升/分钟"],
      ["F200", "200 标准升/分钟"],
      ["F300", "300 标准升/分钟"],
    ]] as [string, string, string, string, string, [string, string][]],
    ["FT6", "FT6 系列 不锈钢滤芯过滤器", "316L-FT6-MR4-F120-UHP", "手册1 p118（型号说明-FT6系列）", "不锈钢滤芯气体过滤器", [
      ["F15", "15 标准升/分钟"],
      ["F120", "120 标准升/分钟"],
      ["F300", "300 标准升/分钟"],
    ]] as [string, string, string, string, string, [string, string][]],
  ]).map(([key, name, example, source, seriesLabel, flows]) => ({
    key,
    name,
    example,
    source,
    segments: [
      { ...BODY_MATERIAL, options: [{ code: "316L", label: "316L" }, { code: "6V", label: "316L VAR" }] },
      { no: 2, name: "产品系列", en: "Series", mergeNext: false, options: [{ code: key, label: seriesLabel }] },
      {
        no: 3,
        name: "入口形式和尺寸",
        en: "Inlet form & size",
        mergeNext: false,
        options: [
          { code: "MR4", label: '1/4" 外螺纹金属面密封' },
          { code: "MR8", label: '1/2" 外螺纹金属面密封' },
        ],
      },
      OUTLET_SAME([
        { code: "MR4", label: '1/4" 外螺纹金属面密封' },
        { code: "MR8", label: '1/2" 外螺纹金属面密封' },
      ]),
      { no: 7, name: "额定流量", en: "Rated flow", options: flows.map(([code, label]) => ({ code, label })) },
      { ...PROCESS_STD, no: 8, options: [{ code: "UHP", label: "超高纯工艺规范" }] },
    ],
  })),
];

/** 手册里**有规格数值、但没有型号段位规则**的系列（登记系列名即可：规格表与「接口与端接」兜底据此生效） */
const SERIES_NO_RULE: [string, string, string, string][] = [
  // key, 系列中文名, 手册出处, 手册里的一个真实订购号（仅作展示）
  ["ALD", "ALD 系列 原子层沉积隔膜阀", "手册2 p007 / 手册1 p055（型号说明-ALD系列；段位含「电磁导阀/传感器」合并写法，暂不转录）", "6V-ALD33A-FMR4-FMR4-MR4-NC-VS-UHP"],
  ["PRE1", "PRE1 系列 小流量减压阀", "手册1 p083（型号说明-PRE1系列；12 段中「入口压力+出口压力」连写为一个 2 字母段，暂不转录）", "316L-PRE1C-SMR4-BC-OG-PI1-P-HP"],
  ["PRE2", "PRE2 系列 小流量灵敏减压阀", "手册1 p086（型号说明-PRE2系列；同上）", "316L-PRE2C-SMR4-BC-OG-PI-P-HP"],
  ["PRE3", "PRE3 系列 大流量灵敏减压阀", "手册1 p089（型号说明-PRE3系列；同上）", "316L-PRE3C-SMR4-AC-OG-PI-P-HP"],
  ["PRT1", "PRT1 系列 小流量减压阀（联结膜片）", "手册1 p092（型号说明-PRT1系列；同上）", "316L-PRT1C-SMR4-BC-OG-PI1-P-HP"],
  ["PRT2", "PRT2 系列 小流量灵敏减压阀（联结膜片）", "手册1 p095（型号说明-PRT2系列；同上）", "316L-PRT2C-SMR4-BC-OG-PI-P-HP"],
  ["PRT3", "PRT3 系列 大流量灵敏减压阀（联结膜片）", "手册1 p098（型号说明-PRT3系列；同上）", "316L-PRT3C-SMR4-AC-OG-PI-P-HP"],
  ["I", "I 系列 微焊接接头", "手册1 p007–p014（I 系列订购信息表）", "316L-IU-TB8-TB4-HP"],
  ["B", "B 系列 长焊接接头", "手册1 p015–p017（B 系列订购信息表）", "316L-BU-TB8-TB4-HP"],
  ["G", "G 系列 金属面密封接头", "手册1 p018–p039（G 系列订购信息表）", "316L-GU-MR4-HP"],
  ["O", "O 系列 O 形圈面密封接头", "手册1 p040–p048（O 系列订购信息表）", "316L-OU-OR4-N4-HP"],
  ["BV1", "BV1 系列 一体式仪表球阀", "球阀目录页（两本手册均无型号规则页）", ""],
  ["BV2", "BV2 系列 三片式球阀（低压）", "球阀目录页", ""],
  ["BV3", "BV3 系列 三片式球阀（高压）", "球阀目录页", ""],
  ["BV4", "BV4 系列 冷拔棒料球阀", "球阀目录页", ""],
  ["BV5", "BV5 / BV5C 系列 六方棒料球阀", "球阀目录页", ""],
  ["NV1", "NV1 系列 锻造阀体针阀", "针阀目录页", ""],
  ["NV3", "NV3 系列 整体式阀帽针阀", "针阀目录页", ""],
  ["NV5", "NV5 系列 活接阀帽针阀", "针阀目录页", ""],
  ["BSV1", "BSV1 系列 波纹管阀", "波纹管阀目录页", ""],
  ["BSV2", "BSV2 系列 波纹管阀", "波纹管阀目录页", ""],
  ["MAN", "仪表阀组", "阀组目录页", ""],
  ["2V", "二阀组 2D / 2R / 2DH / 2RH", "阀组目录页", ""],
  ["GAS", "气体过滤器 · 高纯气体过滤家族", "过滤器目录页", ""],
];

for (const [key, name, source, example] of SERIES_NO_RULE) {
  MANUAL_SERIES_1.push({
    key,
    name,
    source,
    example,
    segments: [],
    /**
     * 单字母系列（I/B/G/O）与 2V：默认规则（"key 后面不能跟字母数字"）匹配不到两类真实型号 ——
     *   · 形态连写：`316L-GN-FMR4` / `316L-IE-TB4`
     *   · 系列级页面：`G Series` / `I Series` / `B Series` / `O Series`
     * ⚠️ 形态字母后**只允许紧跟 `-`/空白/结尾**（不允许数字）——
     *   否则 `BV6/BV6H` 会被 B（长焊接接头）抢走，`GV/GVH` 会被 G（金属面密封接头）抢走。
     */
    ...(key.length === 1 ? { pattern: new RegExp(`(^|[-\\s])${key}(?:[A-Z]{1,3})?(?=[-\\s]|$)`) } : {}),
    ...(key === "2V" ? { pattern: /(^|[-\s])2[DR](H)?(?=[-\d]|$)/ } : {}),
  });
}

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
  // 先匹配更长的 key（DV1 先于 DV；BSM 先于 B；GJS 无 → G）
  const all = [...MANUAL_SERIES, ...MANUAL_SERIES_1].sort((a, b) => b.key.length - a.key.length);
  return (
    all.find((s) =>
      s.pattern
        ? s.pattern.test(t)
        : new RegExp(`${s.key}(?![0-9A-Z])`).test(t) || t.includes(`${s.key}3`) || t.includes(`${s.key}2`)
    ) || null
  );
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
