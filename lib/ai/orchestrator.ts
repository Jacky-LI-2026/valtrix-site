/**
 * 统一 AI 编排层（AI Orchestrator）— R3
 * =====================================================
 * 全站 AI 调用的唯一入口：任务分类 → 模型路由 → 统一日志/用量统计 → 优雅降级。
 *
 * 设计：
 *  - runAiTask(type, prompt, opts)：按任务类型（文案/润色/摘要/翻译/客服/SEO）路由
 *  - 分层降级：首选 DeepSeek（已配置）→ 可选其他 → 返回明确错误
 *  - 与 AI 能力插件（ai-text/ai-chat）联动：未启用时按任务类型降级
 *
 * 与 lib/atoms/ai.ts 的关系：
 *  - atoms/ai.ts 是"进程内原子函数"（translateSingleText 等）
 *  - orchestrator 是"业务编排层"（按任务类型组合原子能力 + 路由 + 统计）
 */

import { callAiText, getAiGlobalConfig, aiCapabilityEnabled } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";

export type AiTaskType =
  | "copywrite"      // 营销文案生成
  | "rewrite"        // 文章润色/改写
  | "summarize"      // 摘要
  | "translate"      // 翻译（AI 通道）
  | "seo"            // SEO/GEO 优化
  | "customer"       // AI 客服回答
  | "structure"      // 结构化提取（JSON）
  | "general";       // 通用问答

export interface AiTaskOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  /** 需要 JSON 结构化输出时置 true（提示词里会要求） */
  json?: boolean;
  /** 关联模块（如 "news" / "product"），用于统计 */
  module?: string;
  /** 是否走插件开关（默认 true） */
  checkPlugin?: boolean;
  /** 指定 AI 插件 key（默认按任务类型映射） */
  pluginKey?: string;
}

const TASK_PLUGIN_MAP: Record<AiTaskType, string> = {
  copywrite: "ai-text",
  rewrite: "ai-text",
  summarize: "ai-text",
  translate: "ai-translate",
  seo: "ai-text",
  customer: "ai-customer-service",
  structure: "ai-text",
  general: "ai-text",
};

const TASK_SYSTEM: Partial<Record<AiTaskType, string>> = {
  copywrite: "你是一位资深营销文案专家，擅长为企业官网撰写专业、有说服力、符合行业调性的文案。输出简洁有力，避免空话套话。",
  rewrite: "你是一位资深内容编辑，擅长文章润色与改写。保持原意，提升表达专业性、逻辑清晰度与可读性，不改变事实。",
  summarize: "你是一位精炼的摘要专家，擅长用最少的字数概括核心信息。",
  seo: "你是一位 SEO/GEO 优化专家，擅长撰写搜索引擎友好的标题、描述与关键词，兼顾多语种（中英）表达习惯。",
  customer: "你是一位专业的企业官网客服，基于给定知识库信息，用友好、专业、简洁的中文回答客户问题；知识库不足时如实说明。",
  structure: "你是一位数据提取专家，严格按要求的 JSON 结构输出，不输出多余内容。",
};

/** 任务类型默认系统提示词 */
export function taskSystemPrompt(type: AiTaskType): string {
  return TASK_SYSTEM[type] || TASK_SYSTEM.general!;
}

/** 按任务类型获取插件 key */
export function taskPluginKey(type: AiTaskType, override?: string): string {
  return override || TASK_PLUGIN_MAP[type] || "ai-text";
}

/**
 * 统一 AI 任务入口。
 * - 检查全局 AI 开关 + 插件开关（checkPlugin）
 * - 按任务类型注入系统提示词
 * - 调用 callAiText，记录用量到 site_config.ai_usage
 * - 失败时抛明确错误（调用方可降级为"保留原文"等）
 */
export async function runAiTask(
  type: AiTaskType,
  prompt: string,
  opts: AiTaskOptions = {}
): Promise<string> {
  const pluginKey = taskPluginKey(type, opts.pluginKey);
  if (opts.checkPlugin !== false) {
    const ok = await aiCapabilityEnabled(pluginKey);
    if (!ok) throw new Error(`AI 能力「${pluginKey}」未启用或全局 AI 开关关闭`);
  }

  const system = opts.system || taskSystemPrompt(type);
  const result = await callAiText(prompt, {
    system,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
  });

  // 用量统计（fire-and-forget）
  try {
    await recordAiUsage(type, opts.module, prompt, result);
  } catch { /* 统计失败不影响主流程 */ }

  if (opts.json) {
    // 提取 JSON（兼容 markdown 代码块包裹）
    const cleaned = result.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return cleaned.slice(start, end + 1);
    return cleaned;
  }
  return result;
}

