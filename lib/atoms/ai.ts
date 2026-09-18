/**
 * AI 原子（AI Atom）
 * =====================================================
 * 统一 AI 能力入口：文本生成 / 文本改写 / 图像生成。
 * 封装 lib/ai/gateway.ts 与 lib/ai/image.ts，页面/API 统一调用。
 */
import { callAiText as _callAiText } from "@/lib/ai/gateway";
import { generateAiImage as _genImage } from "@/lib/ai/image";

/** 直接暴露底层 callAiText（供插件能力注册复用） */
export { _callAiText as callAiText };

export interface AiTextOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

/** 统一文本 AI 调用（生成） */
export async function aiGenerateText(prompt: string, opts?: AiTextOptions): Promise<string> {
  return _callAiText(prompt, opts);
}

/** AI 改写/润色（给定原文 + 指令） */
export async function aiRewriteText(original: string, instruction?: string, opts?: AiTextOptions): Promise<string> {
  const cmd = instruction?.trim()
    ? instruction
    : "在不改变原意的前提下，对以下内容进行润色改写，使表达更专业、更自然：";
  const prompt = `${cmd}\n\n原文：\n${original}`;
  return _callAiText(prompt, { maxTokens: 1600, ...opts });
}

/** 根据标题/关键词生成内容（如 SEO 文案、FAQ） */
export async function aiGenerateContent(topic: string, kind: "article" | "faq" | "seo" | "summary", opts?: AiTextOptions): Promise<string> {
  const presets: Record<string, string> = {
    article: "请以专业企业官网风格，围绕以下主题生成一篇结构完整的文章（含标题与分节，500-800字）：",
    faq: "请围绕以下主题生成 5-8 条常见问题（FAQ），每条含「问题」与「回答」，用编号列出：",
    seo: "请生成以下主题的 SEO 标题、描述与 8 个关键词（中英文），用简洁列表输出：",
    summary: "请用 2-3 句话概括以下内容的要点：",
  };
  return _callAiText(`${presets[kind]}\n\n${topic}`, { maxTokens: 1600, ...opts });
}

/** 统一图像 AI 调用（语义生图），返回 buffer 或 null */
export async function aiGenerateImage(prompt: string, opts?: { width?: number; height?: number }): Promise<{ buffer: Buffer; contentType: string } | null> {
  return _genImage(prompt, opts);
}

/** 免费占位配图（Picsum，不消耗 AI 配额） */
export async function aiPlaceholderImage(width = 1280, height = 720): Promise<{ url: string; provider: string }> {
  const url = `https://picsum.photos/${Math.max(100, width)}/${Math.max(100, height)}?random=${Date.now()}`;
  return { url, provider: "picsum" };
}
