/**
 * 插件能力计费（Capability Pricing）
 * =====================================================
 * R4 深化：对外 API 网关（/api/integration/[capability]）按能力计费（credits 积分制）。
 * - 每个公开能力定义单价：按次 / 按字符 / 按封。
 * - computeGatewayCost(capability, args) 计算单次调用消耗的 credits。
 * - 与 lib/plugins/gateway-store.ts 的余额/累计用量联动（扣费 + 记录）。
 *
 * 单价表为内置默认，可被后台「能力市场 → API 网关」调整（gateway_pricing 配置）。
 */
export interface PricingRule {
  credits: number; // 基础积分（按次）
  perChar?: number; // 每字符积分（翻译类）
  note: string; // 计费说明
}

/** 默认单价表（能力名 → 单价规则） */
const DEFAULT_PRICING: Record<string, PricingRule> = {
  "translate.text": { credits: 1, perChar: 0.01, note: "按次1积分 + 每100字符1积分" },
  "ai.text": { credits: 10, note: "按次10积分" },
  "mail.send": { credits: 1, note: "按封1积分" },
  "seo.push": { credits: 5, note: "按次5积分" },
};

let customPricing: Record<string, PricingRule> | null = null;

/** 设置自定义单价表（后台配置） */
export function setGatewayPricing(map: Record<string, PricingRule>): void {
  customPricing = map;
}

/** 获取单价规则（自定义优先，无则默认；未知能力返回 null=免费） */
export function getPricing(capability: string): PricingRule | null {
  const src = customPricing || DEFAULT_PRICING;
  return src[capability] || null;
}

/** 计算单次调用的积分消耗 */
export function computeGatewayCost(capability: string, args: any): { credits: number; note: string } {
  const rule = getPricing(capability);
  if (!rule) return { credits: 0, note: "免费能力" };
  let total = rule.credits;
  if (rule.perChar) {
    // 翻译类按输入文本长度计费
    const text = String(args?.text || args?.prompt || "");
    const chars = text.length;
    total += Math.ceil(chars * rule.perChar);
  }
  return { credits: Math.max(1, total), note: rule.note };
}

/** 列出全部能力单价（供管理页展示） */
export function listPricing(): Record<string, { rule: PricingRule; source: "default" | "custom" }> {
  const out: Record<string, { rule: PricingRule; source: "default" | "custom" }> = {};
  const names: string[] = [];
  const add = (n: string) => { if (names.indexOf(n) < 0) names.push(n); };
  Object.keys(DEFAULT_PRICING).forEach(add);
  if (customPricing) Object.keys(customPricing).forEach(add);
  for (const k of names) {
    const rule = (customPricing && customPricing[k]) || DEFAULT_PRICING[k];
    out[k] = { rule, source: customPricing && customPricing[k] ? "custom" : "default" };
  }
  return out;
}
