/**
 * AI 占位配图 API
 * POST /api/ai/placeholder  body: { keyword?, w?, h? }
 * 受 image_placeholder 功能点开关控制（全局 AI + ai-image 插件 + 功能点三层）。
 * 免费图源：picsum.photos（seed 固定 → 图片固定；随机风景/工业占位图）。
 * 语义 AI 生图需接入图像服务商（ai-image 插件 config 待接入）。
 */
import { NextRequest, NextResponse } from "next/server";
import { aiFeatureEnabled } from "@/lib/ai/features";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const enabled = await aiFeatureEnabled("image_placeholder");
    if (!enabled) {
      return NextResponse.json(
        { ok: false, error: "「AI 占位配图」功能未开启：请在 系统设置 → AI 开关矩阵 中启用（需全局 AI + AI 图像插件 + 本功能点同时开启）" },
        { status: 403 }
      );
    }
    const keyword = String(body?.keyword || "industry").slice(0, 40);
    let w = Number(body?.w) || 1600;
    let h = Number(body?.h) || 900;
    w = Math.min(Math.max(w, 320), 2000);
    h = Math.min(Math.max(h, 200), 2000);
    const seed = encodeURIComponent(keyword.replace(/\s+/g, "-"));
    const url = `https://picsum.photos/seed/${seed}/${w}/${h}`;
    return NextResponse.json({ ok: true, url, keyword, w, h, note: "免费占位图（随机），语义 AI 生图待接入服务商" });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "生成失败" }, { status: 500 });
  }
}
