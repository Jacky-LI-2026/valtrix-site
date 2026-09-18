import { prisma } from "@/lib/prisma";

/**
 * SMTP 配置统一入口
 * - 优先从 DB site_config(smtp_config) 读取（后台可视化配置）
 * - 未配置时回退环境变量 SMTP_HOST/PORT/USER/PASS 等
 */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
}

/** 获取 SMTP 配置：DB site_config(smtp_config) → 回退环境变量 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { configKey: "smtp_config" },
      select: { configValue: true },
    });
    if (row?.configValue && typeof row.configValue === "object") {
      const v = row.configValue as Record<string, unknown>;
      const envSecure = process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465;
      return {
        host: String(v.host ?? ""),
        port: Number(v.port ?? process.env.SMTP_PORT ?? 465) || 465,
        secure: v.secure !== undefined ? Boolean(v.secure) : envSecure,
        user: String(v.user ?? ""),
        pass: String(v.pass ?? ""),
        from: String(v.from ?? ""),
        fromName: String(v.fromName ?? process.env.MAIL_FROM_NAME ?? "").trim(),
      };
    }
  } catch {
    // DB 读取失败则回退环境变量
  }
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 465) || 465,
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "",
    fromName: (process.env.MAIL_FROM_NAME || "").trim(),
  };
}

/** 判断 SMTP 是否已配置（host/user/pass 三者齐全才算） */
export async function isSmtpConfigured(): Promise<boolean> {
  const c = await getSmtpConfig();
  return Boolean(c.host && c.user && c.pass);
}

/** 保存 SMTP 配置到 DB site_config(smtp_config)。pass 为空表示保留原值 */
export async function saveSmtpConfig(input: Partial<SmtpConfig>): Promise<SmtpConfig> {
  const current = await getSmtpConfig();
  const next: SmtpConfig = {
    host: (input.host ?? current.host).trim(),
    port: Number(input.port ?? current.port) || 465,
    secure: input.secure !== undefined ? Boolean(input.secure) : current.secure,
    user: (input.user ?? current.user).trim(),
    pass: input.pass !== undefined && input.pass !== "" ? String(input.pass) : current.pass,
    from: (input.from ?? current.from).trim(),
    fromName: (input.fromName ?? current.fromName).trim(),
  };
  // host 和 user 同时清空 = 禁用后台 SMTP 配置，删除 DB 记录回退环境变量（回到开发模式）
  if (!next.host && !next.user) {
    await prisma.siteConfig.deleteMany({ where: { configKey: "smtp_config" } });
    return { ...next, pass: "" };
  }
  await prisma.siteConfig.upsert({
    where: { configKey: "smtp_config" },
    update: { configValue: next as any, updatedAt: new Date() },
    create: { configKey: "smtp_config", configValue: next as any, remark: "SMTP 邮件服务配置（后台可视化）" },
  });
  return next;
}
