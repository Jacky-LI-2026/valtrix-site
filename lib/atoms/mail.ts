/**
 * 邮件原子（Mail Atom）
 * =====================================================
 * 统一邮件发送：SMTP 配置读取 + 发送 + 配置检测。
 * 封装 lib/server/smtp-config.ts 与 lib/plugins 的 smtp.send 能力，页面/API 统一调用。
 */
import { getSmtpConfig, isSmtpConfigured } from "@/lib/server/smtp-config";
import { callCapability } from "@/lib/plugins/capabilities";
import { ensurePlugins } from "@/lib/plugins/ensure";

export interface SendMailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/** SMTP 是否已配置 */
export async function mailConfigured(): Promise<boolean> {
  return isSmtpConfigured();
}

/** 发送邮件（优先走插件能力 smtp.send，统一配置与回退链） */
export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; mode: "smtp" | "dev"; message?: string }> {
  if (!input.to || !input.subject) throw new Error("sendMail 缺少 to/subject");
  ensurePlugins();
  try {
    const result = await callCapability("smtp.send", input);
    if (result && result.ok) return { ok: true, mode: "smtp" };
    // 能力存在但失败（SMTP 未配置）
    const configured = await isSmtpConfigured();
    if (!configured) {
      return { ok: true, mode: "dev", message: "SMTP 未配置，邮件未真实发送（开发模式）" };
    }
    throw new Error("SMTP 发送失败，请检查配置");
  } catch (e: any) {
    const configured = await isSmtpConfigured();
    if (!configured) {
      return { ok: true, mode: "dev", message: "SMTP 未配置，邮件未真实发送（开发模式）" };
    }
    throw e;
  }
}

/** 发送测试邮件（后台 SMTP 配置页使用） */
export async function sendTestMail(to: string): Promise<{ ok: boolean; message?: string }> {
  const cfg = await getSmtpConfig();
  const fromName = cfg.fromName || "企业官网";
  const result = await sendMail({
    to,
    subject: "【测试邮件】SMTP 配置验证",
    html: `<p>这是一封来自 ${fromName} 的测试邮件，用于验证 SMTP 配置是否可用。</p><p>发送时间：${new Date().toLocaleString("zh-CN")}</p>`,
  });
  if (!result.ok) throw new Error(result.message || "发送失败");
  return { ok: true, message: result.mode === "smtp" ? "已通过 SMTP 发送" : result.message };
}
