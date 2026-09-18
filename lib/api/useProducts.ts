'use client'

import { useState, useEffect } from 'react'
import {
  productTabs as staticProductTabs,
  type ProductTab,
  type ProductModel,
} from '@/lib/products'

/**
 * 客户端获取产品数据（三层结构）
 * 优先从 /api/public/products 获取，失败时回退到静态数据
 *
 * 🔴 2026-09-15 体积瘦身（**两处，缺一不可**）：
 *
 *   ① **参数瘦身：请求带 `?specs=3`。**
 *      实测剖析见 `scripts/_diag_payload_profile.js`：全量响应 3.47MB，其中 **`specs` 占 96.3%**；
 *      而本 hook 的所有消费者（Header / Footer / Hero / 产品页 / 搜索 / 展示区 / 详情页兜底）
 *      **最多只用前 3 条规格**。需要完整规格的地方走 `/api/public/products/<型号>`。
 *      阀门站线上实测（2026-09-15）：**3467.1KB/12.7s → 516.6KB/1.9s（体积 6.7×、耗时 6.3×）**。
 *      ⚠️ 此处若写"约 0.3MB / 11×"是**过时值**（那是最初的估算，实测并非如此），不要改回去。
 *
 *   ② **请求去重：同页只发一次。**
 *      此前每个调用方各自 `fetch`，而 `cache:'no-store'` 不做任何去重 ——
 *      阀门站产品详情页实测**在 15ms 内并发发出 4 次完全相同的请求**，每次 528,984B，
 *      ⇒ **单页纯重复下载 2.02MB**。现统一由 `loadProductTabs()` 收口。
 *
 *   （服务端不带该参数时行为不变，故本改动**不破坏既有契约**。）
 */

/** 缓存有效期：60s 内跨路由复用同一份产品树，避免每次挂载都重下。后台改分类最多 60s 后生效。 */
const TABS_TTL_MS = 60_000

/**
 * 两种取数档位（2026-09-18 新增 lite 档）
 * =====================================================
 * · `lite`（默认）→ `?specs=3&lite=1`：**去掉**六语种富文本正文与卖点。
 *   列表页 / 首页 / 相关产品 / 询价车都只用图片、名称、价格、规格前 3 条 ⇒ 它们不需要这两组字段。
 *   实测：企业站 236KB → 约 90KB；阀门站生产实测（`?specs=3`）约 516KB ⇒ 同比例大降。
 * · `full` → `?specs=3`：**保留** `detailContent*` / `features*`。
 *   只有产品详情页需要 —— 它在单产品接口返回**之前**会把列表项当作兜底渲染源
 *   （见各主题目录下的 ProductDetailPage.tsx 里的 loc.get(model,"detailContent")），
 *   少了这两组会导致详情正文/卖点在加载窗口内先空一次再出现。
 *
 * ⚠️ 两档各有独立缓存与在途去重，互不覆盖（同一页最多各一次请求）。
 */
type TabsMode = "lite" | "full"

// 模块级单例（仅浏览器侧会写入：唯一的调用点在 useEffect 内，服务端渲染不触发）
const tabsSlots: Record<TabsMode, { data: ProductTab[] | null; at: number; inflight: Promise<ProductTab[] | null> | null }> = {
  lite: { data: null, at: 0, inflight: null },
  full: { data: null, at: 0, inflight: null },
}

/**
 * 取产品树：命中未过期缓存直接返回；有在途请求则复用同一 Promise；否则才发唯一一次请求。
 * 返回值 `null` 表示失败（调用方沿用静态兜底数据）。
 */
