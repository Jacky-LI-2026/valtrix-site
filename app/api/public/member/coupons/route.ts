import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeCoupon, couponInEffect } from "@/lib/shop-coupon";
import { verifyMemberToken, memberTokenFromRequest } from "@/lib/member-token";

export const dynamic = "force-dynamic";

// GET /api/public/member/coupons — 当前会员已领取的优惠券（含使用状态）
export async function GET(req: NextRequest) {
  const tok = verifyMemberToken(memberTokenFromRequest(req));
  if (!tok?.mid) return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  const mid = BigInt(tok.mid);

  const claims = await prisma.shopCouponClaim.findMany({
    where: { memberId: mid },
    orderBy: { id: "desc" },
    take: 100,
    select: { id: true, code: true, used: true, usedAt: true, orderNo: true, couponId: true, createdAt: true },
  });
  const coupons = await prisma.shopCoupon.findMany({
    where: { id: { in: claims.map((c) => c.couponId) } },
  });
  const now = new Date();

  return NextResponse.json({
    ok: true,
    coupons: claims.map((cl) => {
      const c = coupons.find((x) => x.id === cl.couponId);
      if (!c) return null;
      const s = serializeCoupon(c);
      return {
        ...s,
        claimId: String(cl.id),
        used: cl.used,
        usedAt: cl.usedAt,
        orderNo: cl.orderNo,
        claimedAt: cl.createdAt,
        state: cl.used ? "used" : !couponInEffect(c as any, now) ? "expired" : "usable",
      };
    }).filter(Boolean),
  });
}
