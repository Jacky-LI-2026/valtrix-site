import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { getGeoInfo } from '@/lib/geo'

export const runtime = 'nodejs'

// 获取客户端真实 IP
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first) return first
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp
  return req.headers.get('x-vercel-forwarded-for') || 'unknown'
}

// 从 User-Agent 解析设备/浏览器/系统
function parseUA(ua: string) {
  let deviceType = 'desktop'
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    deviceType = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile'
  }
  let browser = 'other'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome'
  else if (/firefox\//i.test(ua)) browser = 'Firefox'
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari'
  else if (/msie|trident/i.test(ua)) browser = 'IE'
  else if (/opera|opr\//i.test(ua)) browser = 'Opera'
  let os = 'other'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/linux/i.test(ua)) os = 'Linux'
  return { deviceType, browser, os }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const type = body.type || 'pageview'
    const visitorKey = String(body.visitorKey || '').slice(0, 64)
    if (!visitorKey) {
      return NextResponse.json({ error: '缺少 visitorKey' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const ua = req.headers.get('user-agent') || ''

    // 查找或创建访客
    let visitor = await prisma.analyticsVisitor.findUnique({
      where: { visitorKey },
    })

    const isNewVisitor = !visitor
    if (!visitor) {
      const { deviceType, browser, os } = parseUA(ua)
      const geo = getGeoInfo(ip)
      visitor = await prisma.analyticsVisitor.create({
        data: {
          visitorKey,
          ip: ip === 'unknown' ? null : ip,
          userAgent: ua || null,
          deviceType,
          browser,
          os,
          language: String(body.language || '').slice(0, 20) || null,
          referrer: String(body.referrer || '').slice(0, 2000) || null,
          landingPage: String(body.path || '').slice(0, 255) || null,
          country: geo?.country || null,
          region: geo?.region || null,
          city: geo?.city || null,
          isOnline: true,
        },
      })
    } else {
      // 更新最后活跃；若缺失地域则补全
      const updateData: any = { lastSeenAt: new Date(), isOnline: true }
      if (!visitor.country && !visitor.region && !visitor.city) {
        const geo = getGeoInfo(ip)
        if (geo) {
          updateData.country = geo.country
          updateData.region = geo.region || null
          updateData.city = geo.city || null
        }
      }
      await prisma.analyticsVisitor.update({
        where: { id: visitor.id },
        data: updateData,
      })
    }

    // 按事件类型处理
    if (type === 'visit' || type === 'heartbeat') {
      return NextResponse.json({ success: true, visitorId: String(visitor.id), isNewVisitor })
    }

    if (type === 'pageview') {
      const duration = Math.max(0, parseInt(body.duration) || 0)
      // 进入时：更新落地页/来源；离开时：更新停留时长
      if (body.leaving === true) {
        // 离开页面：更新最近的 pageView 记录
        const latest = await prisma.analyticsPageView.findFirst({
          where: { visitorId: visitor!.id, exitedAt: null },
          orderBy: { enteredAt: 'desc' },
        })
        if (latest) {
          await prisma.analyticsPageView.update({
            where: { id: latest.id },
            data: { duration, exitedAt: new Date() },
          })
          // 累计到访客总时长
          await prisma.analyticsVisitor.update({
            where: { id: visitor!.id },
            data: { totalDuration: { increment: duration } },
          })
        }
      } else {
        // 进入页面：新增页面浏览记录
        await prisma.analyticsPageView.create({
          data: {
            visitorId: visitor!.id,
            path: String(body.path || '/').slice(0, 255),
            title: String(body.title || '').slice(0, 255) || null,
            referrer: String(body.referrer || '').slice(0, 2000) || null,
          },
        })
      }
      return NextResponse.json({ success: true, visitorId: String(visitor.id) })
    }

    if (type === 'event') {
      const eventType = String(body.eventType || 'custom').slice(0, 20)
      // 关联当前打开的页面浏览
      const pageViewId = body.pageViewId ? BigInt(String(body.pageViewId).replace(/\D/g, '') || '0') : null
      await prisma.analyticsEvent.create({
        data: {
          visitorId: visitor!.id,
          pageViewId: pageViewId && pageViewId > BigInt(0) ? pageViewId : null,
          type: eventType,
          category: String(body.category || '').slice(0, 50) || null,
          action: String(body.action || '').slice(0, 100) || null,
          label: String(body.label || '').slice(0, 200) || null,
          value: String(body.value || '').slice(0, 500) || null,
          url: String(body.url || '').slice(0, 255) || null,
        },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: '未知事件类型' }, { status: 400 })
  } catch (error: any) {
    console.error('埋点记录失败:', error)
    return NextResponse.json({ error: error.message || '埋点失败' }, { status: 500 })
  }
}
