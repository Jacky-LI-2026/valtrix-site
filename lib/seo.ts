import { prisma } from './prisma'
import { siteUrl } from './site-url'
import { getBrandName, getBrandNameEn } from './brand'

/**
 * 默认 SEO 兜底（**不含任何品牌名** —— 双 fork 共用同一份代码，见 G2）
 * 正常运行时以 DB `seo_config` 为准；这里只在 DB 未配置时兜底，
 * 取值全部来自部署级环境变量，未配置则为空串（宁可没有，也不显示别家公司的名字）。
 */
const DEFAULT_SEO = {
  siteName: getBrandName(),
  siteNameEn: getBrandNameEn(),
  defaultTitle: String(process.env.NEXT_PUBLIC_DEFAULT_TITLE || '').trim(),
  defaultDesc: String(process.env.NEXT_PUBLIC_DEFAULT_DESC || '').trim(),
  keywords: String(process.env.NEXT_PUBLIC_DEFAULT_KEYWORDS || '').trim(),
  companyName: '',
  companyAddress: '',
  phone: '',
  email: '',
  latitude: '',
  longitude: '',
  geoRegion: '',
}

/**
 * 部署级「分语种默认标题」（均来自 env，未配置则为空串）。
 *
 * 为什么需要：站点默认标题原为**单语言**（DB seo_config.defaultTitle 或
 * `NEXT_PUBLIC_DEFAULT_TITLE`），首页 `<title>` 因此无论切到哪个语种都显示中文
 * （用户报障：「多语言切换后浏览器 <title> 仍为中文」）。
 * 列表页/详情页的标题本就走 i18n / 记录级 seoTitle<语种>，不受影响；
 * 缺的正是**首页这一条**的多语言来源。
 *
 * ⚠️ 必须**静态引用** `process.env.NEXT_PUBLIC_*`：Next 在构建期做字面量内联，
 *    动态键名（process.env[`...${x}`]）取不到值。
 * 未配置时回退中文，**不改变既有行为**。
 */
const LOCALIZED_DEFAULT_TITLES: Record<string, string> = {
  zh: String(process.env.NEXT_PUBLIC_DEFAULT_TITLE || '').trim(),
  en: String(process.env.NEXT_PUBLIC_DEFAULT_TITLE_EN || '').trim(),
  ja: String(process.env.NEXT_PUBLIC_DEFAULT_TITLE_JA || '').trim(),
  ko: String(process.env.NEXT_PUBLIC_DEFAULT_TITLE_KO || '').trim(),
  fr: String(process.env.NEXT_PUBLIC_DEFAULT_TITLE_FR || '').trim(),
  ar: String(process.env.NEXT_PUBLIC_DEFAULT_TITLE_AR || '').trim(),
}

/** 取某语种的部署级默认标题；未配置返回空串（由调用方回退） */
export function localizedDefaultTitle(locale: string): string {
  return LOCALIZED_DEFAULT_TITLES[locale] || ''
}

/**
 * 语种 → 数据库列名后缀（与 lib/admin-form.ts 的 langFieldName 约定一致）
 * 例：defaultTitle + 'Fr' → `defaultTitleFr`
 */
const LANG_COL_SUFFIX: Record<string, string> = { zh: '', en: 'En', ja: 'Ja', ko: 'Ko', fr: 'Fr', ar: 'Ar' }

/**
 * 站点默认标题（按当前语种）——**页面级 SEO 多语言**（owner 2026-09-21）
 * ==========================================================================
 * 取值优先级：**库内该语种** → 部署级 env 该语种 → **库内中文** → env 中文。
 * 为什么这样排：后台「设置 → SEO」是客户自己能改的地方，应优先于 env；
 *   env 只在"后台还没填"时兜底（老部署的行为不变），最后才回退中文保证不空。
 */
export function seoTitleForLocale(seo: any, locale: string): string {
  const suffix = LANG_COL_SUFFIX[locale] ?? ''
  return (
    String(seo?.[`defaultTitle${suffix}`] || '').trim() ||
    localizedDefaultTitle(locale) ||
    String(seo?.defaultTitle || '').trim()
  )
}

/** 站点默认描述（按当前语种）：库内该语种 → 库内中文（env 只有标题，无分语种描述） */
export function seoDescForLocale(seo: any, locale: string): string {
  const suffix = LANG_COL_SUFFIX[locale] ?? ''
  return String(seo?.[`defaultDesc${suffix}`] || '').trim() || String(seo?.defaultDesc || '').trim()
}

