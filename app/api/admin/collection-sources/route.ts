import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

// 获取所有采集源
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const sources = await prisma.newsCollectionSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    })
    return NextResponse.json(serializeBigInt(sources))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 创建采集源
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      name,
      url,
      type,
      categoryId,
      enabled,
      intervalMin,
      autoPublish,
      useAI,
      aiMode,
    } = body

    if (!name || !url) {
      return NextResponse.json({ error: '名称和URL不能为空' }, { status: 400 })
    }

    const source = await prisma.newsCollectionSource.create({
      data: {
        name,
        url,
        type: type || 'rss',
        categoryId: categoryId ? BigInt(categoryId) : null,
        enabled: enabled ?? true,
        intervalMin: intervalMin || 60,
        autoPublish: autoPublish || false,
        useAI: useAI || false,
        aiMode: aiMode || 'off',
      },
    })

    return NextResponse.json(serializeBigInt(source))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
