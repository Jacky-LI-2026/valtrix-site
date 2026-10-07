/**
 * 接口 / 端接 规范化（对标 Swagelok 的 Connection 1 Type + Connection 1 Size）
 * ==========================================================================
 * owner 2026-10-06：「要对接口详细描述，类似世伟洛克」。
 *
 * 实测 Swagelok 产品页的"接口"是这样描述的（`products.swagelok.com` 产品页原文字段）：
 *   Body Material: 316 Stainless Steel
 *   Connection 1 Size: 1/4 in.        Connection 1 Type: Swagelok® Tube Fitting
 *   Connection 2 Size: 1/4 in.        Connection 2 Type: Male NPT
 *   Cleaning Process: Standard Cleaning and Packaging (SC-10)
 * 即：**端接 = (型式, 尺寸) 成对描述**，而不是一长串原始规格。
 *
 * 我们的产品数据里，端接信息散在规格串里（如 `MR尺寸 (in.): 1/4`、`NPT螺纹 T(in.): 1/8`、
 * `管外径 D(in.): 1/2`）。本模块把它们按 Swagelok 口径**归位、命名、排序**。
 *
 * 🔴 铁律：**只搬运、不发明** —— 字段值一律取自原始文本；推断不出来的就不写（不猜尺寸/材质/标准）。
 */

export interface ConnField {
  /** 规范字段名（中文） */
  zh: string;
  /** 规范字段名（英文，对标 Swagelok 用词） */
  en: string;
  /** 原始值（**逐字搬运**，不做换算、不改写） */
  value: string;
  /** 归类：本体 / 端接 / 压力 / 尺寸 / 其他 */
  group: "body" | "conn" | "pressure" | "dim" | "other";
  /** 端接序号（仅 conn 有） */
  port?: number;
}

/** 端接型式推断（按关键词；推断不出则留空，只用原始键名） */
function inferPortType(key: string): string {
  const k = key.toUpperCase();
  const thread = k.includes("NPT") ? "NPT" : k.includes("PT") ? "PT" : "";
  if (k.includes("MR") || key.includes("面密封")) return `面密封${thread ? `（${thread}）` : ""}`;
  if (thread) return `${thread} 螺纹`;
  if (k.includes("管外径") || /(^|\s)T\(IN\.?\)/.test(k)) return "卡套 / 焊接管端";
  if (k.includes("R尺寸")) return "R 端接";
  return "";
}

/** 键 → 规范字段（返回 null 表示不归类，保持原样） */
function classify(key: string): { zh: string; en: string; group: ConnField["group"] } | null {
  const k = key.toUpperCase();
  if (key.includes("材质") || k.includes("MATERIAL")) return { zh: "本体材质", en: "Body Material", group: "body" };
  /**
   * 工作压力**必须带材质限定**：同一型号常同时有「工作压力 316L」与「工作压力 CU」两行
   * （实测 G 系列每行都有 316L / CU 两个压力值），不区分就会在界面上出现两个一模一样的「工作压力」。
   * 限定词直接从原始键里抓（316L / CU / NI …），**不发明**。
   */
  if (key.includes("工作压力") || k.includes("PRESSURE")) {
    const m = key.match(/工作压力\s*([A-Za-z0-9]+)/) || key.match(/PRESSURE\s*([A-Za-z0-9]+)/i);
    const qual = m ? m[1] : "";
    return qual
      ? { zh: `工作压力（${qual}）`, en: `Working Pressure (${qual})`, group: "pressure" }
      : { zh: "工作压力", en: "Working Pressure", group: "pressure" };
  }
  /**
   * ⚠️ 2026-10-07：以下三项原本**只认中文**，而手册数值里同一个键中英两种拼写都有
   *   （实测同一产品内既有 `管外径 D(in.)` 也有 `pipe outer diameter D(in.)`）⇒
   *   英文拼写的行会被静默丢掉（少一个端接）。现补齐英文拼写。
   */
  if (key.includes("壁厚") || k.includes("WALL THICKNESS")) return { zh: "壁厚", en: "Wall Thickness", group: "dim" };
  if (k.includes("管外径") || k.includes("OUTER DIAMETER") || k.includes("TUBE SIZE") || k.includes("FERRULE"))
    return { zh: "管外径", en: "Tube OD", group: "conn" };
  if (key.includes("尺寸 MM") || /尺寸\s*MM/.test(key) || k.includes("DIMENSION"))
    return { zh: "外形尺寸", en: "Dimensions", group: "dim" };
  if (k.includes("MR") || key.includes("面密封") || k.includes("NPT") || k.includes("PT") || k.includes("R尺寸") || k.includes("R SIZE"))
    return { zh: "端接", en: "Connection", group: "conn" };
  return null;
}

