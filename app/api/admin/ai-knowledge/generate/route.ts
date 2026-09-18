import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getAiCredential } from "@/lib/company-verify";
import { serializeBigInt } from "@/lib/serialize";

export const runtime = "nodejs";

const GEN_PROMPT = [
  "你是企业官网 AI 智能客服知识库的整理助手。请围绕用户给定的【关键词/主题】，从客户咨询角度生成一系列高质量的问答对。",
  "要求：",
  "1. 生成指定数量的问答对（默认 5 个）；",
  "2. 问题要口语化、贴近真实客户咨询（如：你们提供什么？怎么联系？报价如何？有哪些优势？）；",
  "3. 答案要准确、专业、简明，80-200 字，基于该主题的行业常识，不得编造具体的价格、型号、联系方式等本站专有信息；",
  "4. 涉及交易细节（价格/合同/交期）时答案应引导用户留下联系方式由销售对接，不给出具体承诺；",
  "5. 只输出 JSON 数组，不要输出任何其他文字，格式：[{\"q\":\"问题1\",\"a\":\"答案1\"},{\"q\":\"问题2\",\"a\":\"答案2\"}]",
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
    const category = String(body.category || "AI生成").trim().slice(0, 100);
    let count = parseInt(body.count || "5", 10);
    if (isNaN(count) || count < 1) count = 5;
    if (count > 20) count = 20;

    const credential = await getAiCredential();
    if (!credential.key) return NextResponse.json({ error: "未配置 AI 服务（请在 AI 智能客服或翻译配置中填写 API Key）" }, { status: 400 });

    const res = await fetch(`${credential.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${credential.key}` },
      body: JSON.stringify({
        model: credential.model,
        messages: [
          { role: "system", content: GEN_PROMPT },
          { role: "user", content: `关键词/主题：${keyword}\n请生成 ${count} 个问答对。` },
        ],
        temperature: 0.5,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("AI 生成失败:", res.status, t.slice(0, 300));
      return NextResponse.json({ error: `AI 生成失败（${res.status}），请稍后再试` }, { status: 502 });
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const pairs = parseQa(content);
    if (!pairs.length) return NextResponse.json({ error: "AI 未能生成有效问答，请换关键词重试" }, { status: 502 });

    let imported = 0;
    for (const p of pairs) {
      const dup = await prisma.aiKnowledge.findFirst({ where: { title: p.q } });
      if (dup) continue;
      await prisma.aiKnowledge.create({
        data: { title: p.q, content: p.a, category, source: "auto", status: "published", sortOrder: 0 },
      });
      imported++;
    }
    return NextResponse.json({ ok: true, keyword, imported, total: pairs.length });
  } catch (error: any) {
    console.error("AI 知识库关键词生成失败:", error);
    return NextResponse.json({ error: error?.message || "生成失败" }, { status: 500 });
  }
}
