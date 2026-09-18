import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getBaiduPushConfig, pushUrlsToBaidu, collectAllPublicUrls } from '@/lib/seo/baidu-push'
import { getIndexNowConfig, pushUrlsToIndexNow } from '@/lib/seo/indexnow'

// GET：收录推送配置状态（百度 + IndexNow）
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const cfg = await getBaiduPushConfig()
  const inw = await getIndexNowConfig()
  return NextResponse.json({
    configured: !!(cfg.site && cfg.token),
    site: cfg.site,
    hasToken: !!cfg.token,
    indexnowConfigured: !!(inw.key && inw.host),
    indexnowKey: inw.key,
  })
}

// POST：手动推送（百度 + IndexNow 双通道）
// body: { urls?: string[], all?: boolean } —— all=true 推送全站 URL（默认）；否则推 urls
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  let urls: string[] = []
  try {
    const body = await req.json().catch(() => ({}))
    if (body.all) {
      const cfg = await getBaiduPushConfig()
      if (!cfg.site) return NextResponse.json({ error: '未配置收录推送站点地址（需先填写 site 与 token）' }, { status: 400 })
      const base = cfg.site.replace(/\/+$/, '')
      urls = await collectAllPublicUrls(base)
    } else if (Array.isArray(body.urls) && body.urls.length > 0) {
      urls = body.urls
    } else {
      return NextResponse.json({ error: '请提供 urls 数组，或传 all=true 推送全站' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const [baidu, indexnow] = await Promise.allSettled([pushUrlsToBaidu(urls), pushUrlsToIndexNow(urls)])
  const br = baidu.status === 'fulfilled' ? baidu.value : { ok: false, error: String((baidu as any).reason || '百度推送失败') }
  const ir = indexnow.status === 'fulfilled' ? indexnow.value : { ok: false, error: String((indexnow as any).reason || 'IndexNow 推送失败') }
  return NextResponse.json({
    count: urls.length,
    baidu: br,
    indexnow: ir,
    body: br.ok ? br.body : br.error,
  })
}
