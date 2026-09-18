import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/admin/notifications?limit=N - 聚合真实业务数据生成通知中心列表
// 每条通知带 link，点击可直达对应事件页面
// limit 默认 8（顶部铃铛精简版）；历史页传大 limit（如 100）获取全量明细
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const limitParam = Number(req.nextUrl.searchParams.get("limit") || 8);
    const detailed = limitParam > 8;
    const now = new Date();
    const notifications: any[] = [];

    // ============ 1. 客户留言 ============
    const newMessages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: detailed ? 15 : 1,
    });
    const newCount = newMessages.filter((m) => m.status === "new").length;
    if (newMessages.length > 0) {
      if (!detailed) {
        // 精简模式：取最新一条（优先未处理），id 与详细模式一致以便已读联动
        const latestNew = newMessages.find((m) => m.status === "new") || newMessages[0];
        const isNew = latestNew.status === "new";
        notifications.push({
          id: `msg-${latestNew.id}`,
          type: "message",
          title: isNew ? "新客户留言" : "客户留言",
          content: `${latestNew.name}${latestNew.company ? "（" + latestNew.company + "）" : ""}：${(latestNew.message || "").slice(0, 60)}`,
          time: formatRelative(latestNew.createdAt, now),
          read: !isNew,
          link: "/admin/leads",
        });
      } else {
        newMessages.forEach((m) => {
          const isNew = m.status === "new";
          notifications.push({
            id: `msg-${m.id}`,
            type: "message",
            title: isNew ? "新客户留言" : "客户留言",
            content: `${m.name}${m.company ? "（" + m.company + "）" : ""}：${(m.message || "").slice(0, 60)}`,
            time: formatRelative(m.createdAt, now),
            read: !isNew,
            link: "/admin/leads",
          });
        });
      }
    }

    // ============ 2. 自动采集任务 ============
    const tasks = await prisma.autoCollectionTask.findMany({
      orderBy: { lastRunAt: "desc" },
      take: 5,
    });
    tasks.forEach((t) => {
      if (!t.lastRunAt) return;
      const ok = t.lastStatus === "success";
      notifications.push({
        id: `task-${t.id}`,
        type: "collection",
        title: ok ? "采集任务完成" : "采集任务异常",
        content: `「${t.name}」${ok ? "运行成功" : "运行失败（" + (t.lastStatus || "unknown") + "）"}`,
        time: formatRelative(t.lastRunAt, now),
        read: true,
        link: "/admin/collection",
      });
    });
    if (tasks.length === 0) {
      const taskCount = await prisma.autoCollectionTask.count({ where: { enabled: true } });
      if (taskCount > 0) {
        notifications.push({
          id: `task-idle-${now.getTime()}`,
          type: "collection",
          title: "采集任务待运行",
          content: `有 ${taskCount} 个自动采集任务已启用，等待首次运行`,
          time: "今天",
          read: true,
          link: "/admin/auto-collection-tasks",
        });
      }
    }

    // ============ 3. 采集日志 ============
    const logs = await prisma.collectionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: detailed ? 15 : 1,
    });
    logs.forEach((log) => {
      const failed = log.status === "failed";
      notifications.push({
        id: `log-${log.id}`,
        type: "collection",
        title: failed ? "采集执行失败" : "采集记录",
        content: failed
          ? `「${log.sourceName}」采集失败：${(log.error || log.message || "未知错误").slice(0, 60)}`
          : `「${log.sourceName}」成功采集 ${log.collected} 条内容`,
        time: formatRelative(log.createdAt, now),
        read: !failed,
        link: "/admin/collection",
      });
    });

    // ============ 4. 系统版本 ============
    const versions = await prisma.systemVersion.findMany({
      orderBy: { createdAt: "desc" },
      take: detailed ? 5 : 1,
    });
    versions.forEach((v) => {
      notifications.push({
        id: `ver-${v.id}`,
        type: "system",
        title: v.isCurrent ? "系统版本（当前）" : "系统版本",
        content: `v${v.version} · ${v.environment === "production" ? "生产环境" : v.environment}${v.isCurrent ? "（运行中）" : ""}`,
        time: formatRelative(v.createdAt, now),
        read: true,
        link: "/admin/system-update",
      });
    });

    // ============ 5. 商城订单待跟进 ============
    const followOrders = await prisma.shopOrder.findMany({
      where: { respondedAt: null, status: { notIn: ["cancelled", "completed"] } },
      orderBy: { createdAt: "desc" },
      take: detailed ? 15 : 1,
      include: { salesUser: { select: { displayName: true, username: true } } },
    });
    followOrders.forEach((fo: any) => {
      const overdue = fo.escalationCount && Number(fo.escalationCount) > 0;
      const salesName = fo.salesUser?.displayName || fo.salesUser?.username || "";
      const unassigned = !fo.salesUser;
      notifications.push({
        id: `shop-${fo.id}`,
        type: "shop",
        title: unassigned ? "商城订单待人工分配" : overdue ? "商城订单跟进超时" : "商城新订单待跟进",
        content: `${fo.orderNo} · ${fo.name}${fo.company ? "（" + fo.company + "）" : ""} · ¥${Number(fo.amount).toLocaleString()}${unassigned ? " · 无销售绑定该订单产品" : salesName ? " · 负责：" + salesName : ""}${overdue ? ` · 已轮转 ${fo.escalationCount} 次` : ""}`,
        time: formatRelative(fo.createdAt, now),
        read: false,
        link: "/admin/shop/orders",
      });
    });

    // ============ 6. 操作日志 ============
    const ops = await prisma.operationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: detailed ? 15 : 1,
    });
    ops.forEach((op) => {
      notifications.push({
        id: `op-${op.id}`,
        type: "system",
        title: "操作记录",
        content: `${op.username || "系统"} · ${op.action}${op.target ? " " + String(op.target).slice(0, 50) : ""}${op.module ? "（" + op.module + "）" : ""}`,
        time: formatRelative(op.createdAt, now),
        read: true,
        link: "/admin/logs",
      });
    });

    // 按时间倒序排序（有 time 相对时间，用原始时间排序需记录 ts，这里用 id 倒序近似）
    const sorted = notifications;
    return NextResponse.json(sorted.slice(0, limitParam));
  } catch (e) {
    console.error("获取通知失败:", e);
    return NextResponse.json([], { status: 500 });
  }
}

// 相对时间格式化
function formatRelative(date: Date, now: Date): string {
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 172800) return "昨天";
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  const d = new Date(date);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
