import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeCoupon, couponInEffect } from "@/lib/shop-coupon";
import { verifyMemberToken, memberTokenFromRequest } from "@/lib/member-token";

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

// GET 领券中心（公开列表 + 会员领取状态）
export async function GET(req: NextRequest) {
  const tok = verifyMemberToken(memberTokenFromRequest(req));
  const mid = tok?.mid ? BigInt(tok.mid) : null;
  const coupons = await prisma.shopCoupon.findMany({
    where: { isActive: true },
    orderBy: { id: "desc" },
  });
  const now = new Date();
  // 会员已领数量 map
  let claimedMap = new Map<string, number>();
  if (mid) {
    const claims = await prisma.shopCouponClaim.findMany({
      where: { memberId: mid, used: false },
      select: { code: true },
    });
    claims.forEach((c) => claimedMap.set(c.code, (claimedMap.get(c.code) || 0) + 1));
  }
  return NextResponse.json({
    ok: true,
    coupons: coupons.map((c: any) => {
      const s = serializeCoupon(c);
      s.effective = couponInEffect(c as any, now);
      s.stockLeft = c.total > 0 ? Math.max(0, c.total - c.claimed) : -1;
      s.myClaimed = mid ? claimedMap.get(c.code) || 0 : 0;
      s.canClaim = !!(mid && s.effective && s.stockLeft !== 0 && s.myClaimed < c.perUser);
      return s;
    }),
    loggedIn: !!mid,
  });
}

// POST 领取 {code}
export async function POST(req: NextRequest) {
  const tok = verifyMemberToken(memberTokenFromRequest(req));
  if (!tok?.mid) return bad("请先登录后再领取", 401);
  const mid = BigInt(tok.mid);
  const body = await req.json().catch(() => null);
  const code = String(body?.code || "").trim();
  if (!code) return bad("缺少券码");
  const coupon = await prisma.shopCoupon.findUnique({ where: { code } });
  if (!coupon) return bad("券不存在");
  if (!coupon.isActive) return bad("该券已停用");
  if (!couponInEffect(coupon as any)) return bad("该券不在有效期");
  if (coupon.total > 0 && coupon.claimed >= coupon.total) return bad("该券已领完");

  const myClaims = await prisma.shopCouponClaim.count({ where: { couponId: coupon.id, memberId: mid } });
  if (myClaims >= coupon.perUser) return bad("已达每人限领数量");

  await prisma.$transaction([
    prisma.shopCoupon.update({ where: { id: coupon.id }, data: { claimed: { increment: 1 } } }),
    prisma.shopCouponClaim.create({ data: { couponId: coupon.id, memberId: mid, code } }),
  ]);
  return NextResponse.json({ ok: true, message: "领取成功" });
}
