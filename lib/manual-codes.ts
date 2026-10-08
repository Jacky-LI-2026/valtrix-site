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
import { CONN_CODES } from "./manual-conn-codes";

export interface CodeOption {
  /** 代号（写入货号的那一段） */
  code: string;
  /** 中文含义（手册原文） */
  label: string;
  /** 英文含义（**可选**：数据自带英文时优先用它，避免术语表猜译，如接头订购信息表） */
  labelEn?: string;
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
   * 规则来源形态：
   *   · `model-rule`（默认）= 手册有「型号说明-XXX系列」页，段位逐段转录；
   *   · `order-table` = 手册只有「订购信息表」（接头 I/B/G/O）—— 段位是**枚举的基础订购号**。
   * 只影响生成器提示文案（别把"型号说明"这四个字用在没有该页的系列上）。
   */
  ruleKind?: "model-rule" | "order-table";
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

/**
 * **连写段**：手册把两个段位**不加分隔地拼在一起**（如 `PRE1`+`C`→`PRE1C`、入口压力`B`+出口压力`C`→`BC`），
 * 于是生成器不能按段位逐个加 `-`，必须在数据层就给出**拼好的取值**。
 * ⚠️ 拼出来为空串的组合（两个段位都是缺省）**直接丢弃** —— 那种情况等价于"这一段留空"。
 */
function crossOptions(
  name: string,
  en: string,
  left: CodeOption[],
  right: CodeOption[],
  opts: { no?: number; note?: string; sep?: string; mergeNext?: boolean } = {}
): CodeSegment {
  const sep = opts.sep ?? " · ";
  const out: CodeOption[] = [];
  const seen = new Set<string>();
  for (const x of left) {
    for (const y of right) {
      const code = `${x.code}${y.code}`;
      if (!code || seen.has(code)) continue;
      seen.add(code);
      out.push({
        code,
        label: [x.label, y.label].filter(Boolean).join(sep),
        isDefault: !!x.isDefault && !!y.isDefault,
      });
    }
  }
  return { no: opts.no ?? 0, name, en, note: opts.note, mergeNext: opts.mergeNext ?? false, options: out };
}

/** ALD 系列入口/出口/其余端口共用的端口清单（手册2 p007 原文） */
const ALD_PORTS: CodeOption[] = [
  { code: "FMR4", label: '1/4" 金属面密封内螺纹' },
  { code: "MR4", label: '1/4" 金属面密封整体外螺纹' },
  { code: "SMR4", label: '1/4" 金属面密封可旋转外螺纹' },
  { code: "TB4", label: '1/4" 英制对焊管' },
  { code: "FMR8", label: '1/2" 金属面密封内螺纹' },
  { code: "SMR8", label: '1/2" 金属面密封可旋转外螺纹' },
  { code: "TB8", label: '1/2" 英制对焊管' },
  { code: "CS18-2", label: '1.125" 两孔 C-Seal' },
  { code: "CS18-3", label: '1.125" 三孔 C-Seal' },
  { code: "WS18-2", label: '1.125" 两孔 W-Seal' },
  { code: "WS18-3", label: '1.125" 三孔 W-Seal' },
  { code: "CS24-2", label: '1.5" 两孔 C-Seal' },
  { code: "CS24-3", label: '1.5" 三孔 C-Seal' },
  { code: "WS24-2", label: '1.5" 两孔 W-Seal' },
  { code: "WS24-3", label: '1.5" 三孔 W-Seal' },
  { code: "CS24H-2", label: '1.5" 两孔 C-Seal（高流量）' },
  { code: "CS24H-3", label: '1.5" 三孔 C-Seal（高流量）' },
];

/* --------------------------------------------------------------------------
 * 减压阀 6 系列（手册1 p083/086/089/092/095/098）
 * --------------------------------------------------------------------------
 * 这套 12 段位里手册把**三对**段位连写（不加分隔）：
 *   ②产品系列 + ③端口配置     → `PRE1C`
 *   ⑥入口压力 + ⑦出口压力     → `BC`
 *   ⑨阀座材料 + ⑩流量系数     → `PI1`
 * 所以生成器按段位逐个加 `-` 会拼出错号 ⇒ 用 `crossOptions()` 在**数据层**给出拼好的取值。
 * ⑤出口形式（缺省=与入口相同）与⑪附加选项（缺省=无）在手册举例里直接省略 ⇒ 对应"整段留空"。
 */
interface RegulatorSpec {
  key: string;
  name: string;
  example: string;
  source: string;
  portConfigs: [string, string][];
  inlets: [string, string][];
  inletPressure: [string, string][];
  outletPressure: [string, string][];
  /** 流量系数（第九/十段连写用）：`["", "0.09（缺省）"]` + 可选 `["1", "0.15"]` */
  cv: [string, string][];
}

/** 端口配置 A/B/C/F（手册1 各减压阀页原文，B/C 的文字相同 ⇒ 加代号前缀便于区分） */
const REG_PORT_CONFIGS: [string, string][] = [
  ["A", "2通，无压力表端口"],
  ["B", "3通，带出口压力表端口"],
  ["C", "3通，带出口压力表端口"],
  ["F", "4通，带出、入口压力表端口"],
];
/** 压力表配置（各系列原文一致） */
const REG_GAUGE: CodeOption[] = [
  { code: "", label: "无压力表（缺省）", isDefault: true },
  { code: "OG", label: "出口压力表 psi/bar" },
  { code: "IO", label: "出、入口压力表 psi/bar" },
  { code: "PG", label: "堵头" },
  { code: "OGM", label: "出口压力表 psi/MPa" },
];
const REG_EXTRA: CodeOption[] = [
  { code: "", label: "无其他附加要求（缺省）", isDefault: true },
  { code: "P", label: "面板安装" },
];
const REG_SEAT: CodeOption[] = [
  { code: "", label: "PCTFE（缺省）", isDefault: true },
  { code: "PI", label: "Vespel" },
];

function regulatorSeries(s: RegulatorSpec): ManualSeries {
  const inletOpts: CodeOption[] = s.inlets.map(([code, label]) => ({ code, label }));
  const cvOpts: CodeOption[] = s.cv.map(([code, label]) => ({ code, label, isDefault: !code }));
  return {
    key: s.key,
    name: s.name,
    example: s.example,
    source: s.source,
    segments: [
      {
        no: 1,
        name: "材料",
        en: "Material",
        options: [
          { code: "316L", label: "316L" },
          { code: "6V", label: "316L VAR" },
        ],
      },
      // ②+③ 连写：PRE1 + C → PRE1C
      crossOptions("产品系列 + 端口配置", "Series + port config", [{ code: s.key, label: "" }], s.portConfigs.map(([c, l]) => ({ code: c, label: `${c}: ${l}` })), {
        no: 2,
        sep: "",
        mergeNext: false,
      }),
      { no: 4, name: "入口形式和尺寸", en: "Inlet form & size", mergeNext: false, options: inletOpts },
      OUTLET_SAME(inletOpts),
      // ⑥+⑦ 连写：入口压力 B + 出口压力 C → BC
      crossOptions("入口压力 + 出口压力", "Inlet + outlet pressure", s.inletPressure.map(([c, l]) => ({ code: c, label: l })), s.outletPressure.map(([c, l]) => ({ code: c, label: l })), {
        no: 6,
        mergeNext: false,
      }),
      { no: 8, name: "压力表配置", en: "Gauge config", note: "缺省：无压力表", options: REG_GAUGE },
      // ⑨+⑩ 连写：阀座 PI + 流量系数 1 → PI1
      crossOptions("阀座材料 + 流量系数", "Seat + flow coefficient", REG_SEAT, cvOpts, { no: 9, mergeNext: false }),
      { no: 11, name: "附加选项", en: "Additional options", options: REG_EXTRA },
      { ...PROCESS_STD, no: 12 },
    ],
  };
}

export const MANUAL_SERIES_1: ManualSeries[] = [
  /* —— ALD 系列（12 段位；手册2 p007 / 手册1 p055）：②系列+③流道连写（`ALD3`+`3A`→`ALD33A`），
        ⑨电磁导阀组件+⑩位置传感器 在手册举例里同样连写（`VS`）—— 该取值直接从手册型号举例取。 —— */
  {
    key: "ALD",
    name: "ALD 系列 原子层沉积隔膜阀",
    example: "6V-ALD33A-FMR4-FMR4-MR4-NC-VS-UHP",
    source: "手册2 p007（型号说明-ALD系列；与手册1 p055 同页）",
    segments: [
      BODY_MATERIAL,
      {
        no: 2,
        name: "产品系列",
        en: "Series",
        options: [
          { code: "ALD3", label: "标准" },
          { code: "ALD3T", label: "耐热" },
          { code: "ALD6", label: "标准" },
          { code: "ALD6T", label: "耐热" },
        ],
      },
      {
        no: 3,
        name: "流道形式",
        en: "Flow pattern",
        note: "缺省：C-Seal 和 W-Seal；参照手册「流道形式示意图」",
        options: ["2A", "2B", "2C", "2D", "3A", "3B", "3C", "3D", "3E", "3F", "3G", "4A", "4B", "4C", "4D"].map((c) => ({
          code: c,
          label: `${c.slice(0, 1)} 流道`,
        })),
      },
      { no: 4, name: "入口形式和尺寸", en: "Inlet", mergeNext: false, options: ALD_PORTS },
      OUTLET_SAME(ALD_PORTS),
      { ...OUTLET_SAME(ALD_PORTS), no: 6, name: "其余端口形式和尺寸", en: "Other ports" },
      {
        no: 7,
        name: "驱动类型",
        en: "Actuation",
        options: [
          { code: "", label: "手动（缺省）", isDefault: true },
          { code: "NO", label: "气动常开" },
          { code: "NC", label: "气动常闭" },
        ],
      },
      {
        no: 9,
        name: "电磁导阀组件 + 位置传感器",
        en: "Solenoid valve + position sensor",
        note: "手册把这两段连写（型号举例里为 `VS`）",
        options: [
          { code: "VS", label: "电磁阀组 + 位置传感器（手册型号举例用到）" },
          { code: "V", label: "电磁阀组" },
          { code: "VS1", label: "电磁阀组 + 常闭传感器" },
          { code: "VS2", label: "电磁阀组 + 常开传感器" },
        ],
      },
      {
        no: 11,
        name: "气源接口",
        en: "Air supply port",
        note: "缺省：1/8-27 NPT",
        options: [
          { code: "", label: "1/8-27 NPT（缺省）", isDefault: true },
          { code: "PQ4", label: "4 mm 气动弯头" },
          { code: "PU4", label: "4 mm 气动直通" },
        ],
      },
      { ...PROCESS_STD, no: 12, options: [{ code: "UHP", label: "超高纯工艺规范" }] },
    ],
  },
  /* —— 减压阀 PRE1/PRE2/PRE3 + PRT1/PRT2/PRT3（连写段已建模）—— */
  regulatorSeries({
    key: "PRE1",
    name: "PRE1 系列 小流量减压阀",
    example: "316L-PRE1C-SMR4-BC-OG-PI1-P-HP",
    source: "手册1 p083（型号说明-PRE1系列）",
    portConfigs: REG_PORT_CONFIGS,
    inlets: [
      ["SMR4", '1/4" 活接/外螺纹金属面密封'],
      ["SMR8", '1/2" 活接/外螺纹金属面密封'],
      ["FMR4", '1/4" 活接/内螺纹金属面密封'],
      ["FMR8", '1/2" 活接/内螺纹金属面密封'],
    ],
    inletPressure: [
      ["A", "0~300 psig（出口压力为 0.5~10 psig 时选择）"],
      ["B", "0~3500 psig"],
    ],
    outletPressure: [
      ["A", "0.5~10 psig"],
      ["B", "1~30 psig"],
      ["C", "2~60 psig"],
      ["D", "2~100 psig"],
      ["E", "5~150 psig"],
      ["F", "5~300 psig"],
    ],
    cv: [
      ["", "0.09（缺省）"],
      ["1", "0.15"],
    ],
  }),
  regulatorSeries({
    key: "PRE2",
    name: "PRE2 系列 小流量灵敏减压阀",
    example: "316L-PRE2C-SMR4-BC-OG-PI-P-HP",
    source: "手册1 p086（型号说明-PRE2系列）",
    portConfigs: REG_PORT_CONFIGS,
    inlets: [
      ["SMR4", '1/4" 活接/外螺纹金属面密封'],
      ["SMR8", '1/2" 活接/外螺纹金属面密封'],
      ["FMR4", '1/4" 活接/内螺纹金属面密封'],
      ["FMR8", '1/2" 活接/内螺纹金属面密封'],
    ],
    inletPressure: [
      ["A", "0~100 psig（出口压力为 0.5~10 psig 时选择）"],
      ["B", "0~3500 psig"],
    ],
    outletPressure: [
      ["A", "0.5~10 psig"],
      ["B", "1~30 psig"],
      ["C", "2~60 psig"],
      ["D", "2~100 psig"],
      ["E", "5~150 psig"],
    ],
    cv: [["", "0.13（缺省）"]],
  }),
  regulatorSeries({
    key: "PRE3",
    name: "PRE3 系列 大流量灵敏减压阀",
    example: "316L-PRE3C-SMR4-AC-OG-PI-P-HP",
    source: "手册1 p089（型号说明-PRE3系列）",
    portConfigs: REG_PORT_CONFIGS,
    inlets: [
      ["SMR4", '1/4" 活接/外螺纹金属面密封'],
      ["SMR8", '1/2" 活接/外螺纹金属面密封'],
      ["SMR12", '3/4" 活接/外螺纹金属面密封'],
      ["FMR4", '1/4" 活接/内螺纹金属面密封'],
      ["FMR8", '1/2" 活接/内螺纹金属面密封'],
      ["FMR12", '3/4" 活接/内螺纹金属面密封'],
    ],
    inletPressure: [["A", "0~600 psig"]],
    outletPressure: [
      ["A", "1~30 psig"],
      ["B", "2~60 psig"],
      ["C", "2~100 psig"],
      ["D", "5~150 psig"],
    ],
    cv: [["", "1.1（缺省）"]],
  }),
  regulatorSeries({
    key: "PRT1",
    name: "PRT1 系列 小流量减压阀（联结膜片）",
    example: "316L-PRT1C-SMR4-BC-OG-PI1-P-HP",
    source: "手册1 p092（型号说明-PRT1系列）",
    portConfigs: REG_PORT_CONFIGS,
    inlets: [
      ["SMR4", '1/4" 活接/外螺纹金属面密封'],
      ["SMR8", '1/2" 活接/外螺纹金属面密封'],
      ["FMR4", '1/4" 活接/内螺纹金属面密封'],
      ["FMR8", '1/2" 活接/内螺纹金属面密封'],
    ],
    inletPressure: [
      ["A", "0~3500 psig"],
      ["B", "0~4500 psig（当接口为 SMR8、FMR8 或流量系数为 0.15 时，不可选择此项）"],
    ],
    outletPressure: [
      ["A", "1~30 psig"],
      ["B", "2~60 psig"],
      ["C", "2~100 psig"],
    ],
    cv: [
      ["", "0.09（缺省）"],
      ["1", "0.15"],
    ],
  }),
  regulatorSeries({
    key: "PRT2",
    name: "PRT2 系列 小流量灵敏减压阀（联结膜片）",
    example: "316L-PRT2C-SMR4-AC-OG-PI-P-HP",
    source: "手册1 p095（型号说明-PRT2系列）",
    portConfigs: REG_PORT_CONFIGS,
    inlets: [
      ["SMR4", '1/4" 活接/外螺纹金属面密封'],
      ["SMR8", '1/2" 活接/外螺纹金属面密封'],
      ["FMR4", '1/4" 活接/内螺纹金属面密封'],
      ["FMR8", '1/2" 活接/内螺纹金属面密封'],
    ],
    inletPressure: [["A", "0~3500 psig"]],
    outletPressure: [
      ["A", "0.5~10 psig"],
      ["B", "1~30 psig"],
      ["C", "2~60 psig"],
      ["D", "2~100 psig"],
      ["E", "5~150 psig"],
    ],
    cv: [
      ["", "0.13（缺省）"],
      ["1", "0.16"],
    ],
  }),
  regulatorSeries({
    key: "PRT3",
    name: "PRT3 系列 大流量灵敏减压阀（联结膜片）",
    example: "316L-PRT3C-SMR4-BC-OG-PI-P-HP",
    source: "手册1 p098（型号说明-PRT3系列）",
    portConfigs: REG_PORT_CONFIGS,
    inlets: [
      ["SMR4", '1/4" 活接/外螺纹金属面密封'],
      ["SMR8", '1/2" 活接/外螺纹金属面密封'],
      ["SMR12", '3/4" 活接/外螺纹金属面密封'],
      ["FMR4", '1/4" 活接/内螺纹金属面密封'],
      ["FMR8", '1/2" 活接/内螺纹金属面密封'],
      ["FMR12", '3/4" 活接/内螺纹金属面密封'],
    ],
    /** ⚠️ 手册 p098 正文只印了 A（0~1700 psig），但**它自己的型号举例用的是 B**（`…-BC-…`）
     *  ⇒ 把示例用到的 B 一并列出，标签如实写"手册示例用到"，不替手册编数值。 */
    inletPressure: [
      ["A", "0~1700 psig"],
      ["B", "另一档入口压力（手册型号举例用到）"],
    ],
    outletPressure: [
      ["A", "1~30 psig"],
      ["B", "2~60 psig"],
      ["C", "2~100 psig"],
      ["D", "5~150 psig"],
    ],
    cv: [
      ["", "0.9（缺省）"],
      ["1", "1.1"],
    ],
  }),
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

/* --------------------------------------------------------------------------
 * 接头四系列 I / B / G / O —— 手册**没有型号说明页**，只有「订购信息表」
 * --------------------------------------------------------------------------
 * 订购信息表是**逐行枚举**的基础订购号（`GJ-MR4-TB4-12`、`OJW-FOR4-N4`…），没有段位可转录。
 * 若按段位拼装（形态 × 端口 × 端口）会拼出**手册里不存在的组合**；
 * 故这里把手册枚举过的基础订购号直接做成一段下拉（数据见 `lib/manual-conn-codes.ts`，
 * 每条都带手册型式名、中英双语）。
 * 完整订货号 = **材料代码（前缀）** + 基础订购号 + **工艺规范代码（后缀）**（手册 p010 订购信息原文）。
 */
const CONN_SERIES: [string, string, string, string][] = [
  ["I", "I 系列 微焊接接头", "手册1 p007–p014（I 系列订购信息表）", "316L-IU-TB8-TB4-HP"],
  ["B", "B 系列 长焊接接头", "手册1 p015–p017（B 系列订购信息表）", "316L-BU-TB8-TB4-HP"],
  ["G", "G 系列 金属面密封接头", "手册1 p018–p039（G 系列订购信息表）", "316L-GU-MR4-HP"],
  ["O", "O 系列 O 形圈面密封接头", "手册1 p040–p048（O 系列订购信息表）", "316L-OU-OR4-N4-HP"],
];

for (const [key, name, source, example] of CONN_SERIES) {
  const list = CONN_CODES[key] || [];
  MANUAL_SERIES_1.push({
    key,
    name,
    source,
    example,
    ruleKind: "order-table",
    /** 单字母系列：型号里的形态字母紧跟系列字母（`316L-GN-FMR4`）或系列级页面（`G Series`） */
    pattern: new RegExp(`(^|[-\\s])${key}(?:[A-Z]{1,3})?(?=[-\\s]|$)`),
    segments: list.length
      ? [
          {
            no: 1,
            name: "材料",
            en: "Material",
            note: "手册：材料代码作为前缀（316L / 6V / 6VV）",
            options: [
              { code: "316L", label: "316L" },
              { code: "6V", label: "316L VAR" },
              { code: "6VV", label: "316L VIM-VAR" },
            ],
          },
          {
            no: 2,
            name: "基础订购号",
            en: "Base order no.",
            mergeNext: false,
            note: `手册订购信息表逐行枚举，共 ${list.length} 条（每条都是手册里真实存在的订购号）`,
            options: list.map((o) => ({
              code: o.code,
              label: `${o.code} · ${o.zh}`,
              labelEn: `${o.code} · ${o.en}`,
            })),
          },
          {
            ...PROCESS_STD,
            no: 3,
            options: [
              { code: "GP", label: "标准工艺规范" },
              { code: "HP", label: "高纯工艺规范" },
              { code: "UHP", label: "超高纯工艺规范" },
            ],
          },
        ]
      : [],
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
