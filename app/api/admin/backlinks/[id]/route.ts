import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

const PLATFORM_TYPES = ['zhihu', 'baijiahao', 'sohu', 'toutiao', 'tieba', 'forum', 'weibo', 'other'] as const
const STATUSES = ['planned', 'published', 'live', 'failed', 'expired'] as const

// PUT：更新外链
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body.platform || !body.url) {
      return NextResponse.json({ error: '平台与外链地址不能为空' }, { status: 400 })
    }
    const item = await prisma.backlink.update({
      where: { id: BigInt(params.id) },
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

// DELETE：删除外链
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    await prisma.backlink.delete({ where: { id: BigInt(params.id) } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
