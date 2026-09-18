import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

const PLATFORM_TYPES = ['zhihu', 'baijiahao', 'sohu', 'toutiao', 'tieba', 'forum', 'weibo', 'other'] as const
const STATUSES = ['planned', 'published', 'live', 'failed', 'expired'] as const

// GET：外链列表（支持 ?status= &platformType= &keyword=）
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const platformType = searchParams.get('platformType')
    const keyword = searchParams.get('keyword')
    const where: any = {}
    if (status && STATUSES.includes(status as any)) where.status = status
    if (platformType && PLATFORM_TYPES.includes(platformType as any)) where.platformType = platformType
    if (keyword) {
      where.OR = [
        { platform: { contains: keyword } },
        { title: { contains: keyword } },
        { url: { contains: keyword } },
        { keyword: { contains: keyword } },
      ]
    }
    const items = await prisma.backlink.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(serializeBigInt(items))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST：新建外链
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body.platform || !body.url) {
      return NextResponse.json({ error: '平台与外链地址不能为空' }, { status: 400 })
    }
    const item = await prisma.backlink.create({
      data: {
        platform: String(body.platform),
        platformType: PLATFORM_TYPES.includes(body.platformType) ? body.platformType : 'other',
        title: body.title || '',
        url: String(body.url),
        targetUrl: body.targetUrl || '',
        status: STATUSES.includes(body.status) ? body.status : 'planned',
        priority: Number(body.priority) || 3,
        keyword: body.keyword || '',
        note: body.note || '',
        publishDate: body.publishDate ? new Date(body.publishDate) : null,
        checkDate: body.checkDate ? new Date(body.checkDate) : null,
      },
    })
    return NextResponse.json(serializeBigInt(item))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
