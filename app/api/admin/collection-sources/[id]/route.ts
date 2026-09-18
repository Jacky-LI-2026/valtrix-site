import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

// 编辑采集源（更新基础信息 + 采集后 AI 处理策略 aiMode）
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const id = String(params.id || '')
    if (!id) return NextResponse.json({ error: '缺少采集源ID' }, { status: 400 })

    const body = await req.json()
    const { name, url, type, categoryId, enabled, intervalMin, autoPublish, aiMode } = body

    const data: any = {}
    if (typeof name === 'string' && name.trim()) data.name = name.trim()
    if (typeof url === 'string' && url.trim()) data.url = url.trim()
    if (typeof type === 'string' && type) data.type = type
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') data.categoryId = BigInt(String(categoryId))
    if (categoryId === '' || categoryId === null) data.categoryId = null
    if (typeof enabled === 'boolean') data.enabled = enabled
    if (typeof intervalMin === 'number') data.intervalMin = intervalMin
    if (typeof autoPublish === 'boolean') data.autoPublish = autoPublish
    if (aiMode && ['off', 'summary', 'polish'].includes(aiMode)) {
      data.aiMode = aiMode
      data.useAI = aiMode !== 'off'
    }

    const source = await prisma.newsCollectionSource.update({
      where: { id: BigInt(id) },
      data,
      include: { category: true },
    })

    return NextResponse.json(serializeBigInt(source))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
