import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { memberTokenFromRequest, verifyMemberToken } from '@/lib/member-token'

/** 门户提交工单（会员登录） */
export async function POST(req: NextRequest) {
  const payload = verifyMemberToken(memberTokenFromRequest(req))
  if (!payload) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  const member = await prisma.member.findUnique({ where: { id: BigInt(payload.mid) } })
  if (!member || member.status === 'disabled') {
    return NextResponse.json({ error: '账号不可用' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const subject = String(body.subject || '').trim()
  const content = String(body.content || '').trim()
  if (!subject || !content) return NextResponse.json({ error: '请填写工单主题与内容' }, { status: 400 })
  if (subject.length > 200 || content.length > 10000) {
    return NextResponse.json({ error: '内容超长' }, { status: 400 })
  }

  const date = new Date()
  const prefix = `TK${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const count = await prisma.ticket.count({ where: { ticketNo: { startsWith: prefix } } })
  const ticketNo = `${prefix}-${String(count + 1).padStart(4, '0')}`

  const ticket = await prisma.ticket.create({
    data: {
      ticketNo,
      memberId: member.id,
      customerName: member.company || member.name,
      contactEmail: member.email,
      category: ['general', 'license', 'manual', 'quote', 'other'].includes(body.category) ? body.category : 'general',
      subject,
      content,
      status: 'open',
      priority: body.priority === 'high' ? 'high' : 'normal',
    },
  })
  return NextResponse.json({ ok: true, ticket: serializeBigInt(ticket) })
}

/** 门户查看我的工单 */
export async function GET(req: NextRequest) {
  const payload = verifyMemberToken(memberTokenFromRequest(req))
  if (!payload) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  const tickets = await prisma.ticket.findMany({
    where: { memberId: BigInt(payload.mid) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ ok: true, tickets: serializeBigInt(tickets) })
}
