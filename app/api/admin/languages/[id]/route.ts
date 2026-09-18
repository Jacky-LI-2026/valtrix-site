import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation } from '@/lib/operation-log'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const language = await prisma.language.findUnique({
      where: { id: BigInt(params.id) },
    })
    if (!language) {
      return NextResponse.json({ error: '语种不存在' }, { status: 404 })
    }
    return NextResponse.json(serializeBigInt(language))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()

    // 如果设置为默认，先取消其他默认
    if (body.isDefault) {
      await prisma.language.updateMany({
        where: { isDefault: true, NOT: { id: BigInt(params.id) } },
        data: { isDefault: false },
      })
    }

    const language = await prisma.language.update({
      where: { id: BigInt(params.id) },
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
    try {
      await prisma.operationLog.create({
        data: {
          username: session.user.name || 'admin',
          module: 'language',
          action: 'update',
          target: body.name,
        },
      })
    } catch (e) {
      console.warn('记录操作日志失败:', e)
    }

    return NextResponse.json(serializeBigInt(language))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const language = await prisma.language.findUnique({
      where: { id: BigInt(params.id) },
    })
    if (language?.isDefault) {
      return NextResponse.json({ error: '不能删除默认语种' }, { status: 400 })
    }

    await prisma.language.delete({
      where: { id: BigInt(params.id) },
    })

    // 记录操作日志
    try {
      await prisma.operationLog.create({
        data: {
          username: session.user.name || 'admin',
          module: 'language',
          action: 'delete',
          target: language?.name || '',
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
