import { NextRequest, NextResponse } from 'next/server'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";
/**
 * 取数与映射见 `lib/api/public-product-tabs.ts`（**唯一数据源**）：
 * 2026-10-12 抽出，让服务端页面能用**同一个函数**把真实产品树注入首屏
 * （SEO：爬虫拿到的 HTML 里要有产品内链），形状与接口保证逐字段一致。
 */
import { getPublicProductTabs } from '@/lib/api/public-product-tabs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req.headers);
    const siteWhere = buildSiteWhere(ctx.siteId);

    // 🔴 2026-09-15 体积瘦身：`?specs=<n>` 控制每个型号携带的规格行数。
    //   背景（实测剖析，见 scripts/_diag_payload_profile.js）：
    //     全量接口 3.47MB，其中 **`specs` 占 96.3%**（44 型号 × 最多 184 行 × 6 语种）；
    //     而**所有列表消费者只用前 3 条**（UNILOK/KITZ 产品卡、默认模板列表页都是 `.slice(0, 3)`）。
    //   而 `useProductTabs()` 被 Header/Footer/Hero/产品页/搜索/展示区**全站**调用
    //   ⇒ 此前**每个页面都在下载 3.47MB**。传 `?specs=3` 后降到约 0.3MB（约 11×）。
    //
    //   兼容性：**不带该参数时行为与以前完全一致（返回全部 specs）**，不改变既有契约。
    //   `specs=0` ⇒ 不返回 specs 字段（最小）。
    //   ⚠️ `cachedJson` 只设 HTTP 缓存头，CDN/浏览器按**完整 URL（含查询串）**分键，
    //      因此不同 `specs` 取值不会互相串号。
    const specsParam = req.nextUrl.searchParams.get("specs");
    const specsLimit =
      specsParam === null ? null : Math.max(0, Math.min(500, Math.trunc(Number(specsParam)) || 0));

    // 🔴 2026-09-18 新增 `?lite=1`（**列表/首页专用**瘦身）：省掉六语种富文本正文与卖点。
    //
    //   背景（实测剖析）：本接口响应里 **`detailContent*`（六语种富文本）占 64.2%**、
    //   `features*` 约 7%。而这两组字段**只有产品详情页**用得到 —— 且详情页读的是
    //   单产品接口 `/api/public/products/<型号>`（自带正文），列表页/首页/相关产品
    //   一律不读它们（2026-09-18 逐消费方 grep 核对：唯一读到的地方是三个详情页组件的
    //   `loc.get(model,"detailContent")` / `loc.getArray(model,"features")` 兜底路径）。
    //
    //   ⇒ `?lite=1` 去掉这两组；**详情页必须继续用全量**（`useProductTabs({ full: true })`），
    //     因为它在单产品接口回来之前会把列表项当兜底渲染源（见 ProductDetailPage 注释）。
    //
    //   兼容性：不带该参数时行为与以前**完全一致**（返回全部字段），不改变既有契约。
    const lite = req.nextUrl.searchParams.get("lite") === "1";

    const result = await getPublicProductTabs({ specsLimit, lite, siteWhere })

    return cachedJson({ success: true, data: result }, 'content')
  } catch (error) {
    console.error('API products error:', error)
    return cachedJson(
      { success: false, error: '获取产品数据失败' },
      'content', 500)
  }
}
