import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getAiCredential } from "@/lib/company-verify";
import { collectWebSources } from "@/lib/server/web-collect";

export const runtime = "nodejs";

const WEB_PROMPT = [
  "你是企业官网 AI 智能客服知识库的整理助手。请基于用户提供的【网络素材】（搜索结果：标题+摘要+来源链接），围绕给定【关键词/主题】生成高质量的问答对。",
  "要求：",
  "1. 生成指定数量的问答对（默认 5 个）；",
  "2. 问题要口语化、贴近真实客户咨询（如：你们提供什么？怎么联系？报价如何？有哪些优势？）；",
  "3. 答案要准确、专业、简明，80-200 字，**必须基于素材中的真实信息**；素材未覆盖的细节不得编造；",
  "4. 每个答案末尾附上最相关的 1-2 个来源链接（格式：【来源】https://...），链接必须来自素材；",
  "5. 涉及价格、合同、交期等交易细节时，答案引导用户留下联系方式由销售对接，不给出具体承诺；",
  "6. 只输出 JSON 数组，不要输出任何其他文字，格式：[{\"q\":\"问题1\",\"a\":\"答案1\"},{\"q\":\"问题2\",\"a\":\"答案2\"}]",
].join("\n");

function parseQa(content: string): { q: string; a: string }[] {
  let text = (content || "").trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (!arrMatch) return [];
  try {
    const arr = JSON.parse(arrMatch[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((it) => it && typeof it === "object" && (it.q || it.question) && (it.a || it.answer))
      .map((it) => ({ q: String(it.q || it.question || "").trim(), a: String(it.a || it.answer || "").trim() }))
      .filter((it) => it.q && it.a);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await request.json();
    const keyword = String(body.keyword || "").trim().slice(0, 100);
    if (!keyword) return NextResponse.json({ error: "请输入关键词" }, { status: 400 });
    const category = String(body.category || "全网收集").trim().slice(0, 100);
    let count = parseInt(body.count || "5", 10);
    if (isNaN(count) || count < 1) count = 5;
    if (count > 10) count = 10;

    // 1. 全网收集素材（必应优先 → 百度降级）
    let sources: { title: string; url: string; snippet: string }[] = [];
    let engine = "";
    let collectError = "";
    try {
      const r = await collectWebSources(keyword, count);
      sources = r.sources;
      engine = r.engine;
    } catch (e: any) {
      collectError = e?.message || "全网收集失败";
    }

    const credential = await getAiCredential();
    if (!credential.key) {
      return NextResponse.json({ error: "未配置 AI 服务（请在 AI 设置中填写 DeepSeek API Key）" }, { status: 400 });
    }

    // 2. 构造 AI 输入
    let userPrompt = "";
    if (sources.length > 0) {
      const material = sources
        .map((s, i) => `[${i + 1}] 标题：${s.title}\n摘要：${s.snippet}\n链接：${s.url}`)
        .join("\n\n");
      userPrompt = `关键词/主题：${keyword}\n\n【网络素材】（来自${engine}搜索）：\n${material}\n\n请基于以上素材生成 ${count} 个问答对，答案必须基于素材且带来源链接。`;
    } else {
      userPrompt = `关键词/主题：${keyword}\n【注意】本次未获取到网络素材（${collectError}），请基于该主题的行业常识生成 ${count} 个问答对，答案末尾注明"基于行业常识整理，建议核实最新信息"。`;
    }

    const res = await fetch(`${credential.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${credential.key}` },
      body: JSON.stringify({
        model: credential.model,
        messages: [
          { role: "system", content: WEB_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("AI 全网知识生成失败:", res.status, t.slice(0, 300));
      return NextResponse.json({ error: `AI 生成失败（${res.status}），请稍后再试` }, { status: 502 });
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const pairs = parseQa(content);
    if (!pairs.length) {
      return NextResponse.json({ error: "AI 未能生成有效问答，请换关键词重试" }, { status: 502 });
    }

    // 3. 入库（去重）
    let imported = 0;
    for (const p of pairs) {
      const dup = await prisma.aiKnowledge.findFirst({ where: { title: p.q } });
      if (dup) continue;
      await prisma.aiKnowledge.create({
        data: { title: p.q, content: p.a, category, source: "web:" + engine, status: "published", sortOrder: 0 },
      });
      imported++;
    }
    return NextResponse.json({
      ok: true,
      keyword,
      imported,
      total: pairs.length,
      engine: engine || "none",
      sources: sources.length,
      collectError: sources.length ? "" : collectError,
    });
  } catch (error: any) {
    console.error("AI 知识库全网收集失败:", error);
    return NextResponse.json({ error: error?.message || "全网收集失败" }, { status: 500 });
  }
}
