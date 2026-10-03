import { notFound, permanentRedirect } from "next/navigation";
import { getProductCanonicalPath } from "@/lib/api/products";

/**
 * `/products/<段>` —— 只匹配**单段**路径，用于接住**产品短链**
 * （历史链接 / 外部引用 / 手输型号，例如只给一个产品段：`/products/<productSlug>`）。
 * ==========================================================================
 * 规范路径是 `/products/<tab>/<slug>`（tab = 该产品所属分类段的 slug）。
 * 行为：按该段当作品 slug 查库 → 定位所属 tab → **308 永久重定向**到规范路径；
 *      查不到或未发布 ⇒ `notFound()`（真 404，不做软跳）。
 *
 * 为什么用 `permanentRedirect`（308）而不是 `redirect`（307）：
 *   短链多见于外部引用/手输，308 能让搜索引擎把权重合并到规范路径；
 *   而"产品换 tab 后旧 308 跳坏"的风险为 0 —— 目标详情页只按 **slug** 查库、忽略 tab 段。
 *
 * 🔴 目录名为什么是 `[tab]` 而不是 `[slug]`（实测坑）：
 *   Next 14 要求**同一层的动态段名必须一致** —— 已有 `app/products/[tab]/[id]/page.tsx`，
 *   若同时放 `app/products/[slug]/page.tsx`，dev server 直接报
 *   `You cannot use different slug names for the same dynamic path ('slug' !== 'tab')` 并**起不来**。
 *   ⇒ 本页复用 `[tab]` 这个段名，把它的值**当产品 slug 用**（不是 tab slug）。
 *   代价：以后若要加"/products/<tab> 分类页"，需与本页合并判断（先按 product slug 解析，未命中再当 tab）。
 */
export const dynamic = "force-dynamic";

export default async function LegacyProductPath({ params }: { params: { tab: string } }) {
  const slug = decodeURIComponent(params.tab || "");
  const canonical = await getProductCanonicalPath(slug);
  if (!canonical) notFound();
  permanentRedirect(canonical);
}
