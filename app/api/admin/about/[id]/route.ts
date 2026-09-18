import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation, pickTarget } from '@/lib/operation-log'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const item = await prisma.aboutSection.findUnique({ where: { id: BigInt(params.id) } })
    if (!item) return NextResponse.json({ error: '板块不存在' }, { status: 404 })
    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await req.json()
  await recordOperation({ module: 'about', action: 'update', target: pickTarget(body) })
    const item = await prisma.aboutSection.update({ where: { id: BigInt(params.id) }, data: body })
    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    await prisma.aboutSection.delete({ where: { id: BigInt(params.id) } })
    await recordOperation({ module: 'about', action: 'delete', target: String(params.id) })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
