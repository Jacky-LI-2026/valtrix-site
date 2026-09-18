import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// 获取翻译配置
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    // 从site_config表中获取翻译配置
    const config = await prisma.siteConfig.findUnique({
      where: { configKey: 'translate_config' },
    })

    if (config) {
      const raw = config.configValue as unknown
      const data =
        typeof raw === 'string'
          ? JSON.parse(raw)
          : (raw as Record<string, any>) || {}
      return NextResponse.json(data)
    }

    // 返回默认配置
    return NextResponse.json({
      provider: 'baidu',
      baiduAppId: '',
      baiduAppKey: '',
      baiduEnabled: false,
      myMemoryEnabled: true,
      defaultTargetLang: 'en',
      autoTranslate: false,
    })
  } catch (error) {
    console.error('获取翻译配置失败:', error)
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 })
  }
}

// 更新翻译配置
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()

    // 保存或更新翻译配置
    await prisma.siteConfig.upsert({
      where: { configKey: 'translate_config' },
      update: {
        configValue: JSON.stringify(body),
        updatedAt: new Date(),
      },
      create: {
        configKey: 'translate_config',
        configValue: JSON.stringify(body),
        remark: '翻译服务配置',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('保存翻译配置失败:', error)
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 })
  }
}
