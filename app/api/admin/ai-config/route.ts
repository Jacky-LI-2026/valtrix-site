import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

// 获取AI配置
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const config = await prisma.aIConfig.findFirst({
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(serializeBigInt(config))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 更新AI配置
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { provider, apiKey, baseUrl, model, enabled, remark } = body

    const existing = await prisma.aIConfig.findFirst({
      orderBy: { id: 'asc' },
    })

    if (existing) {
      const config = await prisma.aIConfig.update({
        where: { id: existing.id },
        data: {
          provider: provider || existing.provider,
          apiKey: apiKey !== undefined ? apiKey : existing.apiKey,
          baseUrl: baseUrl !== undefined ? baseUrl : existing.baseUrl,
          model: model || existing.model,
          enabled: enabled !== undefined ? enabled : existing.enabled,
          remark: remark !== undefined ? remark : existing.remark,
        },
      })
      return NextResponse.json(serializeBigInt(config))
    } else {
      const config = await prisma.aIConfig.create({
        data: {
          provider: provider || 'openai',
          apiKey: apiKey || '',
          baseUrl: baseUrl || '',
          model: model || 'gpt-4o-mini',
          enabled: enabled || false,
          remark: remark || '',
        },
      })
      return NextResponse.json(serializeBigInt(config))
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
