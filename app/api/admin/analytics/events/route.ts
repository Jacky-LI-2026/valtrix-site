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
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '30')))
  const type = searchParams.get('type')
  const visitorId = searchParams.get('visitorId')

  try {
    const where: any = {}
    if (type && type !== 'all') where.type = type
    if (visitorId) {
      const id = parseInt(visitorId)
      if (!isNaN(id)) where.visitorId = BigInt(id)
    }

    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        include: { visitor: { select: { ip: true, deviceType: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.analyticsEvent.count({ where }),
    ])

    return NextResponse.json(
      serializeBigInt({
        events,
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
