import { prisma } from '@/lib/prisma'
import { pushUrlsToBaidu } from './baidu-push'

/** IndexNow 配置 */
export async function getIndexNowConfig() {
  try {
    const c = await prisma.sEOConfig.findFirst({ orderBy: { id: 'asc' } })
    return { key: c?.indexnowKey || '', host: c?.baiduSiteUrl || '' }
  } catch {
    return { key: '', host: '' }
  }
}

/**
 * 必应 / Yandex / Seznam 等 IndexNow 主动推送（加速收录，免费无限额）
 * 文档：https://www.indexnow.org/
 * 批量推送：POST https://api.indexnow.org/indexnow  body: { host, key, keyLocation, urlList }
 */
export async function pushUrlsToIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
  const unique = Array.from(new Set(urls.filter((u) => u && u.startsWith('http'))))
  if (unique.length === 0) return { ok: false, error: '没有可推送的 URL' }
  const { key, host } = await getIndexNowConfig()
  if (!key || !host) return { ok: false, error: '未配置 IndexNow key 与站点地址（SEO 设置页）' }
  const hostClean = host.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  try {
    const payload = {
      host: hostClean,
      key,
      keyLocation: `https://${hostClean}/${key}.txt`,
      urlList: unique,
    }
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, body: text || '(空)' }
  } catch (e: any) {
    return { ok: false, error: e.message || 'IndexNow 推送失败' }
  }
}

/** 统一推送：内容发布/更新时调用（百度 + IndexNow，fire-and-forget，失败静默） */
export function queueUrlPush(urls: string[]): void {
  if (!urls || urls.length === 0) return
  void (async () => {
    try {
      const [baidu, indexnow] = await Promise.allSettled([pushUrlsToBaidu(urls), pushUrlsToIndexNow(urls)])
      if (process.env.NODE_ENV === 'development') {
        const br = baidu.status === 'fulfilled' ? baidu.value : { error: String((baidu as any).reason) }
        const ir = indexnow.status === 'fulfilled' ? indexnow.value : { error: String((indexnow as any).reason) }
        console.log('[queueUrlPush]', JSON.stringify({ urls: urls.length, baidu: (br as any).ok ?? false, indexnow: (ir as any).ok ?? false }))
      }
    } catch {
      /* 静默 */
    }
  })()
}
