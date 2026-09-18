// 商城阶梯价（批量价）计算工具
// priceTiers: [{qty, price}] — 达到 qty 数量时按该档单价，取满足条件最高档；未配置则回退 price

export interface PriceTier {
  qty: number | string;
  price: number | string | null;
}

export function normalizeTiers(tiers: any): PriceTier[] {
  if (!Array.isArray(tiers)) return [];
  return tiers
    .filter((t) => t && Number(t.qty) > 0 && t.price !== null && t.price !== undefined && t.price !== "")
    .map((t) => ({ qty: Number(t.qty), price: Number(t.price) }));
}

/** 按数量计算商品单价；无阶梯价或数量不足最低档 → 用商品基础价 */
export function calcUnitPrice(product: { price?: any; priceTiers?: any; specMode?: boolean }, qty: number): number | null {
  const n = Math.max(1, Number(qty) || 1);
  const tiers = normalizeTiers(product?.priceTiers);
  const base = product?.price === null || product?.price === undefined || product?.price === "" ? null : Number(product.price);
  if (tiers.length > 0) {
    const sorted = [...tiers].sort((a, b) => Number(a.qty) - Number(b.qty));
    const hit = sorted.filter((t) => n >= Number(t.qty)).pop();
    if (hit) {
      // 规格商品（specMode）：档位为折扣百分比（95=95折），作用于组合单价（price 已含规格增量）
      if (product.specMode && base !== null) return parseFloat((base * Number(hit.price) / 100).toFixed(2));
      return Number(hit.price);
    }
  }
  return base;
}

/** 按数量计算行小计；单价为空（面议）返回 0 */
export function calcLineTotal(product: { price?: number | string | null; priceTiers?: any }, qty: number): number {
  const u = calcUnitPrice(product, qty);
  return u === null ? 0 : u * Math.max(1, Number(qty) || 1);
}

/** 给购物车项展示：有阶梯价时返回 (档位单价, 是否命中档位)，否则 (基础价, false) */
export function displayUnitPrice(item: { price?: any; priceTiers?: any; specMode?: boolean }, qty: number): { price: number | null; tiered: boolean } {
  const n = Math.max(1, Number(qty) || 1);
  const tiers = normalizeTiers(item?.priceTiers);
  if (tiers.length > 0) {
    const sorted = [...tiers].sort((a, b) => Number(a.qty) - Number(b.qty));
    const hit = sorted.filter((t) => n >= Number(t.qty)).pop();
    if (hit) {
      if (item.specMode && item.price !== null && item.price !== undefined && item.price !== "") {
        return { price: parseFloat((Number(item.price) * Number(hit.price) / 100).toFixed(2)), tiered: true };
      }
      return { price: Number(hit.price), tiered: true };
    }
  }
  return { price: item?.price === null || item?.price === undefined || item?.price === "" ? null : Number(item.price), tiered: false };
}
