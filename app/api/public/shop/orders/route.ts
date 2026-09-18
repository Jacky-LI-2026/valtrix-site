import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getLocationFields } from "@/lib/geo";
import { sendOrderConfirmationMail, sendNewOrderNoticeMail } from "@/lib/server/shop-mail";
import { calcUnitPrice } from "@/lib/shop-price";
import { calcCouponDiscount, couponInEffect } from "@/lib/shop-coupon";
import { verifyMemberToken, memberTokenFromRequest } from "@/lib/member-token";
import { assignOrderSales } from "@/lib/server/sales-assign";

export const dynamic = "force-dynamic";

function genOrderNo(): string {
  const d = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    "SO" +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

// POST /api/public/shop/orders — 提交订单（校验库存并扣减，发确认/通知邮件）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, company, address, remark, items, payMethod, poNo, invoiceTitle, taxNo } = body || {};

    if (!name || !String(name).trim()) return NextResponse.json({ ok: false, error: "请填写姓名/称呼" }, { status: 400 });
    if (!phone || !String(phone).trim()) return NextResponse.json({ ok: false, error: "请填写联系电话" }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return NextResponse.json({ ok: false, error: "请填写有效邮箱" }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ ok: false, error: "购物车为空" }, { status: 400 });

    // 校验商品并计算金额
    const slugs = items.map((i: any) => String(i.slug || i.id || ""));
    const products = await prisma.shopProduct.findMany({
      where: { slug: { in: slugs }, status: "published" },
    });
    if (products.length === 0) return NextResponse.json({ ok: false, error: "商品不存在或已下架" }, { status: 400 });
    const pmap = new Map(products.map((p) => [p.slug, p]));

    // 库存校验（-1 = 不限库存）
    const qtyMap = new Map<string, number>();
    for (const i of items) {
      const slug = String(i.slug || i.id || "");
      const p = pmap.get(slug);
      if (!p) return NextResponse.json({ ok: false, error: "部分商品不存在或已下架" }, { status: 400 });
      const qty = Math.max(1, Math.min(9999, Number(i.qty) || 1));
      qtyMap.set(slug, qty);
      if (p.stock !== null && Number(p.stock) >= 0 && qty > Number(p.stock)) {
        return NextResponse.json(
          { ok: false, error: `「${p.name}」库存不足（剩余 ${p.stock}${p.unit ? " " + p.unit : ""}）` },
          { status: 400 }
        );
      }
    }

    // 事务：创建订单 + 扣减库存（原子，防超卖）
    const orderNo = genOrderNo();
    const order = await prisma.$transaction(async (tx) => {
      // 扣库存：stock >= 0 的商品按 qty 递减，扣不动（并发冲突）则失败回滚
      for (const [slug, qty] of Array.from(qtyMap.entries())) {
        const p = pmap.get(slug)!;
        if (p.stock !== null && Number(p.stock) >= 0) {
          const r = await tx.shopProduct.updateMany({
            where: { id: p.id, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (r.count === 0) {
            throw new Error(`「${p.name}」库存不足，请减少数量后重试`);
          }
        }
      }
      let amount = 0;
      const detailItems = items.map((i: any) => {
        const p = pmap.get(String(i.slug || i.id || ""));
        const qty = Math.max(1, Math.min(9999, Number(i.qty) || 1));
        const price = p ? calcUnitPrice(p, qty) : null; // 阶梯价优先，服务端权威计算
        amount += (price === null ? 0 : price) * qty;
        // 规格商品：组合单价 = 基础价 + Σ选中选项增量（服务端从 DB specs 权威计算）
        let unitPrice = price;
        let specText = String(i.specText || "");
        if (p && Array.isArray(p.specs) && (p.specs as any[]).length > 0) {
          const dbSpecs = p.specs as any[];
          const selRaw: any = i.sel;
          // 兼容对象（旧数据 {0:2,1:1}）与数组（[2,1]）
          const sel: any[] = Array.isArray(selRaw)
            ? selRaw
            : selRaw && typeof selRaw === "object"
              ? Object.keys(selRaw).sort((a: any, b: any) => Number(a) - Number(b)).map((k: any) => Number(selRaw[k]))
              : [];
          let sum = Number(p.price) || 0;
          const texts: string[] = [];
          dbSpecs.forEach((d: any, di: number) => {
            const oi = Number(sel[di]);
            const opts: any[] = Array.isArray(d?.options) ? d.options : [];
            const o = opts[oi] || opts[0];
            const add = o && o.price !== "" && o.price != null ? Number(o.price) || 0 : 0;
            sum += add;
            texts.push((d?.name || "") + ":" + (o?.label || ""));
          });
          unitPrice = sum;
          if (!specText) specText = texts.join(" / ");
          // 折扣档位（specMode：档位=折扣百分比）
          const tiers = Array.isArray(p.priceTiers) ? (p.priceTiers as any[]) : [];
          const sortedT = [...tiers].sort((a2: any, b2: any) => Number(a2.qty) - Number(b2.qty));
          const hit = sortedT.filter((t: any) => qty >= Number(t.qty)).pop();
          if (hit && Number(hit.price) > 0) unitPrice = parseFloat((sum * Number(hit.price) / 100).toFixed(2));
          amount = amount - (price === null ? 0 : price) * qty + unitPrice * qty;
        }
        return {
          id: p ? String(p.id) : String(i.id || ""),
          slug: String(i.slug || i.id || ""),
          name: p ? p.name : String(i.name || ""),
          nameEn: p ? p.nameEn : String(i.nameEn || ""),
          price: unitPrice,
          qty,
          unit: p ? p.unit : (i.unit || ""),
          cover: p ? p.coverImage : (i.cover || ""),
          specText,
        };
      });
      const loc = getLocationFields(getClientIp(req.headers));
      // 登录会员下单 → 关联 memberId（游客为 null）+ 等级折扣
      const memberTok = verifyMemberToken(memberTokenFromRequest(req));
      const memberId = memberTok?.mid ? BigInt(memberTok.mid) : null;
      let levelDiscount = 0;
      if (memberId) {
        const m = await tx.member.findUnique({ where: { id: memberId } });
        if (m) {
          const lv = await tx.memberLevel.findUnique({ where: { key: m.level } }).catch(() => null);
          if (lv && lv.discount > 0) {
            levelDiscount = Math.round((amount * lv.discount) / 100);
            // 下单赠送积分：1 元 = 1 积分（仅登录会员）
            await tx.member.update({
              where: { id: memberId },
              data: { points: { increment: Math.floor(amount) } },
            });
          }
        }
      }
      // 优惠券：服务端权威校验（B2B 定向发券模式——输码即用，未登录也可用）
      let couponCode: string | null = null;
      let couponDiscount = 0;
      const rawCoupon = String((body as any).couponCode || "").trim();
      if (rawCoupon) {
        const cp = await tx.shopCoupon.findUnique({ where: { code: rawCoupon } });
        if (!cp || !cp.isActive) throw new Error("优惠券不存在或已停用");
        if (!couponInEffect(cp as any)) throw new Error("优惠券不在有效期内");
        if (cp.total > 0 && Number(cp.claimed) >= cp.total) throw new Error("该券已被领完");
        const d = calcCouponDiscount(cp as any, amount);
        if (d <= 0) throw new Error("未满足优惠券使用门槛");
        // 登录会员：优先核销已领未用 claim；无 claim 自动创建并核销（输码即用）
        if (memberId) {
          const usedCount = await tx.shopCouponClaim.count({ where: { couponId: cp.id, memberId, used: true } });
          if (cp.perUser > 0 && usedCount >= cp.perUser) throw new Error("已达该券每人使用上限");
          let claim = await tx.shopCouponClaim.findFirst({ where: { couponId: cp.id, memberId, used: false } });
          if (!claim) {
            claim = await tx.shopCouponClaim.create({ data: { couponId: cp.id, memberId, code: cp.code } });
          }
          await tx.shopCouponClaim.update({
            where: { id: claim.id },
            data: { used: true, usedAt: new Date(), orderNo },
          });
        } else {
          // 游客：直接创建核销记录（memberId 为空）并计数
          await tx.shopCouponClaim.create({ data: { couponId: cp.id, code: cp.code, used: true, usedAt: new Date(), orderNo } });
        }
        await tx.shopCoupon.update({ where: { id: cp.id }, data: { claimed: { increment: 1 } } });
        couponCode = cp.code;
        couponDiscount = d;
      }
      const discountAmount = levelDiscount + couponDiscount;
      const created = await tx.shopOrder.create({
        data: {
          orderNo,
          memberId,
          name: String(name).trim(),
          phone: String(phone).trim(),
          email: String(email).trim(),
          company: company ? String(company).trim() : null,
          address: address ? String(address).trim() : null,
          remark: remark ? String(remark).trim() : null,
          items: detailItems as unknown as object,
          amount,
          discountAmount,
          couponCode,
          currency: "CNY",
          status: "pending",
          payMethod: payMethod ? String(payMethod) : "contact",
          poNo: poNo ? String(poNo).trim() : null,
          invoiceTitle: invoiceTitle ? String(invoiceTitle).trim() : null,
          taxNo: taxNo ? String(taxNo).trim() : null,
          ipInfo: loc && loc.ip ? ({ ip: loc.ip, country: loc.country, city: loc.city } as object) : undefined,
        },
      });
      return { created, detailItems, amount, couponCode, discountAmount };
    });

    // 邮件通知（异步 fire-and-forget，不阻塞下单响应）
    const mailData = {
      orderNo,
      name: order.created.name,
      email: order.created.email,
      phone: order.created.phone,
      company: order.created.company,
      address: order.created.address,
      remark: order.created.remark,
      amount: order.amount,
      currency: order.created.currency,
      payMethod: order.created.payMethod,
      status: order.created.status,
      items: order.detailItems.map((x: any) => ({ name: x.name, qty: x.qty, price: x.price, unit: x.unit })),
      createdAt: order.created.createdAt,
    };
    sendOrderConfirmationMail(mailData).catch(() => {});
    // 销售分配：优先发负责销售的邮件；无销售用户时兜底发 info@（原逻辑）
    assignOrderSales(order.created.id).catch(() => {
      sendNewOrderNoticeMail(mailData).catch(() => {});
    });

    return NextResponse.json({
      ok: true,
      orderNo,
      amount: order.amount,
      discountAmount: order.discountAmount,
      payAmount: order.amount - order.discountAmount,
      couponCode: order.couponCode,
      itemsCount: order.detailItems.reduce((s: number, x: any) => s + x.qty, 0),
    });
  } catch (e: any) {
    const msg = e?.message || "未知错误";
    // 业务校验类错误（优惠券/库存/商品）返回 400；其余视为服务异常返回 500
    const biz = /优惠券|库存|不存在|已下架|已停用|有效|门槛|上限|领完|不足/.test(msg);
    return NextResponse.json({ ok: false, error: (biz ? "" : "提交失败：") + msg }, { status: biz ? 400 : 500 });
  }
}

// GET /api/public/shop/orders?orderNo=xxx — 按订单号查询
export async function GET(req: NextRequest) {
  const orderNo = new URL(req.url).searchParams.get("orderNo")?.trim();
  if (!orderNo) return NextResponse.json({ ok: false, error: "缺少订单号" }, { status: 400 });
  const o = await prisma.shopOrder.findUnique({ where: { orderNo } });
  if (!o) return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    order: {
      orderNo: o.orderNo,
      name: o.name,
      phone: o.phone,
      email: o.email,
      company: o.company,
      address: o.address,
      items: o.items,
      amount: Number(o.amount),
      discountAmount: Number(o.discountAmount),
      couponCode: o.couponCode,
      currency: o.currency,
      status: o.status,
      payMethod: o.payMethod,
      poNo: o.poNo,
      invoiceTitle: o.invoiceTitle,
      taxNo: o.taxNo,
      payStatus: o.payStatus,
      payVoucher: o.payVoucher,
      paidAt: o.paidAt,
      remark: o.remark,
      shippingCompany: o.shippingCompany,
      trackingNo: o.trackingNo,
      shippedAt: o.shippedAt,
      shippingStatus: o.shippingStatus,
      deliveredAt: o.deliveredAt,
      history: o.history,
      createdAt: o.createdAt,
    },
  });
}
