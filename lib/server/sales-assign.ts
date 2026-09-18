/**
 * 商城订单销售跟进与 2 小时轮转（服务端专用）
 *
 * 机制（含"销售绑定产品"权限模型）：
 * 1. 销售用户在后台绑定一个或多个商城产品（User.salesProducts 多对多）。
 * 2. 新订单创建后自动分配：从**绑定了订单内任一产品**的启用销售中，
 *    选择"当前未响应订单数最少 + 轮转顺序优先"者，写入 ShopOrder.salesUserId/assignedAt，
 *    并发邮件通知该销售。
 * 3. 无任何销售绑定订单产品 → 不分配（salesUserId=null），通知中心聚合"待人工分配"，
 *    管理员可在订单详情手动指派销售。
 * 4. 2 小时未回应（respondedAt 为空且订单未完成/未取消）→ 轮转到**绑定同一订单产品**的
 *    下一个销售（salesOrder asc, id asc，队尾回队首；仅一名绑定销售则保持本人并再次邮件提醒）。
 * 5. 响应判定：销售在后台订单详情处理订单（确认/收款/发货）或状态流转即视为已响应；
 *    另有 salesMark:'responded' 显式标记。
 * 6. 非管理员销售仅可见/可操作分配给自己的订单（由订单 API 按 salesUserId 过滤）。
 */
import { prisma } from "@/lib/prisma";
import { sendNewOrderNoticeMail, sendOrderEscalationMail } from "./shop-mail";
import { orderProductIds } from "./sales-user";

/** 获取启用的销售用户（按轮转顺序） */
export async function getSalesUsers() {
  return prisma.user.findMany({
    where: { isSales: true, status: "active" },
    orderBy: [{ salesOrder: "asc" }, { id: "asc" }],
    select: { id: true, username: true, displayName: true, email: true, salesOrder: true },
  });
}

/** 获取绑定了指定产品（任一）的启用销售 */
export async function getSalesUsersForProducts(productIds: bigint[]) {
  if (productIds.length === 0) return [];
  return prisma.user.findMany({
    where: { isSales: true, status: "active", salesProducts: { some: { id: { in: productIds } } } },
    orderBy: [{ salesOrder: "asc" }, { id: "asc" }],
    select: { id: true, username: true, displayName: true, email: true, salesOrder: true },
  });
}

/** 轮转选人：未响应订单数最少者优先，同数按 salesOrder（数组已排序） */
export async function pickSalesUser(sales: Awaited<ReturnType<typeof getSalesUsers>>, tx?: any) {
  if (!sales || sales.length === 0) return null;
  const db = tx || prisma;
  const rows: { salesUserId: string; c: bigint }[] = await db.shopOrder.findMany({
    where: {
      salesUserId: { in: sales.map((s) => s.id) },
      respondedAt: null,
      status: { notIn: ["cancelled", "completed"] },
    },
    select: { salesUserId: true },
  });
  const countMap = new Map<string, number>();
  for (const r of rows) {
    const k = String(r.salesUserId);
    countMap.set(k, (countMap.get(k) || 0) + 1);
  }
  let best: any = null;
  let bestCount = Number.MAX_SAFE_INTEGER;
  for (const s of sales) {
    const c = countMap.get(String(s.id)) || 0;
    if (c < bestCount) {
      bestCount = c;
      best = s;
    }
  }
  return best;
}

/** 取某个销售之后的"下一个"（按数组顺序；到尾回到队首） */
export function nextSalesAfter(sales: Awaited<ReturnType<typeof getSalesUsers>>, currentUserId: string | bigint | null | undefined) {
  if (!sales || sales.length === 0) return null;
  const cur = String(currentUserId);
  const idx = sales.findIndex((s) => String(s.id) === cur);
  if (idx < 0) return sales[0];
  return sales[(idx + 1) % sales.length];
}

/** 超时时长（毫秒），site_config.shop_escalation_hours 可配（默认 2 小时） */
export async function getEscalationMs(): Promise<number> {
  try {
    const cfg = await prisma.siteConfig.findUnique({ where: { configKey: "shop_escalation_hours" } });
    const h = Number(cfg?.configValue ?? 2);
    return (Number.isFinite(h) && h > 0 ? h : 2) * 60 * 60 * 1000;
  } catch {
    return 2 * 60 * 60 * 1000;
  }
}

function orderMailData(o: any) {
  const items = Array.isArray(o.items) ? (o.items as any[]) : [];
  return {
    orderNo: o.orderNo,
    name: o.name,
    email: o.email,
    phone: o.phone,
    company: o.company,
    address: o.address,
    remark: o.remark,
    amount: Number(o.amount),
    currency: o.currency || "CNY",
    payMethod: o.payMethod || "contact",
    status: o.status || "pending",
    createdAt: o.createdAt,
    items: items.map((x: any) => ({ name: x.name || "", qty: x.qty || 1, price: x.price || 0, unit: x.unit })),
  };
}

/**
 * 新订单分配销售（在订单创建后调用；fire-and-forget 邮件）
 * 返回 { sales, emailSent, fallback, noBinding }
 * - noBinding=true：无销售绑定订单产品（未分配，等待人工指派）
 */
