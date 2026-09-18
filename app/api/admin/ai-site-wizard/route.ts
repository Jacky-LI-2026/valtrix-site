import { NextRequest, NextResponse } from "next/server";
import { runAiTask } from "@/lib/ai/orchestrator";
import { INDUSTRY_PACK_MAP } from "@/lib/templates/industry-packs";

/**
 * AI 建站向导 — R3
 * =====================================================
 * 输入：公司名称 + 行业 + 核心业务描述
 * 输出：整站文案骨架（首页 Hero/关于/产品/服务/SEO/联系方式）
 * 支持 JSON 结构化输出，供「一键填入」各内容模块。
 */

interface WizardInput {
  companyName: string;
  industry: string;        // 行业包 slug 或自定义文本
  business: string;        // 核心业务描述
  locale?: string;         // 生成语言（默认 zh）
  extra?: string;          // 其他要求
}

export async function POST(req: NextRequest) {
  try {
    const body: WizardInput = await req.json();
    if (!body.companyName || !body.business) {
      return NextResponse.json({ error: "公司名称与核心业务描述为必填项" }, { status: 400 });
    }

    const industryName = INDUSTRY_PACK_MAP[body.industry]?.name || body.industry || "通用行业";
    const locale = body.locale || "zh";

    const prompt = `请为公司官网生成整站文案骨架。要求：
公司名称：${body.companyName}
所属行业：${industryName}
核心业务：${body.business}
${body.extra ? `附加要求：${body.extra}` : ""}
语言：${locale === "zh" ? "中文（简体）" : "English"}

请严格输出以下 JSON 结构（不要输出多余内容，不要用 markdown 包裹）：
{
  "heroTitle": "首页大标题（一句话品牌主张，简洁有力）",
  "heroSubtitle": "首页副标题（支撑主标题的一句话）",
  "aboutTitle": "关于我们标题",
  "aboutText": "关于我们简介（100-150字，突出实力与差异化）",
  "stats": [
    { "label": "统计指标名", "value": "数值" }
  ],
  "featureTitle": "核心优势区块标题",
  "featureDesc": "核心优势一句话描述",
  "features": [
    { "title": "优势1标题", "desc": "优势1描述（一句话）" }
  ],
  "productTitle": "产品中心标题",
  "productDesc": "产品中心一句话描述",
  "serviceTitle": "服务能力标题",
  "serviceDesc": "服务能力一句话描述",
  "services": [
    { "title": "服务1", "desc": "服务1描述" }
  ],
  "ctaTitle": "行动号召标题",
  "ctaSubtitle": "行动号召副标题",
  "seoTitle": "SEO 标题（含品牌词，60字内）",
  "seoDescription": "SEO 描述（150字内）",
  "seoKeywords": "SEO 关键词（逗号分隔）"
}`;

    const result = await runAiTask("structure", prompt, {
      json: true,
      maxTokens: 2500,
      module: "site-wizard",
      pluginKey: "ai-text",
    });

    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch {
      return NextResponse.json({ error: "AI 生成结果无法解析，请重试" }, { status: 422 });
    }

    return NextResponse.json({ ok: true, data: parsed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "AI 建站向导调用失败" }, { status: 500 });
  }
}
