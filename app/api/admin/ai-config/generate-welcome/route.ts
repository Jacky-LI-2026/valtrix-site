import { NextResponse } from "next/server";
import { getBrandInfo } from '@/lib/server/brand';
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getAiCredential } from "@/lib/company-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LANGS = ["zh", "en", "ja", "ko", "fr", "ar"];

async function getSiteName(): Promise<string> {
  try {
    const sc = await prisma.siteConfig.findUnique({ where: { configKey: "site_name" } });
    if (sc && typeof sc.configValue === "string" && sc.configValue.trim()) return sc.configValue.trim();
  } catch (e) {}
  return (await getBrandInfo()).name;
}

function parseWelcome(content: string): Record<string, string> {
  let text = (content || "").trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (!objMatch) return {};
  try {
    const obj = JSON.parse(objMatch[0]);
    const out: Record<string, string> = {};
    for (const k of LANGS) {
      const v = obj[k];
      if (v && typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const siteName = await getSiteName();
    const credential = await getAiCredential();
    if (!credential.key) {
      return NextResponse.json({ error: "未配置 AI 服务（请填写 API Key）" }, { status: 400 });
    }
    const system = [
      "你是企业官网的文案策划。请为站点生成 AI 智能客服的【主动打招呼欢迎语】，语气亲切、专业、简短（中文 60 字以内，其他语种对应篇幅）。",
      "内容要点：问候 + 自我介绍（站点名）+ 说明可解答产品/应用/服务等问题 + 引导留言或联系。",
      "不要编造具体价格、型号、电话等专有信息。",
      "只输出 JSON 对象，字段为六语种代码，格式：{\"zh\":\"...\",\"en\":\"...\",\"ja\":\"...\",\"ko\":\"...\",\"fr\":\"...\",\"ar\":\"...\"}",
    ].join("\n");
    const res = await fetch(`${credential.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${credential.key}` },
      body: JSON.stringify({
        model: credential.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `站点名称：${siteName}\n请生成六语种（zh/en/ja/ko/fr/ar）欢迎语。` },
        ],
        temperature: 0.6,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("AI 生成欢迎语失败:", res.status, t.slice(0, 300));
      return NextResponse.json({ error: `AI 生成失败（${res.status}），请稍后再试` }, { status: 502 });
    }
    const data = await res.json();
    const welcome = parseWelcome(data?.choices?.[0]?.message?.content || "");
    if (!Object.keys(welcome).length) {
      return NextResponse.json({ error: "AI 未能生成有效欢迎语，请重试" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, welcome });
  } catch (error: any) {
    console.error("AI 生成欢迎语异常:", error);
    return NextResponse.json({ error: error?.message || "生成失败" }, { status: 500 });
  }
}
