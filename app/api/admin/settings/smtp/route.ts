import { NextResponse } from "next/server";
import { getBrandInfo, brandLetterhead } from '@/lib/server/brand';
import nodemailer from "nodemailer";
import { getSmtpConfig, saveSmtpConfig, isSmtpConfigured } from "@/lib/server/smtp-config";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 脱敏：不返回密码明文，只标记是否已设置 */
function mask(config: Awaited<ReturnType<typeof getSmtpConfig>>) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    pass: config.pass ? "******" : "",
    from: config.from,
    fromName: config.fromName,
    configured: Boolean(config.host && config.user && config.pass),
  };
}

/**
 * GET /api/admin/settings/smtp — 读取当前 SMTP 配置（密码脱敏）
 * POST /api/admin/settings/smtp — 保存配置（pass 留空 = 保留原密码）
 * POST /api/admin/settings/smtp?action=test — 用当前配置发送一封测试邮件到指定邮箱
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const config = await getSmtpConfig();
  return NextResponse.json({ ok: true, config: mask(config) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  // 测试发信
  if (action === "test") {
    const to = String(body.to || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ ok: false, message: "请输入有效的测试收件邮箱" }, { status: 400 });
    }
    const cfg = await getSmtpConfig();
    const brand = await getBrandInfo();
    if (!cfg.host || !cfg.user || !cfg.pass) {
      return NextResponse.json(
        { ok: false, message: "SMTP 尚未配置完整（host/user/pass 必填），请先保存配置" },
        { status: 400 }
      );
    }
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    try {
      await transporter.sendMail({
        from: `"${cfg.fromName || brand.name}" <${cfg.from || cfg.user}>`,
        to,
        subject: `【${brand.name}】SMTP 配置测试邮件`,
        text: "这是一封测试邮件，说明 SMTP 配置正常，邮件服务可用。",
        html: `
          <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
            <div style="background:#CC0000;padding:18px 24px;">
              <span style="color:#fff;font-size:16px;font-weight:bold;">${brandLetterhead(brand)}</span>
            </div>
            <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
              <p style="margin:0 0 12px;">这是一封 SMTP 配置测试邮件。</p>
              <p style="margin:0 0 12px;color:#666;">如果收到此邮件，说明后台 SMTP 配置正确，验证码邮件可正常发送。</p>
              <p style="margin:0;color:#999;font-size:12px;">发送时间：${new Date().toLocaleString("zh-CN")}</p>
            </div>
          </div>
        `,
      });
      return NextResponse.json({ ok: true, message: "测试邮件发送成功，请查收" });
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, message: `测试邮件发送失败：${err?.message || "未知错误"}` },
        { status: 500 }
      );
    }
  }

  // 保存配置
  const saved = await saveSmtpConfig({
    host: body.host !== undefined ? String(body.host) : undefined,
    port: body.port !== undefined ? Number(body.port) : undefined,
    secure: body.secure !== undefined ? body.secure === true || body.secure === "true" : undefined,
    user: body.user !== undefined ? String(body.user) : undefined,
    pass: body.pass !== undefined ? String(body.pass) : undefined,
    from: body.from !== undefined ? String(body.from) : undefined,
    fromName: body.fromName !== undefined ? String(body.fromName) : undefined,
  });
  const configured = await isSmtpConfigured();
  return NextResponse.json({
    ok: true,
    message: "SMTP 配置已保存" + (configured ? "，邮件服务已启用" : "（配置不完整，仍为开发模式）"),
    config: mask(saved),
    configured,
  });
}
