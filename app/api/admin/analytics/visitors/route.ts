import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const ip = searchParams.get('ip')
  const online = searchParams.get('online') === '1'

  try {
    const where: any = {}
    if (ip) where.ip = { contains: ip }
    if (online) {
      where.lastSeenAt = { gte: new Date(Date.now() - 5 * 60 * 1000) }
    }

    const [visitors, total] = await Promise.all([
      prisma.analyticsVisitor.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.analyticsVisitor.count({ where }),
    ])

    // 每个访客的事件数/浏览数
    const withCounts = await Promise.all(
      visitors.map(async (v) => {
        const [eventCount, pageViewCount] = await Promise.all([
          prisma.analyticsEvent.count({ where: { visitorId: v.id } }),
          prisma.analyticsPageView.count({ where: { visitorId: v.id } }),
        ])
        return { ...v, eventCount, pageViewCount }
      })
    )

    return NextResponse.json(
      serializeBigInt({
        visitors: withCounts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      })
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