function loadProductTabs(mode: TabsMode): Promise<ProductTab[] | null> {
  const slot = tabsSlots[mode]
  if (slot.data && Date.now() - slot.at < TABS_TTL_MS) {
    return Promise.resolve(slot.data)
  }
  if (slot.inflight) return slot.inflight

  const url = mode === "full" ? '/api/public/products?specs=3' : '/api/public/products?specs=3&lite=1'

  slot.inflight = (async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return null
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        slot.data = data.data
        slot.at = Date.now()
        return slot.data
      }
      return null
    } catch (error) {
      // 失败**不**写缓存：下一次调用可重试
      console.warn('[useProductTabs] API获取失败，使用静态数据:', error)
      return null
    } finally {
      slot.inflight = null
    }
  })()
  return slot.inflight
}

/**
 * @param opts.full 传 `{ full: true }` 才取全量（含详情正文/卖点）；默认走 lite 档。
 *   只有产品详情页应该传 true，其余（列表/首页/相关产品/询价车）保持默认。
 */
export function useProductTabs(opts?: { full?: boolean }) {
  const mode: TabsMode = opts?.full ? "full" : "lite"
  // 初值仍为静态数据 ⇒ SSR 输出与客户端首次渲染完全不变（无 hydration 风险）
  const [productTabs, setProductTabs] = useState<ProductTab[]>(staticProductTabs)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadProductTabs(mode).then((data) => {
      if (cancelled) return
      if (data) setProductTabs(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [mode])

  return { productTabs, loading }
}

/**
 * 从静态数据（`lib/products.ts`）构造一个**结构完整**的详情对象：
 *   型号本体 + `tab` + `category` + `related`。
 *
 * 为什么需要它：详情页改版后（2026-09-18）以单产品接口为**唯一**数据源，并靠
 *   `dp.tab && dp.category` 判定"数据可用"。而静态数据里只有型号本体 ——
 *   若不给首帧与接口失败两条路径补上这三项，页面会在首帧退化成"产品不存在"。
 *
 * ⚠️ 首帧初值与接口失败兜底**必须用同一个函数**，否则两条路径的结构会不一致。
 */
function buildStaticProduct(slug: string | undefined): ProductModel | null {
  if (!slug) return null
  for (const tab of staticProductTabs) {
    for (const cat of tab.categories) {
      const found = cat.models.find((m) => m.id === slug)
      if (found) {
        return {
          ...found,
          tab: {
            id: tab.id,
            name: tab.name,
            nameEn: tab.nameEn,
            nameJa: tab.nameJa,
            nameKo: tab.nameKo,
            nameFr: tab.nameFr,
            nameAr: tab.nameAr,
          },
          category: {
            id: cat.id,
            name: cat.name,
            nameEn: cat.nameEn,
            nameJa: cat.nameJa,
            nameKo: cat.nameKo,
            nameFr: cat.nameFr,
            nameAr: cat.nameAr,
          },
          related: cat.models.filter((m) => m.id !== found.id).slice(0, 6),
        } as ProductModel
      }
    }
  }
  return null
}

/**
 * 客户端根据 slug 获取单个产品
 *
 * 初值直接取静态数据 ⇒ **首帧就能渲染**（与改造前"靠全量产品树的静态初值立即渲染"等效），
 * 接口回来后再换成数据库版本。因此详情页不需要加载骨架，也不会闪"产品不存在"。
 */
export function useProductBySlug(slug: string | undefined) {
  const [product, setProduct] = useState<ProductModel | null>(() => buildStaticProduct(slug))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/public/products/${slug}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.success && data.data) {
            setProduct(data.data)
          }
        }
      } catch (error) {
        console.warn('[useProductBySlug] API获取失败:', error)
        // 回退：静态数据（与首帧初值同一个构造函数，保证结构一致）
        const fallback = buildStaticProduct(slug)
        if (fallback && !cancelled) setProduct(fallback)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchProduct()
    return () => { cancelled = true }
  }, [slug])

  return { product, loading }
}

/**
 * 客户端获取扁平化产品系列列表（用于导航、搜索、首页展示）
 * 结构与 lib/products.ts 的 `products` 导出兼容
 */
