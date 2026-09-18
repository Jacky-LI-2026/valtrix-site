/**
 * 价格查看邮箱验证（服务端）
 * - emailVerify 模式：验证通过后由前端 session 标记，显示价格
 * - emailQuote 模式：验证通过后把报价明细发送到邮箱
 *
 * 与下载验证（lib/server/verification.ts）独立，避免验证码相互覆盖
 */

import nodemailer from "nodemailer";
import { getBrandInfo, brandLetterhead, brandSubjectPrefix } from '@/lib/server/brand';
import fs from "fs";
import path from "path";
import { getSmtpConfig, isSmtpConfigured } from "./smtp-config";

export const runtime = "nodejs";

interface CodeEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const CODE_TTL_MS = 10 * 60 * 1000; // 10 分钟有效
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 秒冷却
const MAX_ATTEMPTS = 5;

const CODE_FILE = path.join(process.cwd(), "data", "price-codes.json");
const codeStore = new Map<string, CodeEntry>();

function loadStore(): void {
  try {
    const raw = fs.readFileSync(CODE_FILE, "utf8");
    const obj = JSON.parse(raw) as Record<string, CodeEntry>;
    for (const [k, v] of Object.entries(obj)) codeStore.set(k, v);
  } catch {
    // 文件不存在或损坏：空存储
  }
}
function persistStore(): void {
  try {
    fs.mkdirSync(path.dirname(CODE_FILE), { recursive: true });
    fs.writeFileSync(CODE_FILE, JSON.stringify(Object.fromEntries(codeStore.entries())));
  } catch {
    // 写入失败不影响主流程
  }
}
loadStore();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function cleanupExpired(): void {
  const now = Date.now();
  codeStore.forEach((entry, email) => {
    if (entry.expiresAt < now) codeStore.delete(email);
  });
  persistStore();
}

/** 发送价格查看验证码邮件；未配置 SMTP 返回 devMode（验证码回传前端） */
export async function requestPriceCode(email: string): Promise<{
  ok: boolean;
  code?: string;
  devMode?: boolean;
  message: string;
}> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "邮箱格式不正确" };
  }
  const now = Date.now();
  cleanupExpired();

  const existing = codeStore.get(email);
  if (existing && existing.expiresAt > now && now - (existing.expiresAt - CODE_TTL_MS) < RESEND_COOLDOWN_MS) {
    return { ok: false, message: "发送过于频繁，请 60 秒后再试" };
  }

  const code = generateCode();
  codeStore.set(email, { code, expiresAt: now + CODE_TTL_MS, attempts: 0 });
  persistStore();

  if (!(await isSmtpConfigured())) {
    // 开发模式：验证码打印控制台并回传（本地联调用）
    // eslint-disable-next-line no-console
    console.log(`[价格验证] 开发模式（未配置 SMTP）：${email} 的验证码为 ${code}（10 分钟内有效）`);
    return { ok: true, code, devMode: true, message: "开发模式，验证码已生成" };
  }

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

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: email,
      subject: `${brandSubjectPrefix(brand)}价格查看验证码`,
      html: `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:20px 24px;">
            <span style="color:#fff;font-size:18px;font-weight:bold;">${brandLetterhead(brand)}</span>
          </div>
          <div style="padding:28px 24px;color:#333;">
            <p style="margin:0 0 16px;">您好，您正在进行产品价格查看验证，本次验证码为：</p>
            <div style="text-align:center;margin:20px 0;">
              <span style="display:inline-block;font-size:30px;font-weight:bold;letter-spacing:6px;color:#CC0000;background:#FFF5F5;padding:12px 24px;border-radius:6px;">${code}</span>
            </div>
            <p style="margin:0 0 16px;">验证码 <b>10 分钟</b>内有效，请勿向他人泄露。</p>
          </div>
        </div>`,
    });
    return { ok: true, message: "验证码已发送" };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[价格验证] 邮件发送失败:", (e as Error).message);
    codeStore.delete(email);
    persistStore();
    return { ok: false, message: "验证码邮件发送失败，请稍后重试" };
  }
}

/** 校验验证码（只验证，不写任何留资记录） */
export async function verifyPriceCode(email: string, code: string): Promise<{ ok: boolean; message: string }> {
  cleanupExpired();
  const entry = codeStore.get(email);
  if (!entry) return { ok: false, message: "验证码不存在或已过期，请重新获取" };
  if (entry.expiresAt < Date.now()) {
    codeStore.delete(email);
    persistStore();
    return { ok: false, message: "验证码已过期，请重新获取" };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    codeStore.delete(email);
    persistStore();
    return { ok: false, message: "尝试次数过多，请重新获取验证码" };
  }
  if (entry.code !== code.trim()) {
    entry.attempts += 1;
    return { ok: false, message: "验证码错误" };
  }
  codeStore.delete(email);
  persistStore();
  return { ok: true, message: "验证通过" };
}

/** 发送报价单邮件（emailQuote 模式验证通过后调用） */
export async function sendQuoteEmail(payload: {
  email: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; message: string; devMode?: boolean }> {
  if (!(await isSmtpConfigured())) {
    // 开发模式：报价内容打印控制台
    // eslint-disable-next-line no-console
    console.log(`[报价邮件] 开发模式（未配置 SMTP），收件人 ${payload.email}\n${payload.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500)}`);
    return { ok: true, devMode: true, message: "开发模式：报价内容已打印到服务器日志" };
  }
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
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: payload.email,
      subject: payload.subject,
      html: payload.html,
    });
    return { ok: true, message: "报价已发送到邮箱" };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[报价邮件] 发送失败:", (e as Error).message);
    return { ok: false, message: "报价邮件发送失败，请稍后重试" };
  }
}
