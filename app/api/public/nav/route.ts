import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

/**
 * 前台**导航专用**产品树（轻量接口）
 * =====================================================
 * 背景（2026-09-18）：`/api/public/products?specs=3` 被 Header/Footer/搜索条在**每个页面**
 *   调用，实测约 516KB/1.9s（代码内记录的阀门站线上实测）。而导航真正需要的只是
 *   「系列 → 分类 → 型号」的 **id + 六语种名称**（搜索框再多一个型号描述）。
 *   该接口的响应体里有 96% 是列表页用不到的东西：六语种富文本 `detailContent`、
 *   `features`、`images`、`frames360`、价格与规格 —— 那些只有**产品页**才需要。
 *
 * 本接口策略：
 *   · **数据库层就 select 最小字段**（连大字段都不读，避免把六语种富文本搬进内存）；
 *   · 返回结构与 `/api/public/products` **保持同形**（`tab.categories[].models[]`），
 *     因此所有导航消费方的映射代码无需改动，属于纯替换；
 *   · 命中即 `cachedJson(..., 'static-long')`（与菜单接口同档：CDN 1 小时 + SWR），
 *     因为系列/分类的变更频率与导航菜单同级。
 *
 * ⚠️ 只给**导航/搜索**用。产品列表、产品卡、详情页仍必须走
 *    `/api/public/products`（它们需要图片/价格/规格等），不要用本接口替代。
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext(req.headers);
    const siteWhere = buildSiteWhere(ctx.siteId);

    const tabs = await prisma.productTab.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        slug: true,
        name: true,
        nameEn: true,
        nameJa: true,
        nameKo: true,
        nameFr: true,
        nameAr: true,
        categories: {
          orderBy: { sortOrder: 'asc' },
          select: {
            slug: true,
            name: true,
            nameEn: true,
            nameJa: true,
            nameKo: true,
            nameFr: true,
            nameAr: true,
            products: {
              where: { AND: [{ status: 'published' }, siteWhere] },
              orderBy: { sortOrder: 'asc' },
              // 仅取导航与本地搜索所需的字段；**不取** description/detailContent/
              // features/images/frames360/price/specs —— 那些正是 500KB 的来源。
              select: {
                slug: true,
                model: true,
                name: true,
                nameEn: true,
                nameJa: true,
                nameKo: true,
                nameFr: true,
                nameAr: true,
                subtitle: true,
                subtitleEn: true,
                subtitleJa: true,
                subtitleKo: true,
                subtitleFr: true,
                subtitleAr: true,
                summary: true,
                summaryEn: true,
                summaryJa: true,
                summaryKo: true,
                summaryFr: true,
                summaryAr: true,
              },
            },
          },
        },
      },
    })

    const result = tabs.map((tab) => ({
      id: tab.slug,
      name: tab.name,
      nameEn: tab.nameEn,
      nameJa: tab.nameJa,
      nameKo: tab.nameKo,
      nameFr: tab.nameFr,
      nameAr: tab.nameAr,
      categories: tab.categories.map((cat) => ({
        id: cat.slug,
        name: cat.name,
        nameEn: cat.nameEn,
        nameJa: cat.nameJa,
        nameKo: cat.nameKo,
        nameFr: cat.nameFr,
        nameAr: cat.nameAr,
        models: cat.products.map((p) => ({
          id: p.slug,
          model: p.model,
          name: p.name,
          nameEn: p.nameEn,
          nameJa: p.nameJa,
          nameKo: p.nameKo,
          nameFr: p.nameFr,
          nameAr: p.nameAr,
          // 与 products 接口的 description 同口径：subtitle 优先、退 summary。
          // 仅用于搜索下拉的一行说明文字。
          description: p.subtitle || p.summary || '',
          descriptionEn: p.subtitleEn || p.summaryEn || '',
          descriptionJa: p.subtitleJa || p.summaryJa || '',
          descriptionKo: p.subtitleKo || p.summaryKo || '',
          descriptionFr: p.subtitleFr || p.summaryFr || '',
          descriptionAr: p.subtitleAr || p.summaryAr || '',
        })),
      })),
    }))

    return cachedJson({ success: true, data: result }, 'static-long')
  } catch (error) {
    console.error('API nav error:', error)
    return cachedJson({ success: false, error: '获取导航数据失败' }, 'static-long', 500)
  }
}
