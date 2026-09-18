/**
 * AI 能力网关（AI Capability Gateway）
 * =====================================================
 * 「AI 能力插件族」的统一底座：文本 AI / 图像 AI / Chat AI / 翻译 AI 统一配置与开关。
 * 设计：全站任意功能可嵌入「AI 开关」——由两层控制：
 *   1. 全局 AI 开关（ai_global_config.enabled）：关 = 所有 AI 能力不可用
 *   2. 各 AI 插件开关（插件市场启停）：ai-text / ai-image / ai-chat(ai-customer-service) / ai-translate
 * 任一 AI 能力调用前：aiCapabilityEnabled('ai-text') → 全局开 && 对应插件开。
 *
 * 配置存 site_config.ai_global_config（Json）：
 *   { enabled, textProvider:'deepseek', imageProvider, chatProvider,
 *     deepseekKey, deepseekModel, ... }
 */
import { prisma } from "@/lib/prisma";
import { isPluginEnabled } from "@/lib/plugins/store";
const CONFIG_KEY = "ai_global_config";

export interface AiGlobalConfig {
  enabled: boolean;
  textProvider: string;
  imageProvider: string;
  chatProvider: string;
  deepseekKey: string;
  deepseekModel: string;
  [k: string]: any;
}

export const DEFAULT_AI_CONFIG: AiGlobalConfig = {
  enabled: true,
  textProvider: "deepseek",
  imageProvider: "",
  chatProvider: "deepseek",
  deepseekKey: "",
  deepseekModel: "deepseek-chat",
};

/** 读取全局 AI 配置 */
export async function getAiGlobalConfig(): Promise<AiGlobalConfig> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: CONFIG_KEY } });
    const v = (row?.configValue as unknown as Partial<AiGlobalConfig>) || {};
    return { ...DEFAULT_AI_CONFIG, ...v };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

/** 保存全局 AI 配置 */
export async function saveAiGlobalConfig(input: Partial<AiGlobalConfig>): Promise<AiGlobalConfig> {
  const cur = await getAiGlobalConfig();
  const next = { ...cur, ...input };
  await prisma.siteConfig.upsert({
    where: { configKey: CONFIG_KEY },
    update: { configValue: next as any },
    create: { configKey: CONFIG_KEY, configValue: next as any },
  });
  return next;
}

/**
 * 判断某 AI 能力是否可用：全局开关 && 对应 AI 插件启用。
 * pluginKey 省略时仅查全局开关（用于无独立插件的基础能力）。
 */
export async function aiCapabilityEnabled(pluginKey?: string): Promise<boolean> {
  const cfg = await getAiGlobalConfig();
  if (!cfg.enabled) return false;
  if (pluginKey) {
    try {
      return await isPluginEnabled(pluginKey);
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * 统一文本 AI 调用（DeepSeek 兼容 API）。
 * 密钥优先级：ai_global_config.deepseekKey → translate_config 的 DeepSeek key → ai_chat_config.apiKey。
 */
export async function callAiText(
  prompt: string,
  opts: { system?: string; maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const cfg = await getAiGlobalConfig();
  let key = cfg.deepseekKey;

  // 回退读取其他已有配置里的 DeepSeek Key（translate_config 可能为 JSON 字符串）
  if (!key) {
    try {
      const [tr, chat, plugin] = await Promise.all([
        prisma.siteConfig.findUnique({ where: { configKey: "translate_config" } }),
        prisma.siteConfig.findUnique({ where: { configKey: "ai_chat_config" } }),
        prisma.siteConfig.findUnique({ where: { configKey: "plugin_state" } }),
      ]);
      let tv: any = {};
      try { tv = typeof tr?.configValue === "string" ? JSON.parse(tr.configValue) : (tr?.configValue || {}); } catch { tv = {}; }
      let cv: any = {};
      try { cv = typeof chat?.configValue === "string" ? JSON.parse(chat.configValue) : (chat?.configValue || {}); } catch { cv = {}; }
      let ps: any = {};
      try { ps = typeof plugin?.configValue === "string" ? JSON.parse(plugin.configValue) : (plugin?.configValue || {}); } catch { ps = {}; }
      key =
        (tv.deepseekKey || tv.apiKey) ||
        (cv && cv.apiKey) ||
        (ps["ai-text"] && ps["ai-text"].config && ps["ai-text"].config.apiKey) ||
        "";
    } catch {
      key = "";
    }
  }

  if (!key) throw new Error("AI 文本能力未配置密钥，请在「插件管理 → AI 文本」或翻译/AI 客服配置 DeepSeek Key");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: cfg.deepseekModel || "deepseek-chat",
        messages: [
          ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
          { role: "user" as const, content: prompt },
        ],
        max_tokens: opts.maxTokens ?? 1200,
        temperature: opts.temperature ?? 0.7,
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `DeepSeek 调用失败(${res.status})`);
    return data?.choices?.[0]?.message?.content?.trim() || "";
  } finally {
    clearTimeout(timer);
  }
}
