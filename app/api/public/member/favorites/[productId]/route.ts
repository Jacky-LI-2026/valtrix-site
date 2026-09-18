import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMemberToken, memberTokenFromRequest } from "@/lib/member-token";

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

async function currentMember(req: NextRequest) {
  const payload = verifyMemberToken(memberTokenFromRequest(req));
  if (!payload) return null;
  const member = await prisma.member.findUnique({ where: { id: BigInt(payload.mid) } });
  if (!member || member.status !== "active") return null;
  return member;
}

async function resolveProductId(raw: string): Promise<bigint | null> {
  // 兼容数字 id 与 slug
  if (/^\d+$/.test(raw)) {
    const p = await prisma.product.findUnique({ where: { id: BigInt(raw) } });
    return p ? p.id : null;
  }
  const p = await prisma.product.findFirst({ where: { slug: raw } });
  return p ? p.id : null;
}

// POST /api/public/member/favorites/[productId] — 收藏
export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  const member = await currentMember(req);
  if (!member) return bad("未登录", 401);
  const productId = await resolveProductId(params.productId);
  if (!productId) return bad("产品不存在", 404);
  const existing = await prisma.memberFavorite.findUnique({
    where: { memberId_productId: { memberId: member.id, productId } },
  });
  if (!existing) {
    await prisma.memberFavorite.create({ data: { memberId: member.id, productId } });
  }
  return NextResponse.json({ ok: true, favorited: true });
}

// DELETE /api/public/member/favorites/[productId] — 取消收藏
export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
  const member = await currentMember(req);
  if (!member) return bad("未登录", 401);
  const productId = await resolveProductId(params.productId);
  if (!productId) return bad("产品不存在", 404);
  await prisma.memberFavorite.deleteMany({ where: { memberId: member.id, productId } });
  return NextResponse.json({ ok: true, favorited: false });
}
