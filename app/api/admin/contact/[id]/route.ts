import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const msg = await prisma.contactMessage.findUnique({
      where: { id: BigInt(params.id) },
    })
    if (!msg) return NextResponse.json({ error: '留言不存在' }, { status: 404 })
    return NextResponse.json(serializeBigInt(msg))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await req.json()
    // 明确字段：status / notes / assignedTo（负责人，空则清除）
    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = String(body.status)
    if (body.notes !== undefined) data.notes = body.notes
    if (body.assignedTo !== undefined) {
      data.assignedTo = body.assignedTo ? BigInt(String(body.assignedTo)) : null
    }
    const msg = await prisma.contactMessage.update({
      where: { id: BigInt(params.id) },
      data,
    })
    return NextResponse.json(serializeBigInt(msg))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    await prisma.contactMessage.delete({ where: { id: BigInt(params.id) } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
