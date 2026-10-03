import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

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

    const tabs = await prisma.productTab.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            products: {
              where: { AND: [{ status: 'published' }, siteWhere] },
              orderBy: { sortOrder: 'asc' },
              include: {
                // 限制到 n 行也在**数据库层**生效，省掉读全表规格的开销
                productSpecs:
                  specsLimit !== null ? { orderBy: { sortOrder: 'asc' }, take: specsLimit } : { orderBy: { sortOrder: 'asc' } },
                shopProduct: { select: { slug: true, status: true } },
              },
            },
          },
        },
      },
    })

    // 转换为前端兼容的数据结构
    const result = tabs.map((tab) => ({
      id: tab.slug,
      name: tab.name,
      nameEn: tab.nameEn,
      nameJa: tab.nameJa,
      nameKo: tab.nameKo,
      nameFr: tab.nameFr,
      nameAr: tab.nameAr,
      purchaseMode: tab.purchaseMode || 'quote', // quote=询价 / shop=在线购买
      categories: tab.categories.map((cat) => ({
        id: cat.slug,
        name: cat.name,
        nameEn: cat.nameEn,
        nameJa: cat.nameJa,
        nameKo: cat.nameKo,
        nameFr: cat.nameFr,
        nameAr: cat.nameAr,
        icon: 'Package',
        description: '',
        descriptionEn: '',
        models: cat.products.map((p) => ({
          id: p.slug,
          name: p.name,
          nameEn: p.nameEn,
          nameJa: p.nameJa,
          nameKo: p.nameKo,
          nameFr: p.nameFr,
          nameAr: p.nameAr,
          model: p.model,
          purchaseMode: tab.purchaseMode || 'quote',
          shopSlug: p.shopProduct?.status === 'published' ? p.shopProduct.slug : undefined,
          price: p.price ? Number(p.price) : null,
          priceTiers: p.priceTiers as { qty: number; price: number }[] | undefined,
          isParts: p.isParts,
          image: p.coverImage || '',
          coverImage: p.coverImage || '',
          video: p.video || '',
          images: p.images as string[] | undefined,
          frames360: p.frames360 as { path: string; count: number; startIndex?: number } | undefined,
          subtitle: p.subtitle || '',
          subtitleEn: p.subtitleEn,
          subtitleJa: p.subtitleJa,
          subtitleKo: p.subtitleKo,
          subtitleFr: p.subtitleFr,
          subtitleAr: p.subtitleAr,
          summary: p.summary || '',
          summaryEn: p.summaryEn,
          summaryJa: p.summaryJa,
          summaryKo: p.summaryKo,
          summaryFr: p.summaryFr,
          summaryAr: p.summaryAr,
          description: p.subtitle || p.summary || '',
          descriptionEn: p.subtitleEn || p.summaryEn || '',
          descriptionJa: p.subtitleJa || p.summaryJa || '',
          descriptionKo: p.subtitleKo || p.summaryKo || '',
          descriptionFr: p.subtitleFr || p.summaryFr || '',
          descriptionAr: p.subtitleAr || p.summaryAr || '',
          detailContent: p.description,
          detailContentEn: p.descriptionEn,
          detailContentJa: p.descriptionJa,
          detailContentKo: p.descriptionKo,
          detailContentFr: p.descriptionFr,
          detailContentAr: p.descriptionAr,
          manualUrl: p.manualUrl || undefined,
          manualUrlEn: p.manualUrl || undefined,
          priceMin: p.priceMin !== null && p.priceMin !== undefined ? Number(p.priceMin) : null,
          priceMax: p.priceMax !== null && p.priceMax !== undefined ? Number(p.priceMax) : null,
          priceUnit: p.priceUnit || '',
          moq: p.moq ?? 1,
          priceNote: p.priceNote || '',
          // specs 是**体积大头**（占全量 96.3%）⇒ 仅在 `?specs=` 未指定时返回全部；
          // 指定 0 时整段省略（连字段都不出现，省掉 `"specs":[]` 的开销）
          specs:
            specsLimit === 0
              ? undefined
              : p.productSpecs.map((s) => ({
                  label: s.label,
                  value: s.value,
                  unit: s.unit || '',
                  labelEn: s.labelEn || '',
                  labelJa: s.labelJa || '',
                  labelKo: s.labelKo || '',
                  labelFr: s.labelFr || '',
                  labelAr: s.labelAr || '',
                  valueEn: s.valueEn || '',
                  valueJa: s.valueJa || '',
                  valueKo: s.valueKo || '',
                  valueFr: s.valueFr || '',
                  valueAr: s.valueAr || '',
                })),
          features: (p.features as string[]) || [],
          featuresEn: (p.featuresEn as string[]) || [],
          featuresJa: (p.featuresJa as string[]) || [],
          featuresKo: (p.featuresKo as string[]) || [],
          featuresFr: (p.featuresFr as string[]) || [],
          featuresAr: (p.featuresAr as string[]) || [],
        })),
      })),
    }))

    // lite 模式：剥掉仅详情页需要的大字段（此处做，避免改动上面那段长映射的字面量，
    // 降低漏字段的风险）。注意这是**传输层瘦身** —— 数据库仍会读出这几列，
    // 若要连读取也省掉，需要把上面的 include 改成显式 select（后续可做）。
    if (lite) {
      const DROP = [
        "detailContent", "detailContentEn", "detailContentJa", "detailContentKo", "detailContentFr", "detailContentAr",
        "features", "featuresEn", "featuresJa", "featuresKo", "featuresFr", "featuresAr",
      ]
      for (const tab of result) {
        for (const cat of tab.categories) {
          for (const m of cat.models) {
            for (const k of DROP) delete (m as Record<string, unknown>)[k]
          }
        }
      }
    }

    return cachedJson({ success: true, data: result }, 'content')
  } catch (error) {
    console.error('API products error:', error)
    return cachedJson(
      { success: false, error: '获取产品数据失败' },
      'content', 500)
  }
}
