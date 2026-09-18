import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { memberTokenFromRequest, verifyMemberToken } from '@/lib/member-token'

/**
 * 客户门户概览（会员登录）
 * GET /api/portal/overview
 * 返回：会员信息 / 授权状态 / 我的询价统计 / 我的工单 / 可下载手册
 */
export async function GET(req: NextRequest) {
  const payload = verifyMemberToken(memberTokenFromRequest(req))
  if (!payload) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const member = await prisma.member.findUnique({ where: { id: BigInt(payload.mid) } })
  if (!member || member.status === 'disabled') {
    return NextResponse.json({ error: '账号不可用' }, { status: 401 })
  }

  const [quoteCount, tickets, manuals, licenseRow] = await Promise.all([
    prisma.quoteRequest.count({ where: { memberId: BigInt(payload.mid) } }),
    prisma.ticket.findMany({ where: { memberId: BigInt(payload.mid) }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.resourceItem.findMany({ where: { status: 'published' }, orderBy: { publishedAt: 'desc' }, take: 10 }),
    prisma.siteConfig.findUnique({ where: { configKey: 'license_status' } }),
  ])

  const license = (licenseRow?.configValue && typeof licenseRow.configValue === 'object'
    ? licenseRow.configValue
    : { status: 'unknown', message: '请联系销售获取授权信息' }) as any

  return NextResponse.json({
    ok: true,
    data: {
      member: {
        id: String(member.id),
        name: member.name,
        email: member.email,
        company: member.company || '',
        customerNo: member.customerNo || '',
        customerType: member.customerType,
        level: member.level,
      },
      license,
      stats: { quoteCount, ticketCount: tickets.length, manualCount: manuals.length },
      tickets: serializeBigInt(tickets),
      manuals: serializeBigInt(manuals),
    },
  })
}
