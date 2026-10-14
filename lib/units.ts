/**
 * 计量单位 / 价格附加文案的本地化
 * ==========================================================================
 * owner 2026-10-14：「在线商城的单位显示在英文状态下还是会显示中文」。
 *
 * 根因：**单位在库里就是中文**（`Product.priceUnit` 注释即「元/台」、`ShopProduct.unit` 即「件/套/台」），
 *   而前台是直接 `/{unit}` 拼在价格后面 ⇒ 英文站出现「¥1,200 /件」这种中英混排。
 *
 * 口径（刻意不做"翻译体"）：
 *   · 单位按**各语种惯用写法**给缩写：件→pc、套→set、台→unit、米→m、千克→kg…；
 *   · **复合单位**（`元/台`）按 `/` 拆开逐段映射；
 *   · 非中文语种里**丢掉货币字**（元/¥/CNY/人民币）—— 价格前面本来就有 ¥，再写一遍「元/台」是冗余；
 *     若整段就只有货币字，则回退为货币代码（en→CNY）；
 *   · **查不到映射就原样返回**：宁可显示原文，也不编造或丢信息。
 *
 * ⚠️ 这是"显示层"的换算：**数据库里仍存中文原值**（订单快照、导出、后台都按中文存），
 *    只在渲染时按当前语种显示 —— 与 G4「字段命名不变」的口径一致。
 */

/** 单位 → 各语种写法（zh 直接用原值，不在此表） */
const UNIT_TABLE: Record<string, Record<string, string>> = {
  件: { en: "pc", ja: "個", ko: "개", fr: "pce", ar: "قطعة" },
  个: { en: "pc", ja: "個", ko: "개", fr: "pce", ar: "قطعة" },
  只: { en: "pc", ja: "個", ko: "개", fr: "pce", ar: "قطعة" },
  支: { en: "pc", ja: "本", ko: "개", fr: "pce", ar: "قطعة" },
  根: { en: "pc", ja: "本", ko: "개", fr: "pce", ar: "قطعة" },
  片: { en: "pc", ja: "枚", ko: "개", fr: "pce", ar: "قطعة" },
  张: { en: "pc", ja: "枚", ko: "장", fr: "pce", ar: "قطعة" },
  枚: { en: "pc", ja: "枚", ko: "개", fr: "pce", ar: "قطعة" },
  套: { en: "set", ja: "セット", ko: "세트", fr: "ensemble", ar: "مجموعة" },
  组: { en: "set", ja: "セット", ko: "세트", fr: "ensemble", ar: "مجموعة" },
  台: { en: "unit", ja: "台", ko: "대", fr: "unité", ar: "وحدة" },
  部: { en: "unit", ja: "台", ko: "대", fr: "unité", ar: "وحدة" },
  箱: { en: "box", ja: "箱", ko: "박스", fr: "carton", ar: "صندوق" },
  批: { en: "batch", ja: "バッチ", ko: "배치", fr: "lot", ar: "دفعة" },
  卷: { en: "roll", ja: "ロール", ko: "롤", fr: "rouleau", ar: "لفة" },
  米: { en: "m", ja: "m", ko: "m", fr: "m", ar: "م" },
  厘米: { en: "cm", ja: "cm", ko: "cm", fr: "cm", ar: "سم" },
  毫米: { en: "mm", ja: "mm", ko: "mm", fr: "mm", ar: "مم" },
  千克: { en: "kg", ja: "kg", ko: "kg", fr: "kg", ar: "كجم" },
  公斤: { en: "kg", ja: "kg", ko: "kg", fr: "kg", ar: "كجم" },
  克: { en: "g", ja: "g", ko: "g", fr: "g", ar: "جم" },
  吨: { en: "t", ja: "t", ko: "t", fr: "t", ar: "طن" },
  升: { en: "L", ja: "L", ko: "L", fr: "L", ar: "لتر" },
  毫升: { en: "mL", ja: "mL", ko: "mL", fr: "mL", ar: "مل" },
  天: { en: "day", ja: "日", ko: "일", fr: "jour", ar: "يوم" },
  月: { en: "month", ja: "ヶ月", ko: "개월", fr: "mois", ar: "شهر" },
  年: { en: "year", ja: "年", ko: "년", fr: "an", ar: "سنة" },
  人: { en: "person", ja: "名", ko: "명", fr: "personne", ar: "شخص" },
  次: { en: "time", ja: "回", ko: "회", fr: "fois", ar: "مرة" },
  小时: { en: "hour", ja: "時間", ko: "시간", fr: "heure", ar: "ساعة" },
};

