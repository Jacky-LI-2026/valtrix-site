import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { callAiText } from "@/lib/ai/gateway";
import { aiFeatureEnabled } from "@/lib/ai/features";
import { serializeBigInt } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * AI 生成外链软文
 * POST body: { backlinkId?, platform, platformType?, keyword?, targetUrl?, siteName?, topic? }
 * 基于目标外链信息 + 关键词，生成一篇适合第三方平台发布的软文（标题 + 正文含回链引导）
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const enabled = await aiFeatureEnabled("backlink_writer");
  if (!enabled) {
    return NextResponse.json(
      { error: "「外链发布文案」功能未开启：请在 系统设置 → AI 开关矩阵 中启用（需全局 AI + AI 文本插件 + 本功能点同时开启）" },
      { status: 403 }
    );
  }
  try {
    const body = await req.json();
    if (!body.platform) return NextResponse.json({ error: "平台不能为空" }, { status: 400 });

    // 读取网站名称/主题（站点设置）
    let siteName = "我们公司";
    let siteDomain = "";
    try {
      const sc = await prisma.siteConfig.findUnique({ where: { configKey: "site_config" } });
      const v: any = sc?.configValue;
      const cfg = typeof v === "string" ? JSON.parse(v) : v || {};
      siteName = cfg.siteName || cfg.companyName || siteName;
      siteDomain = cfg.domain || "";
    } catch { /* ignore */ }

    const platformName = body.platform;
    const keyword = body.keyword || "工业阀门";
    const targetUrl = body.targetUrl || `https://${siteDomain}`;
    const topic = body.topic || "工业阀门与流体控制";

    const prompt = `请为 "${siteName}"（${topic}，官网 ${targetUrl}）撰写一篇用于在第三方平台「${platformName}」发布的营销软文。
要求：
1. 围绕关键词「${keyword}」自然展开，行业化、专业、不浮夸；
2. 标题要吸引人且包含关键词，适合 ${platformName} 平台风格；
3. 正文 500-700 字，分 4-6 段，结尾自然引导读者访问官网 ${targetUrl}（不要生硬广告）；
4. 不得编造虚假数据或资质，如需要数据用模糊表述（如"多型号可选"）。

输出格式（严格按此格式，用 markdown）：
# 标题

正文段落……`;

    const raw = await callAiText(prompt, { maxTokens: 1800, temperature: 0.7 });
    // 解析标题与正文
    let title = "";
    let zh = raw;
    const m = raw.match(/^#\s*(.+)$/m);
    if (m) {
      title = m[1].trim();
      zh = raw.replace(/^#\s*.+$/m, "").trim();
    } else {
      title = `【${platformName}】${keyword} 行业洞察`;
    }

    const item = await prisma.backlinkPost.create({
      data: {
        backlinkId: body.backlinkId ? BigInt(body.backlinkId) : null,
        platform: String(body.platform),
        platformType: String(body.platformType || "other"),
        title,
        content: { zh } as any,
        status: "draft",
        targetUrl: body.targetUrl || null,
        aiGenerated: true,
      },
    });
    return NextResponse.json(serializeBigInt(item));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
