import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

const DEFAULT_THEME = {
  id: '0',
  primary: '#CC0000',
  primaryLight: '#E53935',
  primaryDark: '#990000',
  accent: '#C0C0C0',
  dark: '#111111',
}

// 获取当前主题配置（单例表，取第一条）
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const config = await prisma.themeConfig.findFirst({
      orderBy: { id: 'asc' },
    })

    if (!config) {
      return NextResponse.json(DEFAULT_THEME)
    }

    return NextResponse.json(serializeBigInt(config))
  } catch (error) {
    console.error('获取主题配置失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 更新主题配置（单例表，更新第一条，不存在则创建）
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { primary, primaryLight, primaryDark, accent, dark } = body

    const existing = await prisma.themeConfig.findFirst({
      orderBy: { id: 'asc' },
    })

    let config
    if (existing) {
      config = await prisma.themeConfig.update({
        where: { id: existing.id },
        data: {
          primary: primary || '#CC0000',
          primaryLight: primaryLight || '#E53935',
          primaryDark: primaryDark || '#990000',
          accent: accent || '#C0C0C0',
          dark: dark || '#111111',
        },
      })
    } else {
      config = await prisma.themeConfig.create({
        data: {
          primary: primary || '#CC0000',
          primaryLight: primaryLight || '#E53935',
          primaryDark: primaryDark || '#990000',
          accent: accent || '#C0C0C0',
          dark: dark || '#111111',
        },
      })
    }

    return NextResponse.json(serializeBigInt(config))
  } catch (error) {
    console.error('更新主题配置失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
