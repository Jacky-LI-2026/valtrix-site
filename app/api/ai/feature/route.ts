/**
 * AI 功能点调用 API
 * POST /api/ai/feature  body: { feature, action?: 'generate'|'polish'|'summary', text?, prompt?, locale? }
 * 服务端校验：功能点开关（全局 AI + 归属插件 + 功能点）→ 未开返回 403
 * → callAiText 执行 → 返回 { ok, result }
 */
import { NextRequest, NextResponse } from "next/server";
import { aiFeatureEnabled, getAiFeatureConfig, getAiFeatureManifest } from "@/lib/ai/features";
import { callAiText, getAiGlobalConfig } from "@/lib/ai/gateway";

export const dynamic = "force-dynamic";

const ACTION_PROMPTS: Record<string, (label: string, text?: string) => string> = {
  generate: (label) =>
    `你是企业官网内容编辑。请直接为「${label || "内容"}」撰写专业、通顺、符合 B2B 行业风格的正文（300 字以内，纯文本，不要 Markdown 标题符号）。只输出内容本身，不要任何解释、问候或对话式回复。`,
  polish: (label, text) =>
    `请润色以下「${label || "内容"}」文案，使其更专业、精炼、通顺（保持原意与信息，纯文本输出，只输出润色结果，不要解释）：\n\n${text || ""}`,
  summary: (label, text) =>
    `请为以下「${label || "内容"}」生成：1) 一句话摘要（60 字内） 2) SEO 标题（40 字内） 3) 5 个 SEO 关键词（逗号分隔）。纯文本分三行输出，不要 Markdown，不要解释：\n\n${text || ""}`,
  generate_json: (label, text) =>
    `你是企业官网内容编辑。请为「${label || "内容"}」${text ? `（参考信息：${text}）` : ""}生成结构化 JSON 数组。只输出 JSON 数组本身，不要 Markdown 代码块标记、不要解释、不要任何多余文字。`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const feature = String(body?.feature || "");
    if (!feature) return NextResponse.json({ ok: false, error: "缺少功能点标识" }, { status: 400 });
    const manifest = getAiFeatureManifest(feature);
    if (!manifest) return NextResponse.json({ ok: false, error: "未知 AI 功能点" }, { status: 404 });

    // 三层开关
    const enabled = await aiFeatureEnabled(feature);
    if (!enabled) {
      return NextResponse.json(
        { ok: false, error: `「${manifest.name}」功能未开启：请在 系统设置 → AI 开关矩阵 中启用（需全局 AI + ${manifest.pluginKey === "ai-text" ? "AI 文本" : manifest.pluginKey} 插件 + 本功能点同时开启）` },
        { status: 403 }
      );
    }

    const action = String(body?.action || "generate");
    const actionFn = ACTION_PROMPTS[action] || ACTION_PROMPTS.generate;
    const label = String(body?.label || "");
    const text = String(body?.text || "");
    const hint = String(body?.prompt || "").trim();
    const basePrompt = actionFn(label, text);
    const prompt = hint ? `${basePrompt}\n\n【写作要求】${hint}` : basePrompt;
    const cfg = await getAiFeatureConfig(feature);
    const global = await getAiGlobalConfig();

    const result = await callAiText(prompt, {
      maxTokens: Number(cfg.maxTokens) || 1200,
      temperature: Number(cfg.temperature) || 0.7,
      system: global.textProvider === "openai" ? undefined : "你是一个专业的企业官网内容助手，输出简洁、准确、纯文本。",
    });
    return NextResponse.json({ ok: true, feature, action, result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "AI 调用失败" }, { status: 500 });
  }
}
