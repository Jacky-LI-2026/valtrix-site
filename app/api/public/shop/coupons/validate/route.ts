import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcCouponDiscount, couponInEffect } from "@/lib/shop-coupon";

export const dynamic = "force-dynamic";

// POST /api/public/shop/coupons/validate — 输入券码预检（B2B 定向发券：未登录也可用）
// body: { code, total }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code || "").trim();
    const total = Number(body?.total) || 0;
    if (!code) return NextResponse.json({ ok: false, error: "请输入券码" }, { status: 400 });

    const cp = await prisma.shopCoupon.findUnique({ where: { code } });
    if (!cp || !cp.isActive) return NextResponse.json({ ok: false, error: "优惠券不存在或已停用" }, { status: 400 });
    if (!couponInEffect(cp as any)) return NextResponse.json({ ok: false, error: "优惠券不在有效期内" }, { status: 400 });
    if (cp.total > 0 && Number(cp.claimed) >= cp.total)
      return NextResponse.json({ ok: false, error: "该券已被领完" }, { status: 400 });

    const discount = calcCouponDiscount(cp as any, total);
    if (discount <= 0)
      return NextResponse.json({ ok: false, error: `未满足使用门槛（满 ¥${Number(cp.minAmount)} 可用）` }, { status: 400 });

    return NextResponse.json({
      ok: true,
      coupon: {
        code: cp.code,
        name: cp.name,
        nameEn: cp.nameEn,
        type: cp.type,
        amount: Number(cp.amount),
        minAmount: Number(cp.minAmount),
        maxDiscount: Number(cp.maxDiscount || 0),
        discount,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "校验失败" }, { status: 400 });
  }
}
