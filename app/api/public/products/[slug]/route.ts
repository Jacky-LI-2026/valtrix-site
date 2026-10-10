import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      include: {
        productSpecs: { orderBy: { sortOrder: 'asc' } },
        category: true,
        tab: true,
        // 商城关联：默认模板详情页的「去商城购买」按钮要用 shopSlug
        shopProduct: { select: { slug: true, status: true } },
      },
    })

    // 详情同样只返回已发布内容（与 /api/public/products 列表口径一致；草稿/下线不得经 URL 直读全文）
    // 另：后台把「前台显示」关掉（visible=false）的产品，同样按不存在返回 404
    if (!product || product.status !== 'published' || product.visible === false) {
      return cachedJson(
        { success: false, error: '产品不存在' },
        'content', 404)
    }

    // ---- 相关产品（同分类的其它已发布型号）随详情一起返回 ----
    // 为什么放在这里：详情页的「相关产品」区块原本靠**再拉一次全量产品树**来取，
    // 而那棵树里约 64% 是六语种富文本正文（详情页只用得到当前这一个型号的）。
    // 随详情返回这一小块后，详情页**不再需要那次全量请求**（实测省 176~236KB/页）。
    let related: any[] = []
    try {
      if (product.categoryId != null) {
        const ctx = await getTenantContext(request.headers);
        const siteWhere = buildSiteWhere(ctx.siteId);
        const siblings = await prisma.product.findMany({
          where: {
            AND: [
              { categoryId: product.categoryId },
              { status: 'published' },
              { visible: true },
              { id: { not: product.id } },
              siteWhere,
            ],
          },
          orderBy: { sortOrder: 'asc' },
          take: 6, // 前台最多显示 3 条；留出余量即可，不必更大
          select: {
            slug: true, model: true, coverImage: true, images: true,
            name: true, nameEn: true, nameJa: true, nameKo: true, nameFr: true, nameAr: true,
            subtitle: true, subtitleEn: true, subtitleJa: true, subtitleKo: true, subtitleFr: true, subtitleAr: true,
            summary: true, summaryEn: true, summaryJa: true, summaryKo: true, summaryFr: true, summaryAr: true,
            // 卡片上会显示「关键参数（至多 3 条）」，故带上前 3 行规格
            productSpecs: {
              orderBy: { sortOrder: 'asc' },
              take: 3,
              select: {
                label: true, value: true, unit: true,
                labelEn: true, labelJa: true, labelKo: true, labelFr: true, labelAr: true,
                valueEn: true, valueJa: true, valueKo: true, valueFr: true, valueAr: true,
              },
            },
          },
        })
        related = siblings.map((p) => ({
          id: p.slug,
          model: p.model,
          name: p.name,
          nameEn: p.nameEn, nameJa: p.nameJa, nameKo: p.nameKo, nameFr: p.nameFr, nameAr: p.nameAr,
          image: p.coverImage || '',
          images: p.images as string[] | undefined,
          // 与列表接口同口径：subtitle 优先、退 summary
          description: p.subtitle || p.summary || '',
          descriptionEn: p.subtitleEn || p.summaryEn || '',
          descriptionJa: p.subtitleJa || p.summaryJa || '',
          descriptionKo: p.subtitleKo || p.summaryKo || '',
          descriptionFr: p.subtitleFr || p.summaryFr || '',
          descriptionAr: p.subtitleAr || p.summaryAr || '',
          specs: p.productSpecs.map((s) => ({
            label: s.label, value: s.value, unit: s.unit || '',
            labelEn: s.labelEn || '', labelJa: s.labelJa || '', labelKo: s.labelKo || '',
            labelFr: s.labelFr || '', labelAr: s.labelAr || '',
            valueEn: s.valueEn || '', valueJa: s.valueJa || '', valueKo: s.valueKo || '',
            valueFr: s.valueFr || '', valueAr: s.valueAr || '',
          })),
        }))
      }
    } catch (e) {
      // 相关产品取不到不影响详情本体渲染
      console.error('API product related error:', e)
      related = []
    }

    const data = {
      id: product.slug,
      name: product.name,
      nameEn: product.nameEn,
      nameJa: product.nameJa,
      nameKo: product.nameKo,
      nameFr: product.nameFr,
      nameAr: product.nameAr,
      model: product.model,
      subtitle: product.subtitle || '',
      subtitleEn: product.subtitleEn || '',
      subtitleJa: product.subtitleJa || '',
      subtitleKo: product.subtitleKo || '',
      subtitleFr: product.subtitleFr || '',
      subtitleAr: product.subtitleAr || '',
      summary: product.summary || '',
      summaryEn: product.summaryEn || '',
      summaryJa: product.summaryJa || '',
      summaryKo: product.summaryKo || '',
      summaryFr: product.summaryFr || '',
      summaryAr: product.summaryAr || '',
      image: product.coverImage || '',
      // 视频封面与视频（默认模板详情页用来渲染视频块）
      coverImage: product.coverImage || '',
      video: product.video || '',
      images: product.images as string[] | undefined,
      frames360: product.frames360
        ? {
            path: (product.frames360 as any).template,
            count: (product.frames360 as any).totalFrames,
            startIndex: (product.frames360 as any).startIndex,
          }
        : undefined,
      description: product.subtitle || product.summary || '',
      descriptionEn: product.subtitleEn || product.summaryEn || '',
      descriptionJa: product.subtitleJa || product.summaryJa || '',
      descriptionKo: product.subtitleKo || product.summaryKo || '',
      descriptionFr: product.subtitleFr || product.summaryFr || '',
      descriptionAr: product.subtitleAr || product.summaryAr || '',
      detailContent: product.description,
      detailContentEn: product.descriptionEn,
      detailContentJa: product.descriptionJa,
      detailContentKo: product.descriptionKo,
      detailContentFr: product.descriptionFr,
      detailContentAr: product.descriptionAr,
      manualUrl: product.manualUrl || undefined,
      manualUrlEn: product.manualUrl || undefined,
      priceMin: product.priceMin !== null && product.priceMin !== undefined ? Number(product.priceMin) : null,
      priceMax: product.priceMax !== null && product.priceMax !== undefined ? Number(product.priceMax) : null,
      priceUnit: product.priceUnit || '',
      moq: product.moq ?? 1,
      priceNote: product.priceNote || '',
      // ↓ 以下字段原本只有「列表接口」才返回，导致默认模板详情页不得不以全量产品树为主数据源。
      //   2026-09-18 补齐：单产品接口本身就是"一个产品的完整事实"，缺字段会逼调用方去拉全树。
      price: product.price ? Number(product.price) : null,
      priceTiers: product.priceTiers as { qty: number; price: number }[] | undefined,
      isParts: product.isParts,
      // 购买模式挂在 tab 上（与列表接口同口径）
      purchaseMode: (product.tab as any)?.purchaseMode || 'quote',
      shopSlug: product.shopProduct?.status === 'published' ? product.shopProduct.slug : undefined,
      specs: product.productSpecs.map((s) => ({
        label: s.label,
        value: s.value,
        unit: s.unit || '',
        groupName: s.groupName || '',
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
      features: (product.features as string[]) || [],
      featuresEn: (product.featuresEn as string[]) || [],
      featuresJa: (product.featuresJa as string[]) || [],
      featuresKo: (product.featuresKo as string[]) || [],
      featuresFr: (product.featuresFr as string[]) || [],
      featuresAr: (product.featuresAr as string[]) || [],
      tab: product.tab ? { id: product.tab.slug, name: product.tab.name, nameEn: product.tab.nameEn, nameJa: product.tab.nameJa, nameKo: product.tab.nameKo, nameFr: product.tab.nameFr, nameAr: product.tab.nameAr } : null,
      category: product.category ? { id: product.category.slug, name: product.category.name, nameEn: product.category.nameEn, nameJa: product.category.nameJa, nameKo: product.category.nameKo, nameFr: product.category.nameFr, nameAr: product.category.nameAr } : null,
      related,
    }

    return cachedJson({ success: true, data }, 'content')
  } catch (error) {
    console.error('API product detail error:', error)
    return cachedJson(
      { success: false, error: '获取产品详情失败' },
      'content', 500)
  }
}
