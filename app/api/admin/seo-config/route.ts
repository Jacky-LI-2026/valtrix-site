import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const config = await prisma.sEOConfig.findFirst({
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(serializeBigInt(config))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const existing = await prisma.sEOConfig.findFirst({
      orderBy: { id: 'asc' },
    })

    if (existing) {
      const config = await prisma.sEOConfig.update({
        where: { id: existing.id },
        data: body,
      })
      return NextResponse.json(serializeBigInt(config))
    } else {
      const config = await prisma.sEOConfig.create({
        data: body,
      })
      return NextResponse.json(serializeBigInt(config))
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
