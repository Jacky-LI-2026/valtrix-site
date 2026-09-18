import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recordOperation } from "@/lib/operation-log";
import { sendOrderStatusMail } from "@/lib/server/shop-mail";
import { assignOrderToSales } from "@/lib/server/sales-assign";
import { getSalesViewer } from "@/lib/server/sales-user";

export const dynamic = "force-dynamic";

const VALID_STATUS = ["pending", "confirmed", "completed", "cancelled"];

// PUT /api/admin/shop/orders/[id] — 状态流转（变更后邮件通知客户）+ 发货信息 + 收款确认 + 手动分配销售
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const id = BigInt(params.id);
    const body = await req.json();
    const o = await prisma.shopOrder.findUnique({ where: { id } });
    if (!o) return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });

    // 销售权限：非管理员销售仅可操作分配给自己的订单
    const viewer = await getSalesViewer(session?.user);
    if (viewer.isSales && !viewer.isAdmin && viewer.userId && String(o.salesUserId) !== String(viewer.userId)) {
      return NextResponse.json({ ok: false, error: "无权操作该订单（仅可处理分配给自己的订单）" }, { status: 403 });
    }

    // 管理员手动指派销售
    const action = String(body?.action || "");
    if (action === "assignSales") {
      if (!viewer.isAdmin) return NextResponse.json({ ok: false, error: "仅管理员可指派销售" }, { status: 403 });
      const salesUserId = BigInt(String(body?.salesUserId || ""));
      if (!salesUserId) return NextResponse.json({ ok: false, error: "缺少销售用户" }, { status: 400 });
      const ok = await assignOrderToSales(id, salesUserId);
      if (!ok) return NextResponse.json({ ok: false, error: "销售用户无效或未启用" }, { status: 400 });
      await recordOperation({ module: "shop:orders", action: "assignSales", target: `${o.orderNo} → 指派销售` });
      return NextResponse.json({ ok: true, status: o.status });
    }

    const status = String(body?.status || "");
    // 允许空 status（仅提交 payStatus/shippingMark/salesMark 等非状态操作时）
    if (status && !VALID_STATUS.includes(status)) return NextResponse.json({ ok: false, error: "非法状态" }, { status: 400 });

    // 组装更新数据：状态 + 发货信息（可同时提交）
    const data: any = {};
    if (status && o.status !== status) data.status = status;
    const shipCo = String(body?.shippingCompany || "").trim();
    const trackNo = String(body?.trackingNo || "").trim();
    // 确认到账：payStatus confirmed + paidAt
    const payStatus = String(body?.payStatus || "");
    if (["unpaid", "paid", "confirmed"].includes(payStatus) && o.payStatus !== payStatus) {
      data.payStatus = payStatus;
      if (payStatus === "confirmed") data.paidAt = o.paidAt || new Date();
      const hist: any[] = Array.isArray(o.history) ? o.history : [];
      hist.push({ status: "pay_" + payStatus, at: new Date().toISOString(), note: payStatus === "confirmed" ? "财务确认到账" : "支付状态更新" });
      data.history = hist;
    }

    if (body?.shippingCompany !== undefined || body?.trackingNo !== undefined) {
      data.shippingCompany = shipCo || null;
      data.trackingNo = trackNo || null;
      if (shipCo || trackNo) {
        data.shippedAt = o.shippedAt || new Date();
        if (o.shippingStatus !== "shipped") data.shippingStatus = "shipped";
        if (o.shippingStatus === "delivered" && (!shipCo || !trackNo)) {
          // 清空发货信息时回退状态
          data.shippingStatus = "not_shipped";
          data.deliveredAt = null;
        }
      }
    }
    // 标记已送达
    const shipMark = String(body?.shippingMark || "");
    if (shipMark === "delivered" && o.shippingStatus !== "delivered") {
      data.shippingStatus = "delivered";
      data.deliveredAt = new Date();
      const hist: any[] = Array.isArray(o.history) ? o.history : [];
      hist.push({ status: "shipped_delivered", at: new Date().toISOString(), note: "客户签收，订单完成" });
      data.history = hist;
    }

    // 销售标记已跟进（停止 2 小时轮转）
    const salesMark = String(body?.salesMark || "");
    if (salesMark === "responded" && !o.respondedAt) {
      data.respondedAt = new Date();
    }

    // 状态变更 → 视为销售已响应（停止轮转）
    if (status && o.status !== status && !o.respondedAt) {
      data.respondedAt = new Date();
    }

    // 操作历史：状态流转时追加一条
    const history: any[] = Array.isArray(o.history) ? o.history : [];
    if (status && o.status !== status) {
      history.push({ status, at: new Date().toISOString(), note: body?.note ? String(body.note) : "" });
      data.history = history;
    }

    // 无任何变化（状态相同且未提交发货信息）→ 直接返回
    if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, status: o.status });

    // 取消订单：回补库存（事务；仅当商品仍存在且 stock >= 0 时回补，-1 不限跳过）
    const updated = await prisma.$transaction(async (tx) => {
      if (status === "cancelled" && o.status !== "cancelled") {
        const items = Array.isArray(o.items) ? (o.items as any[]) : [];
        for (const it of items) {
          const slug = String(it.slug || "");
          if (!slug) continue;
          const qty = Math.max(0, Number(it.qty) || 0);
          if (qty === 0) continue;
          const prod = await tx.shopProduct.findFirst({ where: { slug } });
          if (prod && prod.stock !== null && Number(prod.stock) >= 0) {
            await tx.shopProduct.update({ where: { id: prod.id }, data: { stock: { increment: qty } } });
          }
        }
      }
      return tx.shopOrder.update({ where: { id }, data });
    });
    await recordOperation({ module: "shop:orders", action: "status", target: `${o.orderNo} → ${status}${shipCo || trackNo ? " + 发货信息" : ""}` });
    // 客户状态通知邮件（fire-and-forget；仅状态变化时发）
    if (status && o.status !== status) {
      try {
        const items = Array.isArray(o.items) ? (o.items as any[]) : [];
        await sendOrderStatusMail({
          orderNo: o.orderNo,
          name: o.name,
          email: o.email,
          phone: o.phone,
          company: o.company,
          address: o.address,
          remark: o.remark,
          amount: Number(o.amount),
          currency: o.currency,
          payMethod: o.payMethod || "contact",
          status,
          items: items.map((x: any) => ({ name: x.name || "", qty: x.qty || 1, price: x.price || 0, unit: x.unit })),
        });
      } catch {
        /* 邮件失败不影响状态流转 */
      }
    }
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "更新失败：" + (e?.message || "") }, { status: 500 });
  }
}
