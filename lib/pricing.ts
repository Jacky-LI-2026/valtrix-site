/**
 * 价格显示策略与折扣引擎（前后台共用，纯函数无 Node 依赖）
 *
 * 价格显示模式（后台「定价与价格显示」配置，存 site_config.pricing_config）：
 * - hidden      隐藏价格（默认）：所有产品不显示价格，仅「询价/获取报价」入口
 * - public      直接显示价格：所有访客可见
 * - byCustomerType 按客户分类显示：登录会员按 customerType 判断（配件价仅整机/配件客户）
 * - emailVerify 邮件验证后显示：点击「查看价格」→ 邮箱验证码 → 验证通过显示价格
 * - emailQuote  邮件验证码后发送报价：验证通过后把报价明细发送到邮箱
 *
 * 折扣：最终折扣 = max(客户分类折扣, 会员等级折扣)，取两者较大值
 */

export const PRICING_MODES = [
  { key: "hidden", label: "隐藏价格（默认，均不显示）", desc: "所有产品不展示价格，只保留询价/获取报价入口" },
  { key: "public", label: "直接显示价格", desc: "所有访客直接看到价格" },
  { key: "byCustomerType", label: "按客户分类显示价格", desc: "登录会员按客户分类（询价/整机/材料/配件）决定可见性，配件价仅整机/配件客户可见" },
  { key: "emailVerify", label: "邮件验证后显示价格", desc: "访客点击「查看价格」→ 输入邮箱收验证码 → 验证通过后显示价格" },
  { key: "emailQuote", label: "邮件验证码后发送报价到邮箱", desc: "访客验证邮箱后，把该产品/询价车报价明细发送到邮箱" },
] as const;

export type PricingMode = (typeof PRICING_MODES)[number]["key"];

export const DEFAULT_PRICING_CONFIG = {
  mode: "hidden" as PricingMode,
  updatedAt: null as string | null,
};

/** 读取价格显示策略（DB 中存 site_config.pricing_config） */
export function parsePricingConfig(raw: unknown): { mode: PricingMode } {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const mode = String(cfg.mode || "hidden");
  const valid = PRICING_MODES.some((m) => m.key === mode);
  return { mode: valid ? (mode as PricingMode) : "hidden" };
}

export interface PriceView {
  visible: boolean;
  /** 为什么不可见 */
  reason?: "hidden" | "parts" | "login" | "verify" | "quote";
  /** 需要验证邮箱才可看 */
  needVerify?: boolean;
  /** 验证后发送报价到邮箱 */
  sendQuoteToEmail?: boolean;
}

/**
 * 判断某产品价格对当前访客是否可见
 * @param mode      价格显示模式
 * @param isParts   是否配件类产品
 * @param customerType 会员客户分类 key（未登录为 null）
 * @param canSeeParts 该客户分类是否可见配件价（登录且该分类 seePartsPrice=true）
 * @param priceVerified 是否已通过邮箱验证（emailVerify 模式）
 */
export function canSeePrice(
  mode: PricingMode,
  isParts: boolean,
  customerType: string | null | undefined,
  canSeeParts: boolean,
  priceVerified: boolean
): PriceView {
  switch (mode) {
    case "public":
      return { visible: true };
    case "hidden":
      return { visible: false, reason: "hidden", needVerify: false };
    case "byCustomerType":
      if (!customerType) return { visible: false, reason: "login", needVerify: false };
      if (isParts && !canSeeParts) return { visible: false, reason: "parts", needVerify: false };
      return { visible: true };
    case "emailVerify":
      if (priceVerified) return { visible: true };
      return { visible: false, reason: "verify", needVerify: true };
    case "emailQuote":
      // 报价发送到邮箱：价格不在页面显示，点按钮走验证→发邮件
      return { visible: false, reason: "quote", needVerify: true, sendQuoteToEmail: true };
    default:
      return { visible: false, reason: "hidden" };
  }
}

/**
 * 计算折扣后价格
 * @param price       原价
 * @param typeDiscount 客户分类折扣（0-100 百分数，0=无折扣）
 * @param levelDiscount 会员等级折扣（0-100 百分数）
 */
export function applyDiscount(price: number, typeDiscount: number, levelDiscount: number): number {
  const d = Math.max(typeDiscount || 0, levelDiscount || 0);
  if (d <= 0) return price;
  const v = price * (1 - d / 100);
  return Math.round(v * 100) / 100;
}

/** 折扣后价格文案（保留最多 2 位小数，去尾零） */
export function formatPrice(v: number | null | undefined, currency = "¥"): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  return currency + Number(v.toFixed(2)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** 阶梯价取档：按数量取对应档位价格 */
export function tierPrice(tiers: unknown, qty: number): number | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  let best: { qty: number; price: number } | null = null;
  for (const t of tiers) {
    const q = Number((t as Record<string, unknown>).qty);
    const p = Number((t as Record<string, unknown>).price);
    if (Number.isFinite(q) && Number.isFinite(p) && q <= qty) {
      if (!best || q > best.qty) best = { qty: q, price: p };
    }
  }
  return best ? best.price : null;
}
