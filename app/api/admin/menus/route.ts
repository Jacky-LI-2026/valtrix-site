import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation } from '@/lib/operation-log'

export async function GET() {
  try {
    const menus = await prisma.menu.findMany({
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    })
    return NextResponse.json(serializeBigInt(menus))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()
    const menu = await prisma.menu.create({
      data: {
        name: body.name,
        nameEn: body.nameEn || '',
        nameJa: body.nameJa || '',
        nameKo: body.nameKo || '',
        nameFr: body.nameFr || '',
        nameAr: body.nameAr || '',
        description: body.description || '',
        descriptionEn: body.descriptionEn || '',
        descriptionJa: body.descriptionJa || '',
        descriptionKo: body.descriptionKo || '',
        descriptionFr: body.descriptionFr || '',
        descriptionAr: body.descriptionAr || '',
        url: body.url,
        parentId: body.parentId ? BigInt(body.parentId) : null,
        sortOrder: Number(body.sortOrder) || 0,
        isActive: body.isActive !== false,
        icon: body.icon || '',
      },
    })

    // 记录操作日志
    await recordOperation({ module: 'menu', action: 'create', target: body.name })

    return NextResponse.json(serializeBigInt(menu))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
