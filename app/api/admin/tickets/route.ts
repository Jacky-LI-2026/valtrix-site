import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { auth } from '@/auth'
import { recordOperation } from '@/lib/operation-log'

/** 工单管理：GET 列表 / PUT 回复与状态 / DELETE */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') || ''
  const where: any = {}
  if (status && status !== 'all') where.status = status
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  // 关联会员名
  const memberIds = tickets.map((t: any) => t.memberId).filter(Boolean)
  let members: Record<string, string> = {}
  if (memberIds.length) {
    const ms = await prisma.member.findMany({ where: { id: { in: memberIds as bigint[] } }, select: { id: true, name: true, company: true } })
    members = Object.fromEntries(ms.map((m: any) => [String(m.id), (m.company || m.name || '')]))
  }
  const list = tickets.map((t: any) => ({ ...t, memberName: t.memberId ? members[String(t.memberId)] || '' : '' }))
  return NextResponse.json({ ok: true, tickets: serializeBigInt(list) })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = Number(body.id)
  if (!id) return NextResponse.json({ error: '参数错误' }, { status: 400 })
  const data: any = {}
  if (body.reply !== undefined) data.reply = String(body.reply || '')
  if (body.status && ['open', 'replied', 'closed'].includes(body.status)) {
    data.status = body.status
    if (body.status !== 'open' && data.reply) data.reply = data.reply
  }
  const ticket = await prisma.ticket.update({ where: { id: BigInt(id) }, data })
  await recordOperation({ module: 'portal', action: 'update', target: `工单回复：${ticket.subject}` })
  return NextResponse.json({ ok: true, ticket: serializeBigInt(ticket) })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: '参数错误' }, { status: 400 })
  await prisma.ticket.delete({ where: { id: BigInt(id) } })
  return NextResponse.json({ ok: true })
}