export async function assignOrderSales(orderId: bigint): Promise<{ sales: any; emailSent: boolean; fallback: boolean; noBinding: boolean }> {
  try {
    const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
    if (!order || order.salesUserId) return { sales: null, emailSent: false, fallback: false, noBinding: false };

    const productIds = orderProductIds(order.items);
    const sales = await getSalesUsersForProducts(productIds);
    if (!sales || sales.length === 0) {
      // 无销售绑定该订单产品：不分配，兜底发 info@，通知中心聚合"待人工分配"
      if (productIds.length > 0) {
        try {
          await sendNewOrderNoticeMail(orderMailData(order), undefined);
        } catch { /* 邮件失败不阻断 */ }
      }
      return { sales: null, emailSent: false, fallback: true, noBinding: true };
    }

    const picked = await pickSalesUser(sales);
    if (!picked) {
      try {
        await sendNewOrderNoticeMail(orderMailData(order), undefined);
      } catch { /* 忽略 */ }
      return { sales: null, emailSent: false, fallback: true, noBinding: false };
    }

    await prisma.shopOrder.update({
      where: { id: orderId },
      data: { salesUserId: picked.id, assignedAt: new Date() },
    });

    let emailSent = false;
    try {
      emailSent = await sendNewOrderNoticeMail(orderMailData(order), picked.email || undefined);
    } catch { /* 忽略 */ }
    return { sales: picked, emailSent, fallback: false, noBinding: false };
  } catch (e: any) {
    console.error("[SalesAssign] 分配失败:", e?.message || e);
    return { sales: null, emailSent: false, fallback: false, noBinding: false };
  }
}

/** 管理员手动指派销售（仅管理员调用；重置轮转计时） */
export async function assignOrderToSales(orderId: bigint, salesUserId: bigint): Promise<boolean> {
  const o = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!o) return false;
  const sales = await prisma.user.findFirst({ where: { id: salesUserId, isSales: true, status: "active" } });
  if (!sales) return false;
  await prisma.shopOrder.update({
    where: { id: orderId },
    data: { salesUserId, assignedAt: new Date(), respondedAt: null, escalationCount: 0 },
  });
  return true;
}

/** 销售标记已跟进 */
export async function markOrderResponded(orderId: bigint, note?: string) {
  const o = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!o) return false;
  if (o.respondedAt) return true;
  await prisma.shopOrder.update({
    where: { id: orderId },
    data: {
      respondedAt: new Date(),
      history: Array.isArray(o.history) ? [...(o.history as any[]), { status: o.status, at: new Date().toISOString(), note: note || "销售标记已跟进" }] : [{ status: o.status, at: new Date().toISOString(), note: note || "销售标记已跟进" }],
    },
  });
  return true;
}

/** 轮转扫描：2 小时未响应 → 转给下一个绑定同一订单产品的销售（scheduler 每 5 分钟调用） */
export async function escalateOverdueOrders(): Promise<number> {
  const timeoutMs = await getEscalationMs();
  const deadline = new Date(Date.now() - timeoutMs);

  const overdue = await prisma.shopOrder.findMany({
    where: {
      salesUserId: { not: null },
      respondedAt: null,
      assignedAt: { lt: deadline },
      status: { notIn: ["cancelled", "completed"] },
    },
  });

  let escalated = 0;
  for (const o of overdue) {
    const productIds = orderProductIds(o.items);
    const bound = await getSalesUsersForProducts(productIds);
    if (bound.length === 0) continue; // 产品已被全部解绑：保留原销售，不转
    const next = nextSalesAfter(bound, o.salesUserId);
    if (!next) continue;
    const samePerson = String(next.id) === String(o.salesUserId);
    try {
      await prisma.shopOrder.update({
        where: { id: o.id },
        data: {
          salesUserId: next.id,
          assignedAt: new Date(),
          escalationCount: { increment: 1 },
          history: Array.isArray(o.history)
            ? [...(o.history as any[]), { status: o.status, at: new Date().toISOString(), note: `跟进超时（${Math.round(timeoutMs / 3600000)}h），${samePerson ? "再次提醒本人" : "转给 " + (next.displayName || next.username)}` }]
            : [{ status: o.status, at: new Date().toISOString(), note: `跟进超时（${Math.round(timeoutMs / 3600000)}h），${samePerson ? "再次提醒本人" : "转给 " + (next.displayName || next.username)}` }],
        },
      });
      escalated++;
      try {
        await sendOrderEscalationMail(orderMailData(o), next.email || undefined, (Number(o.escalationCount) || 0) + 1);
      } catch { /* 忽略 */ }
      console.log(`[SalesAssign] 订单 ${o.orderNo} 跟进超时，${samePerson ? "再次提醒" : "轮转 → " + (next.displayName || next.username)}（第 ${Number(o.escalationCount) + 1} 次）`);
    } catch (e: any) {
      console.error(`[SalesAssign] 轮转失败 ${o.orderNo}:`, e?.message || e);
    }
  }
  return escalated;
}