/* ==========================================================================
   端口模型（owner 2026-10-07）
   ==========================================================================
   owner 在 `金属面密封接头 G系列`（184 条规格）的「快速选型」上报障：
     「端口尺寸应该最少有两个端口，最多 4-5 个端口」。

   根因（实测数据）：手册数值里**一行 = 一个端口尺寸**，而同一个"端口"在不同行用了**多种拼写**
   （`MR尺寸 (in.)` / `MR size (in.)` / `英制 MR尺寸 (in.)`）⇒ 旧的"按原始键名推导维度"
   把这一个概念拆成了 3 个下拉，且每个下拉只描述**一个**端口。
   实测一行里本来就可能有两个端口，例如：
     `英制 MR尺寸 (in.): 1/4; 管外径 D(in.): 1/8; 尺寸 mm (in.): …; 工作压力 316L…`
     = 端口 1（面密封 1/4） + 端口 2（卡套/焊接管端 1/8）。

   口径（**只归类、不发明尺寸**）：
     · 端口「型式」由键名关键词判定（中英双写都认）；
     · 端口「尺寸」**逐字搬运**原始值，不换算；
     · 一个接头**至少 2 个端口**（直通/弯头/插焊管…），三通 3、四通 4，最多 5；
       若手册只记了一个尺寸（同径本体），其余端口**沿用该尺寸**——这是"同径本体"的常识，
       不是编造数值；垫片/堵头/管帽这类**非多端口件**不镜像。
   ========================================================================== */

/** 端口型式（null = 这个键不是端口，例如外形尺寸/壁厚/量规/订购号/材质/压力） */
export function portTypeOf(key: string): string | null {
  const raw = String(key || "");
  const k = raw.toUpperCase();
  if (!k) return null;
  // —— 先排除"看着像端口其实不是"的键 ——
  if (/GAUGE|RULER|量规|卡尺/.test(k)) return null; // 量规/卡尺是工具
  if (/WALL\s*THICKNESS|壁厚/.test(k)) return null;
  if (/DIMENSION|尺寸\s*MM|PANEL|面板|ORDER|订购|MATERIAL|材质|PRESSURE|压力|PARAMETER|参数|L\s*SIZE/.test(k)) return null;
  // —— 端口型式 ——
  if (k.includes("MR") || raw.includes("面密封")) return /NPT/.test(k) ? "面密封（NPT）" : "面密封";
  if (k.includes("NPT")) return "NPT 螺纹";
  if (/\bPT\b|PT\s*THREAD/.test(k)) return "PT 螺纹";
  if (k.includes("THREAD") || raw.includes("螺纹")) return "螺纹";
  /**
   * SAE / MS / RS / RT 都是螺纹标准（手册里写作 `Px-SAE 尺寸`、`Px-RT 名义尺寸`、`P-SAE/MS 端螺纹尺寸`）。
   * ⚠️ `\b` 不可省：`MM` 不能被 `MS` 命中。
   */
  if (/SAE|\bMS\b|\bRS\b|\bRT\b/.test(k)) return "螺纹";
  /**
   * O 形圈面密封（O 系列）：手册里的键被切得很碎（`OR 尺寸 (in.)` / `O R 尺寸 (in.)` / `O型圈 尺寸`），
   * 故按**键首**判定，而不是要求 "OR"+ "SIZE" 紧邻。
   */
  if (/^\s*O\s*[-]?\s*R\b/.test(k) || /^\s*O\s*型?圈/.test(k) || /O[\s-]*RING/.test(k)) return "O 形圈面密封";
  if (
    k.includes("OUTER DIAMETER") ||
    raw.includes("外径") ||
    raw.includes("管尺寸") ||
    k.includes("TUBE SIZE") ||
    k.includes("FERRULE") ||
    raw.includes("卡套")
  )
    return "卡套 / 焊接管端";
  /**
   * ⚠️ 必须用 `\bR` 而不是裸 `R SIZE` —— `OR size (in.)`（O 系列）里也含 "R SIZE"，
   *   裸匹配会把 O 形圈面密封误判成 R 端接（`\b` 在 "OR" 中间不成立，故安全）。
   */
  if (/\bR\s*SIZE/.test(k) || k.includes("R尺寸")) return "R 端接";
  return null;
}

