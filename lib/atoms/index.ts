/**
 * 原子 API 收口层（Atomic API Layer）
 * =====================================================
 * R1 基座沉淀：把散落在 lib/ 各处的原子能力（翻译 / AI 文本 / AI 图像 / 验证码 /
 * SMTP / 上传 / IP 地理 / 表单提交）统一收口为「原子服务」，任何页面/模块/插件
 * 复用同一实现，避免各页面重复造轮子。
 *
 * 原则：
 *  1. 服务端原子函数集中在 lib/atoms/*.ts，页面/API 只 import 这里，不再各自实现。
 *  2. 统一的错误语义：抛 Error（含用户可读 message），上层 try/catch。
 *  3. 对外（HTTP）原子能力继续走 capabilities（可被网关调用）；本层是「进程内」原子 API。
 *  4. 新原子能力在此声明并实现，页面统一引用。
 *
 * 目录：
 *  - lib/atoms/index.ts       统一出口（本文件）
 *  - lib/atoms/translate.ts   翻译原子（单条/批量/JSON）
 *  - lib/atoms/ai.ts          AI 原子（文本生成/改写/图像）
 *  - lib/atoms/captcha.ts     验证码原子（创建/校验/消费）
 *  - lib/atoms/mail.ts        邮件原子（SMTP 发送/测试）
 *  - lib/atoms/geo.ts         地理位置原子（IP → 国家/城市）
 */
export * from "./translate";
export * from "./ai";
export * from "./captcha";
export * from "./mail";
export * from "./geo";

import { registerCapability } from "@/lib/plugins/capabilities";

/**
 * 注册原子能力到插件能力注册表（供 /api/integration/[capability] 对外调用）。
 * 由 lib/plugins/ensure.ts 的 ensurePlugins() 调用（避免循环依赖，勿在此再调用 ensurePlugins）。
 */
export function registerAtomicCapabilities(): void {
  const { translateSingleText } = require("./translate") as typeof import("./translate");
  const { callAiText } = require("./ai") as typeof import("./ai");
  const { verifyCaptcha } = require("./captcha") as typeof import("./captcha");
  const { sendMail } = require("./mail") as typeof import("./mail");

  registerCapability("translate.text", async (args: any) => {
    const text = String(args?.text || "");
    const target = String(args?.targetLang || "en");
    if (!text) throw new Error("translate.text 缺少 text");
    const translated = await translateSingleText(text, target);
    return { translated };
  }, { public: true });

  registerCapability("ai.text", async (args: any) => {
    const prompt = String(args?.prompt || "");
    if (!prompt) throw new Error("ai.text 缺少 prompt");
    const text = await callAiText(prompt, {
      system: args?.system ? String(args.system) : undefined,
      maxTokens: args?.maxTokens ? Number(args.maxTokens) : undefined,
    });
    return { text };
  }, { public: true });

  registerCapability("captcha.verify", async (args: any) => {
    const ok = await verifyCaptcha(String(args?.id || ""), String(args?.answer || ""));
    return { ok };
  }, { public: false });

  registerCapability("mail.send", async (args: any) => {
    const result = await sendMail({
      to: String(args?.to || ""),
      subject: String(args?.subject || ""),
      html: args?.html ? String(args.html) : undefined,
      text: args?.text ? String(args.text) : undefined,
    });
    return result;
  }, { public: true });
}
