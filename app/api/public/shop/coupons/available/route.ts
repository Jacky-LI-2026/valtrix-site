import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcCouponDiscount, couponInEffect, serializeCoupon } from "@/lib/shop-coupon";
import { verifyMemberToken, memberTokenFromRequest } from "@/lib/member-token";

export const dynamic = "force-dynamic";

// GET /api/public/shop/coupons/available?total=xxx — 当前会员可用于本单的券（已领未用 + 门槛命中）
export async function GET(req: NextRequest) {
  const tok = verifyMemberToken(memberTokenFromRequest(req));
  if (!tok?.mid) return NextResponse.json({ ok: true, coupons: [], loggedIn: false });
  const mid = BigInt(tok.mid);
  const total = Number(new URL(req.url).searchParams.get("total")) || 0;

  const claims = await prisma.shopCouponClaim.findMany({
    where: { memberId: mid, used: false },
    select: { id: true, code: true, couponId: true },
  });
  if (claims.length === 0) return NextResponse.json({ ok: true, coupons: [], loggedIn: true });

  const coupons = await prisma.shopCoupon.findMany({ where: { id: { in: claims.map((c) => c.couponId) }, isActive: true } });
  const now = new Date();
  const result = claims
    .map((cl) => {
      const c = coupons.find((x) => x.id === cl.couponId);
      if (!c || !couponInEffect(c as any)) return null;
      const s = serializeCoupon(c);
      const discount = calcCouponDiscount(c as any, total);
      if (discount <= 0) return null;
      return { ...s, claimId: String(cl.id), discount, usable: true };
    })
    .filter(Boolean);

  return NextResponse.json({ ok: true, coupons: result, loggedIn: true });
}
