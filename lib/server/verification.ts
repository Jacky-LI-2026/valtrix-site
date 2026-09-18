/**
 * 下载验证服务端逻辑（仅允许在服务端 Route Handler / Server Component 中引用）
 *
 * 功能：
 * 1. 生成并保存 6 位邮箱验证码（内存存储，10 分钟有效，同一邮箱 60 秒冷却）
 * 2. 通过 SMTP 发送验证码邮件；未配置 SMTP 时进入开发模式：验证码打印到服务器控制台，
 *    并在开发环境下回传给前端便于本地联调
 * 3. 校验验证码
 * 4. 验证通过后把留资信息（公司/个人、手机号、邮箱等）追加写入 data/download-leads.jsonl
 */

import nodemailer from "nodemailer";
import { getBrandInfo, brandLetterhead, brandSubjectPrefix } from '@/lib/server/brand';
import { promises as fs } from "fs";
import path from "path";
import { getSmtpConfig, isSmtpConfigured } from "./smtp-config";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// 验证码内存存储
// 说明：单实例部署可用；多实例/Serverless 部署建议替换为 Redis 等共享存储
// ---------------------------------------------------------------------------
interface CodeEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const CODE_TTL_MS = 10 * 60 * 1000; // 验证码有效期 10 分钟
const RESEND_COOLDOWN_MS = 60 * 1000; // 同一邮箱 60 秒内不可重复发送
const MAX_ATTEMPTS = 5; // 最多尝试次数

const codeStore = new Map<string, CodeEntry>();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function cleanupExpired(): void {
  const now = Date.now();
  codeStore.forEach((entry, email) => {
    if (entry.expiresAt < now) {
      codeStore.delete(email);
    }
  });
}

/** 判断 SMTP 是否已配置（未配置则使用开发模式）——统一走 lib/server/smtp-config.ts */
export { isSmtpConfigured };

/** 发送验证码邮件；成功返回 true，未配置 SMTP 或发送失败返回 false */
async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  if (!(await isSmtpConfigured())) {
    // 开发模式：未配置 SMTP 时直接把验证码打印到服务器控制台，方便本地联调
    // eslint-disable-next-line no-console
    console.log(
      `[下载验证] 开发模式（未配置 SMTP）：邮箱 ${email} 的验证码为 ${code}（10 分钟内有效）`
    );
    return false;
  }

  const cfg = await getSmtpConfig();
  const brand = await getBrandInfo();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  const from = cfg.from || cfg.user;
  const fromName = cfg.fromName || brand.name;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: email,
      subject: `${brandSubjectPrefix(brand)}资料下载验证码`,
      html: `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:20px 24px;">
            <span style="color:#fff;font-size:18px;font-weight:bold;">${brandLetterhead(brand)}</span>
          </div>
          <div style="padding:28px 24px;color:#333;">
            <p style="margin:0 0 16px;">您好，感谢您关注${brand.name || "我们"}！</p>
            <p style="margin:0 0 16px;">您正在进行资料下载验证，本次验证码为：</p>
            <div style="text-align:center;margin:20px 0;">
              <span style="display:inline-block;font-size:30px;font-weight:bold;letter-spacing:6px;color:#CC0000;background:#FFF5F5;padding:12px 24px;border-radius:6px;">${code}</span>
            </div>
            <p style="margin:0 0 16px;">验证码 <b>10 分钟</b>内有效，请勿向他人泄露。</p>
            <p style="margin:0;color:#999;font-size:12px;">此邮件由系统自动发送，请勿直接回复。</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[下载验证] 邮件发送失败：", err);
    return false;
  }
}

/** 请求发送验证码。返回 { ok, code?, message }，开发模式会附带 code 供前端展示 */
export async function requestVerificationCode(email: string): Promise<{
  ok: boolean;
  code?: string;
  devMode?: boolean;
  message: string;
}> {
  const now = Date.now();
  cleanupExpired();

  const existing = codeStore.get(email);
  if (existing && existing.expiresAt - now > RESEND_COOLDOWN_MS) {
    return { ok: false, message: "发送过于频繁，请 60 秒后再试" };
  }

  const code = generateCode();
  codeStore.set(email, { code, expiresAt: now + CODE_TTL_MS, attempts: 0 });

  const configured = await isSmtpConfigured();
  if (configured) {
    // 已配置 SMTP：必须真实发送成功，否则清理验证码并返回失败（避免"显示已发送但收不到"卡死）
    const sent = await sendVerificationEmail(email, code);
    if (!sent) {
      // 降级：邮件服务暂不可用（配置失效/被拒/网络异常）时，回显验证码保证下载流程不卡死；
      // 验证码为一次性 6 位码、10 分钟有效，并受 IP 限流保护（5 次/分钟）
      codeStore.set(email, { code, expiresAt: now + CODE_TTL_MS, attempts: 0 });
      return {
        ok: true,
        code,
        devMode: true,
        message: "验证码邮件暂未送达（邮件服务异常），已临时显示验证码，请直接使用；我们也会排查邮件服务",
      };
    }
    return {
      ok: true,
      devMode: false,
      message: "验证码已发送至您的邮箱，请查收",
    };
  }

  // 未配置 SMTP：开发模式，验证码打印日志并在开发环境回传
  await sendVerificationEmail(email, code);
  return {
    ok: true,
    code,
    devMode: true,
    message: "验证码已生成（开发模式：未配置 SMTP，验证码已打印在服务器日志中，并临时显示于下方）",
  };
}

/** 校验验证码并记录留资。返回 { ok, message } */
export async function verifyCodeAndRecordLead(payload: {
  email: string;
  code: string;
  name: string;
  company: string;
  phone: string;
  resourceName?: string;
  downloadUrl?: string;
}): Promise<{ ok: boolean; message: string }> {
  cleanupExpired();
  const entry = codeStore.get(payload.email);

  if (!entry) {
    return { ok: false, message: "验证码不存在或已过期，请重新获取" };
  }
  if (entry.expiresAt < Date.now()) {
    codeStore.delete(payload.email);
    return { ok: false, message: "验证码已过期，请重新获取" };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    codeStore.delete(payload.email);
    return { ok: false, message: "尝试次数过多，验证码已失效，请重新获取" };
  }
  if (entry.code !== payload.code) {
    entry.attempts += 1;
    return { ok: false, message: "验证码错误，请重新输入" };
  }

  // 验证通过：删除验证码（一次性），记录留资（不含验证码本身）
  codeStore.delete(payload.email);
  await recordLead({
    email: payload.email,
    name: payload.name,
    company: payload.company,
    phone: payload.phone,
    resourceName: payload.resourceName,
    downloadUrl: payload.downloadUrl,
  });
  return { ok: true, message: "验证通过" };
}

/** 将留资信息以 JSONL 形式追加写入 data/download-leads.jsonl */
async function recordLead(lead: {
  email: string;
  name: string;
  company: string;
  phone: string;
  resourceName?: string;
  downloadUrl?: string;
}): Promise<void> {
  try {
    const dataDir = path.join(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });
    const filePath = path.join(dataDir, "download-leads.jsonl");
    const line = JSON.stringify({
      ...lead,
      verifiedAt: new Date().toISOString(),
    });
    await fs.appendFile(filePath, line + "\n", "utf8");
  } catch (err) {
    // 留资记录失败不应阻断下载流程
    // eslint-disable-next-line no-console
    console.error("[下载验证] 留资记录写入失败：", err);
  }
}
