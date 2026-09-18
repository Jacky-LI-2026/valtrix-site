import { NextRequest, NextResponse } from "next/server";
import { getBrandInfo } from '@/lib/server/brand';
import { getClientIp as rlIp, checkRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { getClientIp, getLocationFields } from '@/lib/geo'
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/server/smtp-config";

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function sanitize(v: string, max: number) {
  return String(v || "").replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").substring(0, max).trim();
}

async function genBookingNo(): Promise<string> {
  const prefix = "VT" + new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await prisma.visitBooking.count({ where: { createdAt: { gte: today } } });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function notifyAdmin(b: any) {
  const cfg = await getSmtpConfig();
  const brand = await getBrandInfo();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    console.log("[考察预约] 未配置 SMTP，跳过邮件通知");
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    const from = cfg.from || cfg.user;
    const fromName = cfg.fromName || brand.name;
    let notifyTo = cfg.user;
    try {
      const nc = await prisma.siteConfig.findUnique({ where: { configKey: "notifyEmail" } });
      if (nc && typeof nc.configValue === "string" && nc.configValue.trim()) notifyTo = nc.configValue.trim();
    } catch {}
    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: notifyTo,
      subject: `【考察预约】${b.name} - ${b.company || "未填写公司"}`,
      html: `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:18px 24px;"><span style="color:#fff;font-size:16px;font-weight:bold;">${brand.name} — 考察预约通知</span></div>
          <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;width:90px;">预约编号</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${b.bookingNo}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">姓名</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${b.name}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">公司</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${b.company || "-"}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">电话</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${b.phone}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">邮箱</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${b.email || "-"}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">预约日期</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${b.preferredDate ? new Date(b.preferredDate).toLocaleDateString("zh-CN") : "-"}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">时段</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${b.visitTime || "-"}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">人数</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${b.visitors} 人</td></tr>
              <tr><td style="padding:6px 8px;color:#888;vertical-align:top;">备注</td><td style="padding:6px 8px;">${(b.message || "-").replace(/\n/g, "<br>")}</td></tr>
            </table>
            <p style="margin:20px 0 0;color:#999;font-size:12px;">提交时间：${new Date().toLocaleString("zh-CN")}　|　请登录后台 /admin/visit-bookings 处理</p>
          </div>
        </div>
      `,
    });
    console.log("[考察预约] 管理员通知邮件已发送");
  } catch (err) {
    console.error("[考察预约] 通知邮件发送失败:", err);
  }
}

// 公开提交考察预约
export async function POST(req: NextRequest) {
  const rlIpAddr = rlIp(req);
  const rl = checkRateLimit("visit_booking", rlIpAddr, 5, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  try {
    const body = await req.json();
    const name = sanitize(body.name, 100);
    const phone = sanitize(body.phone, 50);
    const company = sanitize(body.company, 200);
    const email = sanitize(body.email, 100);
    const visitTime = sanitize(body.visitTime, 50);
    const message = sanitize(body.message, 2000);
    const visitorKey = sanitize(body.visitorKey, 64);
    const sourcePage = sanitize(body.sourcePage, 200);

    if (!name || !phone) {
      return NextResponse.json({ error: "请填写姓名和联系电话" }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    const preferredDate = body.preferredDate ? new Date(body.preferredDate) : null;
    const visitors = Math.max(1, Math.min(100, Number(body.visitors) || 1));

    const bookingNo = await genBookingNo();
    const _loc = getLocationFields(getClientIp(req.headers));
    const booking = await prisma.visitBooking.create({
      data: {
        bookingNo, name, phone, company: company || null, email: email || null,
        preferredDate, visitTime: visitTime || null, visitors, message: message || null,
        visitorKey: visitorKey || null, sourcePage: sourcePage || null, status: "pending",
        ip: _loc.ip,
        country: _loc.country,
        city: _loc.city,      },
    });
    notifyAdmin(booking).catch(() => {});
    // EDM 订阅者自动收集（考察预约邮箱）
    try {
      const { ensureEmailSubscriber } = await import("@/lib/email-subscriber");
      await ensureEmailSubscriber(email, "考察预约", "visit-booking:考察预约", name);
    } catch { /* 静默 */ }
    return NextResponse.json(serializeBigInt(booking));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