/** 站点默认关键词（按当前语种）：库内该语种 → 库内中文 */
export function seoKeywordsForLocale(seo: any, locale: string): string {
  const suffix = LANG_COL_SUFFIX[locale] ?? ''
  return String(seo?.[`keywords${suffix}`] || '').trim() || String(seo?.keywords || '').trim()
}

// 获取SEO配置（多租户：可传入请求 headers 按 Host 解析站点，站点级 siteName 覆盖全局；全局 sEOConfig 表为空时用默认值）
export async function getSEOConfig(headers?: Headers | Record<string, string | string[] | null | undefined>) {
  const result: any = { ...DEFAULT_SEO }
  try {
    const config = await prisma.sEOConfig.findFirst({
      orderBy: { id: 'asc' },
    })
    if (config) {
      result.siteName = config.siteName || DEFAULT_SEO.siteName
      result.siteNameEn = config.siteNameEn || DEFAULT_SEO.siteNameEn
      result.defaultTitle = config.defaultTitle || DEFAULT_SEO.defaultTitle
      result.defaultDesc = config.defaultDesc || DEFAULT_SEO.defaultDesc
      result.keywords = config.keywords || DEFAULT_SEO.keywords
      // 页面级 SEO 多语言（2026-09-21）：把各语种列一并带出，交由 seoTitleForLocale 等取值
      for (const s of ['En', 'Ja', 'Ko', 'Fr', 'Ar']) {
        result[`defaultTitle${s}`] = (config as any)[`defaultTitle${s}`] || ''
        result[`defaultDesc${s}`] = (config as any)[`defaultDesc${s}`] || ''
        result[`keywords${s}`] = (config as any)[`keywords${s}`] || ''
      }
      result.companyName = config.companyName || ''
      result.companyAddress = config.companyAddress || ''
      result.phone = config.phone || ''
      result.email = config.email || ''
      result.latitude = config.latitude || ''
      result.longitude = config.longitude || ''
      result.geoRegion = config.geoRegion || ''
    }
  } catch (e) {
    console.error('获取SEO配置失败:', e)
  }

  // 多租户：站点级名称覆盖（域名解析到的站点 siteName 优先于全局 SEO 配置；无全局配置时同样生效）
  try {
    const { getTenantContext } = await import('./tenant/context')
    const ctx = await getTenantContext(headers)
    if (ctx?.siteName) {
      const sn = String(ctx.siteName).trim()
      if (sn && sn !== '企业官网') {
        const isGlobalCustomized = result.siteName && result.siteName !== DEFAULT_SEO.siteName
        result.siteName = sn
        result.siteNameEn = /[A-Za-z]/.test(result.siteNameEn) ? result.siteNameEn : sn.toUpperCase()
        if (!isGlobalCustomized) {
          // 全局未定制站点名时，站点名变化同步影响默认标题前缀。
          // 前缀不硬编码，直接从 DEFAULT_SEO 推导（双 fork 合并：不再写死某站品牌名）
          const oldPrefix = `${DEFAULT_SEO.siteName} ${DEFAULT_SEO.siteNameEn}`
          if (oldPrefix.trim() && result.defaultTitle.startsWith(oldPrefix)) {
            result.defaultTitle = `${sn} ${sn.toUpperCase()}${result.defaultTitle.slice(oldPrefix.length)}`
          }
        }
      }
    }
  } catch {
    /* 租户解析失败回退全局/默认 */
  }
  return result
}

// 生成页面metadata
export async function generatePageMetadata({
  title,
  description,
  keywords,
  path,
}: {
  title?: string
  description?: string
  keywords?: string
  path?: string
}) {
  const seo = await getSEOConfig()
  const pageTitle = title ? `${title} - ${seo.siteName}` : seo.defaultTitle
  const pageDesc = description || seo.defaultDesc
  const pageKeywords = keywords ? `${keywords}, ${seo.keywords}` : seo.keywords

  return {
    title: pageTitle,
    description: pageDesc,
    keywords: pageKeywords,
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      type: 'website',
      siteName: seo.siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
    },
    alternates: {
      canonical: siteUrl(path),
    },
  }
}
