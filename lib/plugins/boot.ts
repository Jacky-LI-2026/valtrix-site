/**
 * 内置能力注册（Built-in Capabilities Bootstrap）
 * =====================================================
 * 服务端启动/调用前注册系统内置能力到能力注册表，供插件与系统统一调用。
 * 注册的能力：
 *  - smtp.send        发送邮件（含 SMTP 配置回退链）
 *  - smtp.configured  SMTP 是否已配置
 *  - seo.push         百度站长主动推送 URL 列表
 * 幂等：模块级注册一次（registerCapability 内部已覆盖去重告警）。
 */
import { getSmtpConfig, isSmtpConfigured } from "@/lib/server/smtp-config";
import { registerCapability } from "./capabilities";
import { on } from "./events";
import nodemailer from "nodemailer";

/** smtp.send：{ to, subject, html?, text? } → 发送结果 */
export function registerBuiltinCapabilities(): void {
  registerCapability("smtp.send", async (args: any) => {
    const { to, subject, html, text } = args || {};
    if (!to || !subject) throw new Error("smtp.send 缺少 to/subject");
    const cfg = await getSmtpConfig();
    const configured = await isSmtpConfigured();
    if (!configured) throw new Error("SMTP 未配置");
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: Number(cfg.port) || 465,
      secure: Number(cfg.port) === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.sendMail({
      from: `"${cfg.fromName || "企业官网"}" <${cfg.user}>`,
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
    });
    return { ok: true };
  });

  registerCapability("smtp.configured", async () => {
    return { configured: await isSmtpConfigured() };
  });

  // seo.push 对外开放（第三方/采集系统可主动通知推送 URL）
  registerCapability(
    "seo.push",
    async (args: any) => {
      const urls = Array.isArray(args?.urls) ? args.urls : [];
      if (urls.length === 0) return { ok: true, skipped: true };
      const { pushUrlsToBaidu } = await import("@/lib/seo/baidu-push");
      return pushUrlsToBaidu(urls);
    },
    { public: true }
  );

  // 事件订阅：内容发布 → 自动推送百度收录（真实事件联动示例）
  on("content.published", async (payload: any) => {
    try {
      const { getSiteBaseUrl, pushUrlsToBaidu } = await import("@/lib/seo/baidu-push");
      const type = payload?.type;
      const slug = payload?.slug;
      if (!type || !slug) return;
      const base = await getSiteBaseUrl();
      const url = `${base}/content/${type}/${slug}`;
      await pushUrlsToBaidu([url]);
    } catch (e) {
      console.error("[events] content.published → baidu push 失败:", e);
    }
  });

  // 事件订阅：商机产生（留资/询价/预约/表单）→ SMTP 邮件通知管理员
  on("lead.submitted", async (payload: any) => {
    try {
      const { getSmtpConfig, isSmtpConfigured } = await import("@/lib/server/smtp-config");
      const configured = await isSmtpConfigured();
      if (!configured) return; // 未配置 SMTP 则跳过（devMode 不打扰）
      const cfg = await getSmtpConfig();
      const adminEmail = cfg.user;
      if (!adminEmail) return;
      const channel = payload?.channel || "商机";
      const data = payload?.data || {};
      const lines = [
        `渠道：${channel}`,
        `时间：${new Date().toLocaleString("zh-CN")}`,
        `姓名：${data.name || data.company || "-"}`,
        `邮箱：${data.email || "-"}`,
        `电话：${data.phone || "-"}`,
        `国家/城市：${[data.country, data.city].filter(Boolean).join(" / ") || "-"}`,
        `内容：${data.message || data.description || data.note || "-"}`,
      ].join("\n");
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: Number(cfg.port) || 465,
        secure: Number(cfg.port) === 465,
        auth: { user: cfg.user, pass: cfg.pass },
      });
      await transporter.sendMail({
        from: `"${cfg.fromName || "企业官网"}" <${cfg.user}>`,
        to: adminEmail,
        subject: `【新商机】${channel} · ${data.company || data.name || "访客"}`,
        text: lines,
      });
    } catch (e) {
      console.error("[events] lead.submitted → SMTP 通知失败:", e);
    }
  });
}

export const PLUGIN_EVENTS = ["content.published", "content.deleted", "lead.submitted", "file.uploaded", "system.startup"] as const;

/**
 * 内置插件生命周期 hooks 注册（R1 插件 SDK 落地示例）。
 * 仅演示「启停/配置变更」的联动场景；实际插件如需初始化/清理逻辑在此补充。
 */
export function registerPluginLifecycleHooks(): void {
  const { registerPluginHooks } = require("./hooks") as typeof import("./hooks");

  // AI 客服：停用时清理会话/知识库运行时状态（前台组件依赖启停状态自动隐藏，此处留扩展点）
  registerPluginHooks("ai-customer-service", {
    onEnable: async (ctx) => {
      console.log(`[plugin-hooks] AI 客服已启用（key=${ctx.key}）`);
    },
    onDisable: async (ctx) => {
      console.log(`[plugin-hooks] AI 客服已停用（key=${ctx.key}）`);
    },
  });

  // 内容采集：配置变更时记录（采集任务由调度器按 AutoCollectionTask 读取，无需重建）
  registerPluginHooks("content-collector", {
    onConfigChange: async (ctx) => {
      console.log(`[plugin-hooks] 内容采集配置已更新（key=${ctx.key}）`);
    },
  });

  // SMTP：配置变更时输出确认（发送链路由 smtp-config 实时读取，无需缓存重建）
  registerPluginHooks("smtp", {
    onConfigChange: async (ctx) => {
      console.log(`[plugin-hooks] SMTP 配置已更新（key=${ctx.key}）`);
    },
  });

  // 翻译插件：启用/停用联动翻译通道（全局 AI 开关独立于插件启停）
  registerPluginHooks("ai-translate", {
    onEnable: async () => console.log("[plugin-hooks] AI 翻译已启用"),
    onDisable: async () => console.log("[plugin-hooks] AI 翻译已停用"),
  });
}
