import { prisma } from '@/lib/prisma'
import {
  productTabs as staticProductTabs,
  type ProductTab,
  type ProductModel,
} from '@/lib/products'

/**
 * 获取全部产品数据（三层结构 Tab → Category → Model）
 * 优先从数据库读取，失败时回退到静态数据 lib/products.ts
 */
export async function getProductTabs(): Promise<ProductTab[]> {
  try {
    const tabs = await prisma.productTab.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            products: {
              // visible=true：后台设了「前台不显示」的产品不进前台产品树
              where: { status: 'published', visible: true },
              orderBy: { sortOrder: 'asc' },
              include: {
                productSpecs: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    })

    return tabs.map((tab) => ({
      id: tab.slug,
      name: tab.name,
      nameEn: tab.nameEn || undefined,
      nameJa: (tab as any).nameJa || undefined,
      nameKo: (tab as any).nameKo || undefined,
      nameFr: (tab as any).nameFr || undefined,
      nameAr: (tab as any).nameAr || undefined,
      categories: tab.categories.map((cat) => ({
        id: cat.slug,
        name: cat.name,
        nameEn: cat.nameEn || undefined,
        nameJa: (cat as any).nameJa || undefined,
        nameKo: (cat as any).nameKo || undefined,
        nameFr: (cat as any).nameFr || undefined,
        nameAr: (cat as any).nameAr || undefined,
        icon: 'Package',
        description: '',
        descriptionEn: '',
        models: cat.products.map((p) => mapProductToModel(p)),
      })),
    }))
  } catch (error) {
    console.warn('[getProductTabs] 数据库查询失败，回退静态数据:', error)
    return staticProductTabs
  }
}

/**
 * 根据 slug 获取单个产品详情
 */
export async function getProductBySlug(slug: string): Promise<ProductModel | null> {
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        productSpecs: { orderBy: { sortOrder: 'asc' } },
        category: true,
        tab: true,
      },
    })

    // 前台不显示的产品：按不存在处理（详情页 / 短链都据此 404）
    if (!product || product.visible === false) return null
    return mapProductToModel(product)
  } catch (error) {
    console.warn('[getProductBySlug] 数据库查询失败，回退静态数据:', error)
    for (const tab of staticProductTabs) {
      for (const cat of tab.categories) {
        const found = cat.models.find((m) => m.id === slug)
        if (found) return found
      }
    }
    return null
  }
}

/**
 * 取产品的**规范路径** `/products/<tab>/<slug>`
 * ==========================================================================
 * 用途：短链 `/products/<slug>`（历史链接、外部引用、手输型号）要 308 到规范路径。
 * 规范路径真源 = 产品所属 tab 的 slug（`Product.tabId → product_tab.slug`），
 * 与产品列表页生成链接的口径一致（ProductsDefaultClient 用 `tab.id / model.id`）。
 * 找不到或未发布 ⇒ null（调用方给 404，绝不软跳到一个不存在的页面）。
 */
export async function getProductCanonicalPath(slug: string): Promise<string | null> {
  const s = String(slug || "").trim()
  if (!s) return null
  try {
    const p = await prisma.product.findUnique({
      where: { slug: s },
      select: { slug: true, status: true, visible: true, tab: { select: { slug: true } } },
    })
    if (!p || p.status !== 'published' || p.visible === false || !p.tab?.slug) return null
    return `/products/${p.tab.slug}/${p.slug}`
  } catch (error) {
    console.warn('[getProductCanonicalPath] 数据库查询失败，回退静态数据:', error)
  }
  for (const tab of staticProductTabs) {
    for (const cat of tab.categories) {
      if (cat.models.some((m) => m.id === s)) return `/products/${tab.id}/${s}`
    }
  }
  return null
}

/**
 * 获取所有产品 slug 列表（用于 generateStaticParams / sitemap）
 */
export async function getAllProductSlugs(): Promise<{ tab: string; id: string }[]> {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'published', visible: true },
      select: { slug: true, tab: { select: { slug: true } } },
    })
    return products.map((p) => ({ tab: p.tab.slug, id: p.slug }))
  } catch (error) {
    console.warn('[getAllProductSlugs] 数据库查询失败，回退静态数据:', error)
    const slugs: { tab: string; id: string }[] = []
    for (const tab of staticProductTabs) {
      for (const cat of tab.categories) {
        for (const model of cat.models) {
          slugs.push({ tab: tab.id, id: model.id })
        }
      }
    }
    return slugs
  }
}

// 内部：数据库产品对象 → 前端 ProductModel 格式
function mapProductToModel(p: any): ProductModel {
  return {
    id: p.slug,
    name: p.name,
    nameEn: p.nameEn,
    model: p.model,
    image: p.coverImage || '',
    images: (p.images as string[]) || undefined,
    frames360: p.frames360
      ? {
          path: (p.frames360 as any).template,
          count: (p.frames360 as any).totalFrames,
          startIndex: (p.frames360 as any).startIndex,
        }
      : undefined,
    description: p.subtitle || p.summary || '',
    descriptionEn: '',
    detailContent: p.description,
    detailContentEn: '',
    manualUrl: p.manualUrl || undefined,
    manualUrlEn: undefined,
    specs: (p.productSpecs || []).map((s: any) => ({
      label: s.label,
      value: s.value,
      labelEn: undefined,
      valueEn: undefined,
    })),
    features: (p.features as string[]) || [],
    featuresEn: undefined,
  }
}
