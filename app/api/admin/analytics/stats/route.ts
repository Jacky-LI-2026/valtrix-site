import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { getGeoInfo } from '@/lib/geo'

export const dynamic = 'force-dynamic'

function getDomain(referrer: string, siteHost: string): string {
  try {
    const u = new URL(referrer)
    if (u.hostname === siteHost) return '站内导航'
    return u.hostname.replace(/^www\./, '')
  } catch {
    return referrer.slice(0, 60)
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const siteHost = req.headers.get('host') || ''
  const { searchParams } = new URL(req.url)
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get('days') || '14') || 14))

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const onlineThreshold = new Date(Date.now() - 5 * 60 * 1000)
  const trendStart = new Date(todayStart.getTime() - (days - 1) * 24 * 3600 * 1000)

  try {
    // ---- 概览卡片 ----
    const [totalVisitors, totalPageViews, totalEvents, todayVisitors, todayPageViews, todayEvents, onlineCount] =
      await Promise.all([
        prisma.analyticsVisitor.count(),
        prisma.analyticsPageView.count(),
        prisma.analyticsEvent.count(),
        prisma.analyticsVisitor.count({ where: { firstVisitAt: { gte: todayStart } } }),
        prisma.analyticsPageView.count({ where: { enteredAt: { gte: todayStart } } }),
        prisma.analyticsEvent.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.analyticsVisitor.count({ where: { lastSeenAt: { gte: onlineThreshold } } }),
      ])

    // ---- 近14天趋势（按天分组） ----
    const [visitorRows, viewRows]: any = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT date_trunc('day', "firstVisitAt")::date AS day, count(*)::int AS cnt
         FROM analytics_visitors WHERE "firstVisitAt" >= $1 GROUP BY 1 ORDER BY 1`,
        trendStart
      ),
      prisma.$queryRawUnsafe(
        `SELECT date_trunc('day', "enteredAt")::date AS day, count(*)::int AS cnt
         FROM analytics_page_views WHERE "enteredAt" >= $1 GROUP BY 1 ORDER BY 1`,
        trendStart
      ),
    ])
    const visitMap = new Map(visitorRows.map((r: any) => [String(r.day).slice(0, 10), r.cnt]))
    const viewMap = new Map(viewRows.map((r: any) => [String(r.day).slice(0, 10), r.cnt]))
    const trend = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 24 * 3600 * 1000)
      const key = d.toISOString().slice(0, 10)
      trend.push({ date: key, visitors: visitMap.get(key) || 0, views: viewMap.get(key) || 0 })
    }

    // ---- 热门页面 TOP10 ----
    const topPages = await prisma.analyticsPageView.groupBy({
      by: ['path'],
      _count: { id: true },
      _sum: { duration: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    // ---- 平均停留时长 + 事件 TOP ----
    const [avgAgg, eventTop] = await Promise.all([
      prisma.analyticsPageView.aggregate({ _avg: { duration: true } }),
      prisma.analyticsEvent.groupBy({
        by: ['type'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ])
    const avgDuration = Math.round((avgAgg._avg.duration || 0) * 10) / 10

    // ---- 来源聚合（取最近 referrer 非空记录，内存聚合域名） ----
    const recentReferred = await prisma.analyticsPageView.findMany({
      where: { referrer: { not: { equals: '' } } },
      select: { referrer: true },
      orderBy: { enteredAt: 'desc' },
      take: 3000,
    })
    const domainCount = new Map<string, number>()
    let directCount = 0
    const directSample = await prisma.analyticsPageView.count({
      where: { referrer: { equals: '' } },
    })
    recentReferred.forEach((r) => {
      const dom = getDomain(r.referrer || '', siteHost)
      domainCount.set(dom, (domainCount.get(dom) || 0) + 1)
    })
    const sources = [
      { name: '直接访问', count: directSample },
      ...[...Array.from(domainCount.entries())]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ].slice(0, 10)

    // ---- 设备 / 浏览器 / 系统分布 ----
    const [deviceRows, browserRows, osRows]: any = await Promise.all([
      prisma.analyticsVisitor.groupBy({
        by: ['deviceType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.analyticsVisitor.groupBy({
        by: ['browser'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.analyticsVisitor.groupBy({
        by: ['os'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ])

    // ---- 地域分布 + 历史地域补全 ----
    const geoMissing = await prisma.analyticsVisitor.findMany({
      where: { country: null, ip: { not: { equals: '' } } },
      select: { id: true, ip: true },
      take: 3000,
    })
    if (geoMissing.length > 0) {
      // 批量补全历史访客地域（内网 IP 标记为"本地/内网"）
      for (const v of geoMissing) {
        const geo = getGeoInfo(v.ip)
        if (geo) {
          await prisma.analyticsVisitor.update({
            where: { id: v.id },
            data: {
              country: geo.isLocal ? '本地/内网' : geo.country,
              region: geo.isLocal ? null : geo.region || null,
              city: geo.isLocal ? null : geo.city || null,
            },
          })
        }
      }
    }
    const geoRows = await prisma.analyticsVisitor.findMany({
      select: { country: true, region: true, city: true },
    })
    const countryMap = new Map<string, number>()
    const regionMap = new Map<string, number>()
    const cityMap = new Map<string, number>()
    geoRows.forEach((r) => {
      const c = r.country || '未知'
      countryMap.set(c, (countryMap.get(c) || 0) + 1)
      if (r.region) {
        const key = `${r.country || ''}·${r.region}`
        regionMap.set(key, (regionMap.get(key) || 0) + 1)
      }
      if (r.city) {
        const key = `${r.country || ''}·${r.region || ''}·${r.city}`
        cityMap.set(key, (cityMap.get(key) || 0) + 1)
      }
    })
    const geoCountries = Array.from(countryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    const geoRegions = Array.from(regionMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    const geoCities = Array.from(cityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json(
      serializeBigInt({
        overview: {
          totalVisitors,
          totalPageViews,
          totalEvents,
          todayVisitors,
          todayPageViews,
          todayEvents,
          onlineCount,
          avgDuration,
        },
        trend,
        topPages: topPages.map((p) => ({
          path: p.path,
          views: p._count.id,
          duration: p._sum.duration || 0,
        })),
        eventTop: eventTop.map((r: any) => ({ name: r.type || 'unknown', count: r._count.id })),
        sources,
        devices: deviceRows.map((r: any) => ({ name: r.deviceType || 'unknown', count: r._count.id })),
        browsers: browserRows.map((r: any) => ({ name: r.browser || 'unknown', count: r._count.id })),
        osList: osRows.map((r: any) => ({ name: r.os || 'unknown', count: r._count.id })),
        geoCountries,
        geoRegions,
        geoCities,
      })
    )
  } catch (error: any) {
    console.error('获取统计失败:', error)
    return NextResponse.json({ error: error.message || '获取统计失败' }, { status: 500 })
  }
}
