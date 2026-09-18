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
