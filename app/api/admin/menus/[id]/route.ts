import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation } from '@/lib/operation-log'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const menu = await prisma.menu.findUnique({
      where: { id: BigInt(params.id) },
    })
    if (!menu) {
      return NextResponse.json({ error: '菜单不存在' }, { status: 404 })
    }
    return NextResponse.json(serializeBigInt(menu))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()
    const menu = await prisma.menu.update({
      where: { id: BigInt(params.id) },
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
    try {
      await prisma.operationLog.create({
        data: {
          username: session.user.name || 'admin',
          module: 'menu',
          action: 'update',
          target: body.name,
        },
      })
    } catch (e) {
      console.warn('记录操作日志失败:', e)
    }

    return NextResponse.json(serializeBigInt(menu))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    // 检查是否有子菜单
    const childCount = await prisma.menu.count({
      where: { parentId: BigInt(params.id) },
    })
    if (childCount > 0) {
      return NextResponse.json({ error: '请先删除子菜单' }, { status: 400 })
    }

    const menu = await prisma.menu.delete({
      where: { id: BigInt(params.id) },
    })

    // 记录操作日志
    try {
      await prisma.operationLog.create({
        data: {
          username: session.user.name || 'admin',
          module: 'menu',
          action: 'delete',
          target: menu.name,
        },
      })
    } catch (e) {
      console.warn('记录操作日志失败:', e)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