/** 该本体型式的端口数（手册以「本体型式」命名，端口数由型式决定） */
export function portCountFor(label: string, recorded: number): number {
  const t = String(label || "").toUpperCase();
  // 非多端口件（垫片 / 堵头 / 管帽）：按记录数显示，**不镜像**
  if (/垫片|GASKET|堵头|PLUG|管帽|\bCAP\b|盲/.test(t)) return Math.min(Math.max(recorded, 0), 5);
  if (/五通|FIVE[\s-]*WAY|5[\s-]*WAY/.test(t)) return 5;
  if (/四通|FOUR[\s-]*WAY|4[\s-]*WAY/.test(t)) return 4;
  if (/三通|THREE[\s-]*WAY|3[\s-]*WAY|(^|\W)TEE(\W|$)/.test(t)) return 3;
  // 其余（直通 / 弯头 / 插焊管 / 对焊管 / 螺母 / 接管 …）：至少两个端口
  return Math.min(Math.max(2, recorded), 5);
}

export interface PortValue {
  /** 端口型式（面密封 / NPT 螺纹 / 卡套 / 焊接管端 …） */
  type: string;
  /** 端口尺寸（原始值逐字搬运） */
  size: string;
}

/** 从一条型号的规格键值里取出它的端口序列（已按端口数补全，最多 5） */
export function extractPorts(attrs: [string, string][], label = ""): PortValue[] {
  const ports: PortValue[] = [];
  const seen = new Set<string>();
  for (const [key, value] of attrs) {
    if (!key || !value || key === "#label") continue;
    const type = portTypeOf(key);
    if (!type) continue;
    const sig = `${type}|${value}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    ports.push({ type, size: value });
  }
  if (!ports.length) return [];
  const want = portCountFor(label, ports.length);
  while (ports.length < want) ports.push({ ...ports[0] });
  return ports.slice(0, 5);
}

/** 端口显示名：`面密封 1/4`（型式 + 尺寸；型式推断不出时只给尺寸） */
export function portLabel(p: PortValue): string {
  return p.type ? `${p.type} ${p.size}` : p.size;
}

/**
 * 本体外形尺寸类键 —— 这些**不该**当"选型维度"（下拉里选 `C 尺寸 = 48.8` 没有意义）。
 * 判据只用于**过滤维度**，不参与任何显示/数值计算；端口类键由 `portTypeOf` 先拦下。
 */
export function isBodyDimension(key: string): boolean {
  if (portTypeOf(key)) return false;
  const k = String(key || "").toUpperCase();
  return /尺寸|DIMENSION|THICKNESS|壁厚|孔径|PANEL|面板|L\s*SIZE|ORDER|订购|PARAMETER|参数/.test(k);
}

/**
 * 把一条型号的规格键值整理成 Swagelok 口径的字段序列。
 * @param attrs  该型号的 [键, 值] 列表（来自规格串解析）
 * @param label  规格项名（如「NPT 外螺纹弯头本体」）—— 作为"本体型式"线索
 * @param code   货号（如 316L-GE-MR4-N2）
 */
export function buildConnFields(attrs: [string, string][], label = "", code = ""): ConnField[] {
  const out: ConnField[] = [];
  let port = 0;
  const seen = new Set<string>();

  /**
   * 本体型式：规格项名本身就是最直接的"这是什么接头/什么端接"的描述
   * （实测如「NPT 外螺纹弯头本体」「长对焊接管」）——对标 Swagelok 的 Body Type / Connection Type 一行。
   */
  const bodyType = String(label || "").trim();
  if (bodyType) out.push({ zh: "本体型式", en: "Body Type", value: bodyType, group: "body" });

  for (const [rawKey, value] of attrs) {
    if (!rawKey || !value) continue;
    if (rawKey === "#label") continue; // 内部伪键
    const c = classify(rawKey);
    if (!c) continue;
    const key = `${c.zh}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (c.group === "conn") {
      port += 1;
      const t = inferPortType(rawKey);
      // 端接字段名带序号（对标 Connection 1 / 2），型式能推断时并入字段名，原始键名放到说明里
      out.push({
        zh: `端接 ${port}${t ? `（${t}）` : ""}`,
        en: `Connection ${port}${t ? ` (${t})` : ""}`,
        value,
        group: "conn",
        port,
      });
      continue;
    }
    out.push({ zh: c.zh, en: c.en, value, group: c.group });
  }

  // 货号放在最后（对标 Swagelok 的 Part Number）
  if (code) out.push({ zh: "货号", en: "Part Number", value: code, group: "other" });
  return out;
}

