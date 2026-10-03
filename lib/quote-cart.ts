/**
 * 询价车本地存储协议（**单一真源**）
 * ==========================================================================
 * 询价车是**纯前端 localStorage** 实现的：加购只写本地，**不发任何 API**
 * （只有在提交询价单时才调 /api/public/quote* 接口）。
 * 因此"点加购没有网络请求"是**预期行为**，不是缺陷。
 *
 * 存储协议：
 *   键   `quote_cart`
 *   值   `[{ id: string, qty: number }, ...]`   —— `id` 是**产品 slug**
 *        （与 `/api/public/products` 返回的 `models[].id` 同一空间）
 *   事件 `quote-cart-updated`（window）—— 供浮动购物车按钮/角标实时同步
 *
 * ⚠️ 为什么抽出本模块（2026-09-14）：此前 `app/products/[tab]/[id]/ProductDetailClient.tsx`
 *    与 `components/PriceDisplay.tsx` **各写了一份加购逻辑**，协议靠人工保持一致；
 *    结果 PriceDisplay 那份根本不是加购（只是 `<a href="/quote/cart">` 跳转），
 *    用户点「Add to quote cart」后购物车仍为空。集中到一处后，
 *    两个入口共用同一实现，且有单元测试兜底。
 */

export const QUOTE_CART_KEY = "quote_cart";
export const QUOTE_CART_EVENT = "quote-cart-updated";

export interface QuoteCartItem {
  id: string;
  qty: number;
}

/** 读取询价车（容错：解析失败/非数组一律返回空数组） */
export function readQuoteCart(): QuoteCartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUOTE_CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x: any) => x && typeof x.id === "string") : [];
  } catch {
    return [];
  }
}

/** 写入询价车并派发同步事件；返回写入后的数组（localStorage 不可用时返回原值） */
export function writeQuoteCart(items: QuoteCartItem[]): QuoteCartItem[] {
  if (typeof localStorage === "undefined") return items;
  try {
    localStorage.setItem(QUOTE_CART_KEY, JSON.stringify(items));
  } catch {
    /* 隐私模式等：忽略写入失败 */
  }
  try {
    window.dispatchEvent(new Event(QUOTE_CART_EVENT));
  } catch {
    /* 非浏览器环境忽略 */
  }
  return items;
}

/**
 * 加入询价车：已存在则**更新数量**（不重复叠加），否则追加。
 * @param id  产品 slug（同 `/api/public/products` 的 `models[].id`）
 * @param qty 数量，最小 1
 */
export function addToQuoteCart(id: string, qty = 1): QuoteCartItem[] {
  if (!id) return readQuoteCart();
  const items = readQuoteCart();
  const n = Math.max(1, Number(qty) || 1);
  const exist = items.find((x) => x.id === id);
  if (exist) exist.qty = n;
  else items.push({ id, qty: n });
  return writeQuoteCart(items);
}
