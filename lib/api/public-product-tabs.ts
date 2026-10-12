/**
 * 公共产品树（Tab → Category → Model）—— **唯一数据源**
 * ==========================================================================
 * 这段「取数 + 映射成前端结构」的逻辑原来**只存在于** `app/api/public/products/route.ts`。
 * 2026-10-12 抽到本模块，原因是 SEO 硬需求（owner：「如何让百度完整收录」）：
 *
 *   `/products` 与首页的产品区块都是**客户端取数**，而且产品列表页在接口回来前**只出骨架**
 *   （2026-10-01 为消除静态兜底树的死链而如此设计）⇒ SSR 出来的 HTML 里
 *   **一条产品内链都没有**。百度这类"几乎不执行 JS"的爬虫看到的是一张空列表，
 *   「产品中心」这个枢纽页对内链/权重毫无贡献，详情页只能靠 sitemap 被动发现。
 *
 *   现在服务端页面可以调用**同一个函数**把真实产品树注入首屏：
 *   形状与客户端接口**逐字段一致**（同一个 mapper + 同一套 `specs/lite` 口径）
 *   ⇒ 首屏渲染与 hydration 后的渲染完全同值：不会闪变，也不会有死链（数据是库里的真值）。
 *
 * ⚠️ 改动本模块 = 同时改了「公开接口」与「页面首屏」两处行为，务必两边都回归。
 */
import { prisma } from "@/lib/prisma";

export interface PublicProductTabsOptions {
  /**
   * 每个型号携带的规格行数：
   *   · `null`（= 接口不传 `?specs=` 的历史口径）⇒ 全部规格；
   *   · `0` ⇒ 整段省略 `specs` 字段（最小载荷）；
   *   · `n` ⇒ 只取前 n 行（**在数据库层 take**，省掉读全表规格的开销）。
   */
  specsLimit?: number | null;
  /**
   * 列表/首页专用瘦身（对应接口 `?lite=1`）：
   *   · 丢掉六语种富文本正文 `detailContent*`（详情页专属，占全量 64.2%）；
   *   · `features*` 每语种只留**前 3 条**（产品卡片只展示前 3 条核心特性）。
   */
  lite?: boolean;
  /** 租户站点范围（`buildSiteWhere(ctx.siteId)` 的结果；不传=不过滤） */
  siteWhere?: Record<string, any>;
}

export async function getPublicProductTabs(opts: PublicProductTabsOptions = {}) {
  const specsLimit = opts.specsLimit === undefined ? null : opts.specsLimit;
  const lite = !!opts.lite;
  const siteWhere = opts.siteWhere || {};

  const tabs = await prisma.productTab.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      categories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          products: {
            // visible=true：后台把「前台显示」关掉的产品，前台产品树/列表页一律不出现
            where: { AND: [{ status: 'published' }, { visible: true }, siteWhere] },
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

  // 转换为前端兼容的数据结构（**逐字段与公开接口一致**，勿随手裁剪）
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
        // specs 是**体积大头**（占全量 96.3%）⇒ 仅在 `specs` 未指定时返回全部；
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

  /**
   * lite 模式：剥掉仅详情页需要的**大字段**（此处做，避免改动上面那段长映射的字面量，
   * 降低漏字段的风险）。注意这是**传输层瘦身** —— 数据库仍会读出这几列，
   * 若要连读取也省掉，需要把上面的 include 改成显式 select（后续可做）。
   *
   * owner 2026-10-07：「[产品卡片] 显示核心特性的前 3 条」——
   *   卡片只用前 3 条，而 `features*` 六语种全量是大头（原注释：约占全量 7%）
   *   ⇒ **lite 档不再整段丢弃 features，而是每语种只留前 3 条**：
   *   既让列表卡片拿得到"核心特性",又不把整段卖点塞进列表首包。
   *   （`detailContent*` 仍然整段丢弃 —— 它是详情页专属且体积最大。）
   */
  if (lite) {
    const DROP_ALWAYS = [
      "detailContent", "detailContentEn", "detailContentJa", "detailContentKo", "detailContentFr", "detailContentAr",
    ]
    const FEATURE_KEYS = ["features", "featuresEn", "featuresJa", "featuresKo", "featuresFr", "featuresAr"]
    /** 列表卡片要展示的条数（前端也只取前 3 条，这里对齐同一口径） */
    const LITE_FEATURE_LIMIT = 3
    for (const tab of result) {
      for (const cat of tab.categories) {
        for (const m of cat.models) {
          const row = m as Record<string, unknown>
          for (const k of DROP_ALWAYS) delete row[k]
          for (const k of FEATURE_KEYS) {
            const v = row[k]
            if (Array.isArray(v)) {
              if (v.length > LITE_FEATURE_LIMIT) row[k] = v.slice(0, LITE_FEATURE_LIMIT)
            } else {
              delete row[k]
            }
          }
        }
      }
    }
  }

  return result
}
