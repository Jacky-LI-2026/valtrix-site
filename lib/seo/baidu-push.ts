import { prisma } from '@/lib/prisma'
import { getSiteBaseUrl as resolveSiteBaseUrl } from '@/lib/site-url'

/** 百度站长主动推送配置 */
export async function getBaiduPushConfig() {
  try {
    const c = await prisma.sEOConfig.findFirst({ orderBy: { id: 'asc' } })
    return {
      site: c?.baiduSiteUrl || '',
      token: c?.baiduPushToken || '',
    }
  } catch {
    return { site: '', token: '' }
  }
}

/** 站点 base URL（百度推送用）
 *  优先用 SEOConfig 里配置的百度站点地址；未配置时回退部署级 NEXT_PUBLIC_SITE_URL
 *  （**不再硬编码域名** —— 双 fork 合并 D1=单码多库，各站域名不同） */
export async function getSiteBaseUrl(): Promise<string> {
  const { site } = await getBaiduPushConfig()
  return String(site || resolveSiteBaseUrl()).replace(/\/+$/, '')
}

/**
 * 百度站长主动推送（普通收录）
 * https://ziyuan.baidu.com/ 站点管理 → 普通收录 → 推送接口
 * POST https://data.zz.baidu.com/urls?site=...&token=...  body: 每行一个 URL
 */
export async function pushUrlsToBaidu(urls: string[]): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
  const unique = Array.from(new Set(urls.filter((u) => u && u.startsWith('http'))))
  if (unique.length === 0) return { ok: false, error: '没有可推送的 URL' }
  const { site, token } = await getBaiduPushConfig()
  if (!site || !token) return { ok: false, error: '未配置百度站长站点地址与推送 token' }
  try {
    const res = await fetch(
      `https://data.zz.baidu.com/urls?site=${encodeURIComponent(site)}&token=${encodeURIComponent(token)}`,
      { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: unique.join('\n'), cache: 'no-store' }
    )
    const text = await res.text()
    return { ok: res.ok, status: res.status, body: text }
  } catch (e: any) {
    return { ok: false, error: e.message || '推送请求失败' }
  }
}

/** 收集全站公开 URL（百度主动推送用，含静态页 + 全部已发布内容） */
export async function collectAllPublicUrls(baseUrl: string): Promise<string[]> {
  const staticPaths = [
    '', '/products', '/services', '/services/custom-manufacturing', '/services/technical-support', '/services/technical-support',
    '/services/after-sales', '/industries', '/resources', '/news', '/about', '/about/profile',
    '/about/culture', '/about/history', '/about/honors', '/careers', '/contact', '/faqs', '/cases',
  ]
  const urls = staticPaths.map((p) => `${baseUrl}${p}`)
  try {
    const [products, news, industries, resourceCategories, jobs, services] = await Promise.all([
      prisma.product.findMany({ where: { status: 'published' }, select: { slug: true, category: { select: { slug: true, tab: { select: { slug: true } } } } } }),
      prisma.news.findMany({ where: { status: 'published' }, select: { slug: true } }),
      prisma.industry.findMany({ where: { status: 'published' }, select: { slug: true } }),
      prisma.resourceCategory.findMany({ select: { type: true } }),
      prisma.job.findMany({ where: { status: 'open' }, select: { slug: true } }),
      prisma.service.findMany({ where: { status: 'published' }, select: { slug: true } }),
    ])
    products.forEach((p) => urls.push(`${baseUrl}/products/${p.category?.tab?.slug || 'growth'}/${p.slug}`))
    news.forEach((n) => urls.push(`${baseUrl}/news/${n.slug}`))
    industries.forEach((i) => urls.push(`${baseUrl}/industries/${i.slug}`))
    resourceCategories.forEach((r) => urls.push(`${baseUrl}/resources/${r.type}`))
    jobs.forEach((j) => urls.push(`${baseUrl}/careers/${j.slug}`))
    services.forEach((s) => urls.push(`${baseUrl}/services/${s.slug}`))
  } catch (e) {
    console.error('collectAllPublicUrls error:', e)
  }
  return urls
}
