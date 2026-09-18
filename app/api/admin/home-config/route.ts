import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation } from '@/lib/operation-log'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const config = await prisma.homeConfig.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    })
    if (!config) {
      // 创建默认配置
      const defaultConfig = await prisma.homeConfig.create({
        data: {
          name: '默认首页配置',
          isActive: true,
          banners: [],
          features: [],
          stats: [],
          featuredProducts: [],
          showNews: true,
          showIndustries: true,
          showServices: true,
          ctaTitle: '开启您的流体系统项目',
          ctaSubtitle: '联系我们，获取专业的阀门与流体控制解决方案',
          ctaButtonText: '立即咨询',
          ctaButtonLink: '/contact',
        },
      })
      return NextResponse.json(serializeBigInt(defaultConfig))
    }
    return NextResponse.json(serializeBigInt(config))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: '缺少配置ID' }, { status: 400 })
    }

    const config = await prisma.homeConfig.update({
      where: { id: BigInt(id) },
      data,
    })

    // 记录操作日志
    await recordOperation({ module: 'settings', action: 'update', target: '首页配置', detail: JSON.stringify({ configId: id.toString() }) })

    return NextResponse.json(serializeBigInt(config))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