/**
 * 生成一句**接口概述**（给列表/卡片用），例如：
 *   「面密封（MR）1/4 · NPT 螺纹 1/8」
 * 只拼接已存在的端接字段；没有端接信息则返回空串（前端据此不显示）。
 */
export function connSummary(fields: ConnField[], sep = " · "): string {
  const conns = fields.filter((f) => f.group === "conn");
  if (!conns.length) return "";
  return conns
    .slice(0, 4)
    .map((f) => {
      const type = f.zh.replace(/^端接\s*\d+\s*（?/, "").replace(/）?$/, "");
      return type ? `${type} ${f.value}` : f.value;
    })
    .join(sep);
}

/**
 * 产品级"接口总览"：把该产品**所有变体**的端接型式与尺寸汇总（对标 Swagelok 类目页的 End Connections 概览）。
 * 返回按出现次数排序的清单；只做去重/计数，不做推断。
 */
export function connOverview(allFields: ConnField[][], limit = 12): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const fields of allFields) {
    for (const f of fields) {
      if (f.group !== "conn") continue;
      const key = `${f.zh} ${f.value}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/**
 * 端口型式等中文显示串 → 英文（**只用于显示**）。
 * ==========================================================================
 * 为什么不在 `portTypeOf` 里直接出英文：那些中文字符串同时是**匹配/去重的主键**
 * （`rowMatches()` 拿选项值与 `portLabel()` 比对、`connOverview()` 用 `f.zh` 去重）
 * —— 两边口径必须一致，所以内部一律保留中文，**只在渲染时**换成英文。
 *
 * owner 2026-10-08：英文版详情页的「快速选型」选项与「接口与端接」里出现
 * `卡套 / 焊接管端 6`、`端接 1（面密封）` 这类中文（来自本模块的型式推断）。
 */
const DISPLAY_EN: [string, string][] = [
  ["面密封（NPT）", "VCR (NPT)"],
  ["面密封（PT）", "VCR (PT)"],
  ["O 形圈面密封", "O-ring face seal"],
  ["卡套 / 焊接管端", "ferrule / weld end"],
  ["面密封", "VCR"],
  ["NPT 螺纹", "NPT thread"],
  ["PT 螺纹", "PT thread"],
  ["螺纹", "thread"],
  ["R 端接", "R connection"],
  ["端接", "Connection"],
];

/** 把含中文端接型式的显示串换成英文（数字/尺寸/型号一律原样保留） */
export function connLabelEn(text: string): string {
  let out = String(text ?? "");
  for (const [zh, en] of [...DISPLAY_EN].sort((a, b) => b[0].length - a[0].length)) {
    if (out.includes(zh)) out = out.split(zh).join(en);
  }
  return out
    .replace(/（/g, " (")
    .replace(/）/g, ")")
    .replace(/\s+([,)])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