export function useProductsFlat() {
  const { productTabs, loading } = useProductTabs()

  const products = productTabs.map((tab) => ({
    slug: tab.id,
    name: tab.name,
    nameEn: tab.nameEn || tab.name,
    nameJa: tab.nameJa || "",
    nameKo: tab.nameKo || "",
    nameFr: tab.nameFr || "",
    nameAr: tab.nameAr || "",
    tagline: tab.categories.map((c) => c.name).join("、"),
    taglineEn: tab.categories.map((c) => c.nameEn || c.name).join(", "),
    taglineJa: tab.categories.map((c) => c.nameJa || c.name).join("、"),
    taglineKo: tab.categories.map((c) => c.nameKo || c.name).join("、"),
    taglineFr: tab.categories.map((c) => c.nameFr || c.name).join("、"),
    taglineAr: tab.categories.map((c) => c.nameAr || c.name).join("、"),
    description: tab.categories[0]?.description || "",
    descriptionEn: tab.categories[0]?.descriptionEn || "",
    image: tab.categories[0]?.models[0]?.image || "",
  }))

  return { products, loading }
}

/**
 * **导航专用**产品树（轻量）—— 与 `useProductTabs()` 同形，但打的是 `/api/public/nav`
 * =====================================================
 * 为什么要分开（2026-09-18）：`useProductTabs()` 打 `/api/public/products?specs=3`，
 *   而该接口的响应里 **96% 的体积是导航用不到的大字段**（六语种富文本 detailContent、
 *   features、images、frames360、价格、规格）。它又被 Header/Footer/搜索条在**每个页面**
 *   调用 ⇒ 每次进页面都要先下载约 516KB 才能渲染出导航（代码内记录的阀门站线上实测）。
 *
 * 本 hook 打 `/api/public/nav`：只含「系列 → 分类 → 型号」的 id 与六语种名称
 *   （外加型号一句描述，供搜索下拉显示），预计 < 1/10 体积。
 *
 * 返回值刻意保持 `{ productTabs, loading }` 形状 ⇒ 消费方只改 import 与 hook 名，
 *   映射/渲染代码一行不动（G1：前台版式零改动）。
 *
 * ⚠️ **只给导航/搜索用**。产品列表页、产品卡、详情页需要图片/价格/规格，
 *    必须继续用 `useProductTabs()`，不要替换。
 */
const NAV_TTL_MS = 60_000

let navCache: ProductTab[] | null = null
let navCachedAt = 0
let navInflight: Promise<ProductTab[] | null> | null = null

/**
 * 取导航产品树：命中未过期缓存直接返回；有在途请求则复用同一 Promise；否则只发一次。
 * 与 `loadProductTabs` 的差别：**不带 `cache:'no-store'`** —— 导航数据变化频率低，
 * 交给浏览器 HTTP 缓存（配合响应头 `s-maxage` + SWR）能省掉重复下载。
 */
function loadNavTabs(): Promise<ProductTab[] | null> {
  if (navCache && Date.now() - navCachedAt < NAV_TTL_MS) {
    return Promise.resolve(navCache)
  }
  if (navInflight) return navInflight

  navInflight = (async () => {
    try {
      const res = await fetch('/api/public/nav')
      if (!res.ok) return null
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        navCache = data.data
        navCachedAt = Date.now()
        return navCache
      }
      return null
    } catch (error) {
      // 失败**不**写缓存：下一次调用可重试（并沿用静态兜底数据，导航不会白屏）
      console.warn('[useNavTabs] API获取失败，使用静态数据:', error)
      return null
    } finally {
      navInflight = null
    }
  })()
  return navInflight
}

export function useNavTabs() {
  // 初值与 useProductTabs 一致（静态兜底）⇒ SSR 输出与首帧完全不变，无 hydration 风险
  const [productTabs, setProductTabs] = useState<ProductTab[]>(staticProductTabs)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadNavTabs().then((data) => {
      if (cancelled) return
      if (data) setProductTabs(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return { productTabs, loading }
}
