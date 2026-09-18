import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation } from '@/lib/operation-log'

export async function GET() {
  try {
    const count = await prisma.language.count()
    // 如果没有语种，初始化默认语种
    if (count === 0) {
      const defaultLanguages = [
        { code: 'zh', name: '中文', nameEn: 'Chinese', flag: '🇨🇳', isDefault: true, isActive: true, sortOrder: 1 },
        { code: 'en', name: '英文', nameEn: 'English', flag: '🇺🇸', isDefault: false, isActive: true, sortOrder: 2 },
        { code: 'ja', name: '日文', nameEn: 'Japanese', flag: '🇯🇵', isDefault: false, isActive: true, sortOrder: 3 },
        { code: 'ko', name: '韩文', nameEn: 'Korean', flag: '🇰🇷', isDefault: false, isActive: true, sortOrder: 4 },
      ]
      await prisma.language.createMany({ data: defaultLanguages })
    }
    const languages = await prisma.language.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    })
    return NextResponse.json(serializeBigInt(languages))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()

    // 如果设置为默认，先取消其他默认
    if (body.isDefault) {
      await prisma.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const language = await prisma.language.create({
      data: {
        code: body.code,
        name: body.name,
        nameEn: body.nameEn || '',
        flag: body.flag || '',
        isDefault: body.isDefault || false,
        isActive: body.isActive !== false,
        sortOrder: Number(body.sortOrder) || 0,
      },
    })

    // 记录操作日志
    await recordOperation({ module: 'language', action: 'create', target: body.name })

    return NextResponse.json(serializeBigInt(language))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
