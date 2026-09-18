import { NextRequest, NextResponse } from "next/server";
import { getBrandInfo } from '@/lib/server/brand';
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/server/smtp-config";
import { encodeEmailToken, decodeEmailToken } from "@/lib/email-token";
import { recordOperation } from "@/lib/operation-log";
import { auth } from "@/auth";
import { siteUrl } from "@/lib/site-url";

// 后台 EDM 订阅管理
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "all";
  const group = sp.get("group") || "";
  try {
    const where: any = {};
    if (status !== "all") where.status = status;
    if (group) where.group = group;
    const [items, total, activeCount, unsubCount, groupRows, campaigns] = await Promise.all([
      prisma.emailSubscriber.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.emailSubscriber.count(),
      prisma.emailSubscriber.count({ where: { status: "active" } }),
      prisma.emailSubscriber.count({ where: { status: "unsubscribed" } }),
      prisma.emailSubscriber.groupBy({ by: ["group"], where: { group: { not: null } }, _count: { _all: true } }),
      prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    // 分组汇总（含各分组的活跃数）
    const activeByGroup = await prisma.emailSubscriber.groupBy({
      by: ["group"],
      where: { group: { not: null }, status: "active" },
      _count: { _all: true },
    });
    const activeMap: Record<string, number> = {};
    activeByGroup.forEach((r) => {
      if (r.group) activeMap[r.group] = r._count._all;
    });
    const groups = groupRows
      .map((r) => ({
        group: r.group || "",
        total: r._count._all,
        active: activeMap[r.group || ""] || 0,
      }))
      .sort((a, b) => b.total - a.total);
    return NextResponse.json(
      serializeBigInt({ items, stats: { total, active: activeCount, unsubscribed: unsubCount }, groups, campaigns })
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 群发邮件（可选按分组/状态筛选收件人）
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { subject, content, status, group, testEmail } = body;
    if (!subject || !content) return NextResponse.json({ error: "主题和内容不能为空" }, { status: 400 });

    const cfg = await getSmtpConfig();
    if (!cfg.host || !cfg.user || !cfg.pass) {
      return NextResponse.json({ error: "SMTP 未配置，请先在「站点设置 → SMTP 邮件」填写" }, { status: 400 });
    }

    // 测试发送：只发给 testEmail
    if (testEmail) {
      await sendOne(cfg, subject, content, testEmail);
      return NextResponse.json({ success: true, sent: 1, mode: "test" });
    }

    const where: any = { status: status || "active" };
    if (group) where.group = group;
    const subs = await prisma.emailSubscriber.findMany({ where, select: { email: true } });
    if (!subs.length) return NextResponse.json({ error: "没有符合条件的收件人" }, { status: 400 });

    let sent = 0;
    let failed = 0;
    for (const s of subs) {
      try {
        await sendOne(cfg, subject, content, s.email);
        sent++;
      } catch {
        failed++;
      }
      // 节流，避免触发 SMTP 限制
      await new Promise((r) => setTimeout(r, 300));
    }

    // 群发历史记录
    try {
      await prisma.emailCampaign.create({
        data: {
          subject: String(subject).slice(0, 200),
          content: String(content),
          group: group || null,
          targetCount: subs.length,
          sentCount: sent,
          failedCount: failed,
          status: failed > 0 && sent === 0 ? "failed" : "completed",
        },
      });
    } catch { /* 记录失败不影响主流程 */ }

    await recordOperation({ module: "email-marketing", action: "send", target: subject });
  return NextResponse.json({ success: true, sent, failed, total: subs.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 订阅者分组 / 名称编辑
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, group, name } = body;
    if (!id) return NextResponse.json({ error: "缺少订阅者 id" }, { status: 400 });
    const data: any = {};
    if (group !== undefined) data.group = group || null;
    if (name !== undefined) data.name = name || null;
    const item = await prisma.emailSubscriber.update({
      where: { id: Number(id) },
      data,
    });
    await recordOperation({ module: "email-marketing", action: "update", target: String(id) });
  return NextResponse.json(serializeBigInt(item));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 退订（后台操作或通过退订链接）
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  const token = sp.get("token");
  try {
    if (token) {
      const email = decodeEmailToken(token);
      if (!email) return NextResponse.json({ error: "无效的退订链接" }, { status: 400 });
      await prisma.emailSubscriber.updateMany({
        where: { email },
        data: { status: "unsubscribed", unsubscribedAt: new Date() },
      });
      await recordOperation({ module: "email-marketing", action: "delete", target: String(id) });
      return NextResponse.json({ success: true });
    }
    if (id) {
      await prisma.emailSubscriber.delete({ where: { id: Number(id) } });
      await recordOperation({ module: "email-marketing", action: "delete", target: String(id) });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function sendOne(cfg: any, subject: string, content: string, to: string) {
  const brand = await getBrandInfo();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  const from = cfg.from || cfg.user;
  const fromName = cfg.fromName || brand.name;
  const token = Buffer.from(to).toString("base64url");
  const unsubLink = `${siteUrl("/unsubscribe")}?token=${token}`;
  await transporter.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject,
    html: `
      <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        <div style="background:#CC0000;padding:18px 24px;">
          <span style="color:#fff;font-size:16px;font-weight:bold;">${fromName}</span>
        </div>
        <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
          ${content.replace(/\n/g, "<br>")}
        </div>
        <div style="padding:16px 24px;background:#f8f8f8;color:#999;font-size:12px;">
          <p style="margin:0 0 6px;">您收到此邮件是因为订阅了 ${fromName} 资讯。</p>
          <a href="${unsubLink}" style="color:#CC0000;text-decoration:none;">点击退订</a>
        </div>
      </div>
    `,
  });
}
