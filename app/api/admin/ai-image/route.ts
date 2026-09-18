/**
 * AI 图像生成 API
 * POST {prompt, width, height, provider, key} → 生成 AI 图片并保存到 uploads
 * 返回 {ok, url, path}
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateAiImage, saveAiImage } from "@/lib/ai/image";
import { aiCapabilityEnabled } from "@/lib/ai/gateway";
import { isPluginEnabled } from "@/lib/plugins/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return NextResponse.json({ error: "图片描述不能为空" }, { status: 400 });

    const pluginOn = await isPluginEnabled("ai-image");
    const globalOn = await aiCapabilityEnabled();
    if (!pluginOn || !globalOn) {
      return NextResponse.json({ error: "AI 图像能力未开启（插件市场启用 AI 图像 + 全局 AI 打开）" }, { status: 403 });
    }

    const width = Math.min(Math.max(Number(body.width) || 1280, 256), 2048);
    const height = Math.min(Math.max(Number(body.height) || 720, 256), 2048);

    const img = await generateAiImage(prompt, { width, height, provider: body.provider, key: body.key });
    if (!img) return NextResponse.json({ error: "生成失败：未返回图片" }, { status: 500 });

    const url = await saveAiImage(img.buffer, img.contentType);
    return NextResponse.json({ ok: true, url, path: url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