/** 用量统计（累计到 site_config.ai_usage Json） */
export async function recordAiUsage(
  type: AiTaskType,
  module: string | undefined,
  prompt: string,
  result: string
) {
  const KEY = "ai_usage";
  const row = await prisma.siteConfig.findUnique({ where: { configKey: KEY } });
  let usage: any = {};
  try { usage = (row?.configValue as any) || {}; } catch { usage = {}; }
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  usage.total = (usage.total || 0) + 1;
  usage.byType = usage.byType || {};
  usage.byType[type] = (usage.byType[type] || 0) + 1;
  usage.byDay = usage.byDay || {};
  usage.byDay[day] = (usage.byDay[day] || 0) + 1;
  usage.byModule = usage.byModule || {};
  if (module) usage.byModule[module] = (usage.byModule[module] || 0) + 1;
  usage.promptChars = (usage.promptChars || 0) + prompt.length;
  usage.outputChars = (usage.outputChars || 0) + result.length;
  usage.updatedAt = now.toISOString();

  await prisma.siteConfig.upsert({
    where: { configKey: KEY },
    create: { configKey: KEY, configValue: usage as any },
    update: { configValue: usage as any },
  });
}

/** 获取 AI 用量统计 */
export async function getAiUsage() {
  const row = await prisma.siteConfig.findUnique({ where: { configKey: "ai_usage" } });
  try { return (row?.configValue as any) || { total: 0, byType: {}, byDay: {} }; } catch { return { total: 0, byType: {}, byDay: {} }; }
}

/**
 * 轻量 RAG：基于 AI 知识库检索
 * - 关键词匹配检索 ai_knowledge（title/content 命中）
 * - 返回 top N 条作为上下文片段
 * - 供 AI 客服 / 知识库问答使用
 */
export async function ragRetrieve(
  query: string,
  opts: { locale?: string; limit?: number } = {}
): Promise<{ id: string; title: string; snippet: string; score: number }[]> {
  const limit = opts.limit || 5;
  const locale = opts.locale || "zh";
  const langSuffix = locale === "zh" ? "" : locale.charAt(0).toUpperCase() + locale.slice(1);

  const all = await prisma.aiKnowledge.findMany({
    where: { status: "published" },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: 200,
  });

  const q = query.toLowerCase();
  const qTerms = q.split(/[\s,，。;；:：?!？、/]+/).filter((t) => t.length > 1);

  const scored = all.map((k: any) => {
    const title = k[`title${langSuffix}`] || k.title || "";
    const content = k[`content${langSuffix}`] || k.content || "";
    const text = `${title} ${content}`.toLowerCase();
    let score = 0;
    for (const term of qTerms) {
      if (text.includes(term)) score += 2;
    }
    // 整体包含也加分
    if (text.includes(q)) score += 5;
    // 标题命中加权
    if (title.toLowerCase().includes(q)) score += 5;
    return { k, title, content, score };
  });

  const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return hits.map((h) => ({
    id: String(h.k.id),
    title: h.title,
    snippet: h.content.slice(0, 300),
    score: h.score,
  }));
}

/** AI 客服回答（RAG 增强）：检索知识库 → 拼接上下文 → 调用 AI */
export async function answerWithRag(
  question: string,
  opts: { locale?: string } = {}
): Promise<{ answer: string; sources: string[]; retrieved: boolean }> {
  const hits = await ragRetrieve(question, { locale: opts.locale, limit: 5 });
  let answer: string;
  let retrieved = hits.length > 0;
  let sources = hits.map((h) => h.title);

  if (hits.length > 0) {
    const ctx = hits
      .map((h, i) => `【知识${i + 1}】标题：${h.title}\n内容：${h.snippet}`)
      .join("\n\n");
    answer = await runAiTask(
      "customer",
      `基于以下知识库信息回答客户问题：\n\n${ctx}\n\n客户问题：${question}\n\n请用专业、简洁、友好的语气回答，引用相关知识点。`,
      { module: "ai-customer", checkPlugin: true }
    );
  } else {
    answer = await runAiTask(
      "customer",
      `客户问题：${question}\n\n若知识库无相关信息，请如实告知并引导客户联系销售或查看官网。`,
      { module: "ai-customer", checkPlugin: true }
    );
  }
  return { answer, sources, retrieved };
}
