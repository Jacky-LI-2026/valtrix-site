import { NextResponse } from "next/server";
import { getBrandInfo } from '@/lib/server/brand';
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { getSmtpConfig, isSmtpConfigured as checkSmtp } from "@/lib/server/smtp-config";

export const runtime = "nodejs";

// 下载留资通知：资源/手册被下载时发邮件通知管理员（异步，失败静默）
async function notifyDownload(title: string, detail: string): Promise<void> {
  try {
    if (!(await checkSmtp())) return;
    const cfg = await getSmtpConfig();
    const brand = await getBrandInfo();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    let notifyTo = cfg.user;
    try {
      const nc = await prisma.siteConfig.findUnique({ where: { configKey: "notifyEmail" } });
      if (nc && typeof nc.configValue === "string" && nc.configValue.trim()) {
        notifyTo = nc.configValue.trim();
      } else if (process.env.ADMIN_NOTIFY_EMAIL) {
        notifyTo = process.env.ADMIN_NOTIFY_EMAIL;
      }
    } catch (e) {}
    await transporter.sendMail({
      from: `"${cfg.fromName || brand.name}" <${cfg.from || cfg.user}>`,
      to: notifyTo,
      subject: `【下载留资】${title}`,
      html: `<div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        <div style="background:#CC0000;padding:16px 24px;"><span style="color:#fff;font-size:15px;font-weight:bold;">${brand.name} — 下载留资通知</span></div>
        <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
          <p style="margin:0 0 10px;">管理员您好，网站有新的资料被下载（潜在客户留资）：</p>
          <p style="margin:0 0 6px;">资料：${title}</p>
          <p style="margin:0 0 12px;color:#666;">${detail}</p>
          <p style="margin:0;color:#999;font-size:12px;">时间：${new Date().toLocaleString("zh-CN")}　|　请在后台 /admin/download-leads 查看留资详情</p>
        </div>
      </div>`,
    });
  } catch (e) {
    // 通知失败不影响下载
  }
}

/**
 * POST /api/public/download-track
 * body: { type: "resource", id: number } | { type: "manual" }
 * 下载上报：资源下载 → resource_items.downloadCount + 1；产品手册下载 → site_config.manual_download_count + 1
 * 前端在下载门禁验证通过、真正触发下载时上报（fire-and-forget，失败不影响下载）
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = String(body.type || "");
  try {
    if (type === "resource") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ ok: false, message: "无效的资源 ID" }, { status: 400 });
      }
      const updated = await prisma.resourceItem.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
        select: { id: true, downloadCount: true, title: true },
      });
      // 异步发送下载留资通知
      notifyDownload(updated.title || `资源 #${id}`, "访客下载了该资料（可能为潜在客户），请及时跟进。");
      return NextResponse.json({ ok: true, downloadCount: updated.downloadCount });
    }

    if (type === "manual") {
      // SiteConfig.configValue 是 Json 字段，Prisma 不支持 increment，采用读改写
      const prev = await prisma.siteConfig.findUnique({
        where: { configKey: "manual_download_count" },
        select: { configValue: true },
      });
      const prevCount = Number(prev?.configValue ?? 0);
      const nextCount = (Number.isFinite(prevCount) ? prevCount : 0) + 1;
      await prisma.siteConfig.upsert({
        where: { configKey: "manual_download_count" },
        update: { configValue: nextCount, updatedAt: new Date() },
        create: {
          configKey: "manual_download_count",
          configValue: nextCount,
          remark: "产品手册总下载次数",
        },
        select: { configValue: true },
      });
      // 异步发送下载留资通知（产品手册）
      notifyDownload("产品手册下载", "访客下载了产品手册（可能为潜在客户），请及时跟进。");
      return NextResponse.json({ ok: true, downloadCount: nextCount });
    }

    return NextResponse.json({ ok: false, message: "未知的下载类型" }, { status: 400 });
  } catch (e) {
    // 上报失败不阻塞下载，静默返回
    return NextResponse.json({ ok: false, message: "上报失败" }, { status: 500 });
  }
}