/** 货币字：非中文语种里丢掉（价格已带 ¥ 符号） */
const CURRENCY_TOKENS = new Set(["元", "¥", "CNY", "RMB", "人民币", "￥"]);
/** 整段只有货币字时的回退（en→CNY；其余给货币代码） */
const CURRENCY_FALLBACK: Record<string, string> = {
  en: "CNY",
  ja: "元",
  ko: "위안",
  fr: "CNY",
  ar: "يوان",
};

/**
 * 按语种显示计量单位。
 * `localizeUnit("件", "en")` → `"pc"`；`localizeUnit("元/台", "en")` → `"unit"`；
 * `localizeUnit("件", "zh")` → `"件"`（中文原样）；查不到映射 → 原样返回。
 */
export function localizeUnit(unit: string | null | undefined, locale: string | null | undefined): string {
  const raw = String(unit ?? "").trim();
  if (!raw) return "";
  const lang = String(locale || "zh");
  if (lang === "zh") return raw;

  const parts = raw
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  const mapped = parts
    .filter((p) => !CURRENCY_TOKENS.has(p))
    .map((p) => UNIT_TABLE[p]?.[lang] || p);
  if (mapped.length === 0) return CURRENCY_FALLBACK[lang] || "CNY";
  return mapped.join("/");
}

/**
 * 折扣文案：库里存的是中文"折"（如 `9` 表示 9 折 = 让利 10%）。
 * zh → `9折`；其余语种 → `10% off`（语义等价，不再出现中文"折"）。
 * 传 ≥10 视为无折扣，返回空串。
 */
export function formatDiscount(tenths: number, locale: string | null | undefined): string {
  const n = Number(tenths);
  if (!Number.isFinite(n) || n <= 0 || n >= 10) return "";
  if (String(locale || "zh") === "zh") return `${n}折`;
  const percentOff = Math.round((10 - n) * 10);
  return `${percentOff}% off`;
}

/**
 * 折扣文案（**百分比制**）—— 商城「阶梯价」用的就是这一套。
 * ==========================================================================
 * owner 2026-10-14：「（阶梯价）前台显示多语言」。
 *
 * 为什么不能直接用上面的 `formatDiscount`：那个是**十折制**（`9` = 9 折，`>= 10` 视为无折扣
 * 直接返回空串），而商城阶梯价后台提示写的是「填 95=95折」= **百分比制**（`95` 表示按 95% 计价）。
 * 把 95 喂给 `formatDiscount` 会命中"≥10 无折扣"分支 ⇒ **折扣文案恒为空**
 * （价格算得没错，只是那句说明永远不显示）。
 *
 * 口径与中文习惯保持一致：zh → `95折`；其余语种 → `5% off`（语义等价，不出现中文"折"）。
 * 传 ≥100 或 ≤0 视为无折扣，返回空串（调用方据此不渲染）。
 */
export function formatPercentOff(percent: number, locale: string | null | undefined): string {
  const n = Number(percent);
  if (!Number.isFinite(n) || n <= 0 || n >= 100) return "";
  if (String(locale || "zh") === "zh") return `${n}折`;
  return `${Math.round(100 - n)}% off`;
}
