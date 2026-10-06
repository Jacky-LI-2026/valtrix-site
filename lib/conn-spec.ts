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
  if (key.includes("壁厚")) return { zh: "壁厚", en: "Wall Thickness", group: "dim" };
  if (k.includes("管外径")) return { zh: "管外径", en: "Tube OD", group: "conn" };
  if (key.includes("尺寸 MM") || /尺寸\s*MM/.test(key)) return { zh: "外形尺寸", en: "Dimensions", group: "dim" };
  if (k.includes("MR") || key.includes("面密封") || k.includes("NPT") || k.includes("PT") || k.includes("R尺寸"))
    return { zh: "端接", en: "Connection", group: "conn" };
  return null;
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
