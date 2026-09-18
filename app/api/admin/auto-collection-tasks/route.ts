import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

// 获取所有自动采集任务
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const tasks = await prisma.autoCollectionTask.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(serializeBigInt(tasks))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 创建自动采集任务
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      name,
      keyword,
      categoryId,
      frequency,
      autoPublish,
      includeImage,
      defaultImage,
      enabled,
    } = body

    if (!name || !keyword) {
      return NextResponse.json({ error: '任务名称和关键词不能为空' }, { status: 400 })
    }

    const task = await prisma.autoCollectionTask.create({
      data: {
        name,
        keyword,
        categoryId: categoryId ? BigInt(categoryId) : null,
        frequency: frequency || 'daily',
        autoPublish: autoPublish || false,
        includeImage: includeImage ?? true,
        defaultImage: defaultImage || null,
        enabled: enabled ?? true,
      },
    })

    return NextResponse.json(serializeBigInt(task))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
