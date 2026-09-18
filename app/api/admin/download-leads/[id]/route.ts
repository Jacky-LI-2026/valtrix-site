import { NextResponse } from "next/server";
import { getSiteBaseUrl } from "@/lib/site-url";
import { getBrandInfo, brandLetterhead } from '@/lib/server/brand';
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { getSmtpConfig, isSmtpConfigured } from "@/lib/server/smtp-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 审核通过后，将下载链接发送到申请人邮箱（SMTP 已配置时） */
async function sendApprovalMail(
  email: string,
  name: string,
  resourceName: string,
  downloadUrl: string,
  host: string
): Promise<boolean> {
  try {
    if (!(await isSmtpConfigured())) return false;
    const cfg = await getSmtpConfig();
    const brand = await getBrandInfo();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    const from = cfg.from || cfg.user;
    const fromName = cfg.fromName || brand.name;
    const base = host && !host.includes("localhost") ? host : getSiteBaseUrl();
    const link = /^https?:\/\//i.test(downloadUrl)
      ? downloadUrl
      : `http://${base}${downloadUrl.startsWith("/") ? downloadUrl : "/" + downloadUrl}`;
    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: email,
      subject: `【${brand.name}】您的资料下载申请已通过`,
      html: `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:20px 24px;">
            <span style="color:#fff;font-size:18px;font-weight:bold;">${brandLetterhead(brand)}</span>
          </div>
          <div style="padding:28px 24px;color:#333;">
            <p style="margin:0 0 16px;">${name || "您好"}，您申请的资料已通过审核，可以下载了！</p>
            <p style="margin:0 0 8px;">资料名称：<b>${resourceName}</b></p>
            <p style="margin:0 0 16px;">点击以下链接下载：</p>
            <div style="text-align:center;margin:20px 0;">
              <a href="${link}" style="display:inline-block;background:#CC0000;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">立即下载</a>
            </div>
            <p style="margin:0 0 16px;font-size:12px;color:#999;word-break:break-all;">如按钮无法点击，请复制以下链接到浏览器打开：<br/>${link}</p>
            <p style="margin:0;color:#999;font-size:12px;">此邮件由系统自动发送，请勿直接回复。</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[下载审核] 通过通知邮件发送失败：", (err as Error).message);
    return false;
  }
}

/**
 * PATCH /api/admin/download-leads/[id]
 * body: { action: "approve" | "reject", remark?: string }
 * 后台确认/拒绝下载留资：确认后该留资对应的下载开放给申请人，
 * 并将下载链接发送到申请人邮箱（SMTP 已配置时）。
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  const id = BigInt(params.id || "0");
  if (!id) {
    return NextResponse.json({ ok: false, message: "无效 ID" }, { status: 400 });
  }

  const action = String(body.action || "");
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ ok: false, message: "action 必须为 approve 或 reject" }, { status: 400 });
  }
  const remark = String(body.remark || "").trim();

  try {
    const lead = await prisma.downloadLead.update({
      where: { id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        remark: remark || null,
        reviewedAt: new Date(),
      },
    });
    // 通过审核且有下载链接 → 邮件发送下载链接（失败不影响审核结果）
    if (action === "approve" && lead.downloadUrl) {
      const host = req.headers.get("host") || "";
      await sendApprovalMail(
        lead.email,
        lead.name || "",
        lead.resourceName || "",
        lead.downloadUrl,
        host
      );
    }
    return NextResponse.json({ ok: true, status: lead.status });
  } catch (e) {
    console.error("更新下载留资状态失败:", (e as Error).message);
    return NextResponse.json({ ok: false, message: "更新失败" }, { status: 500 });
  }
}
