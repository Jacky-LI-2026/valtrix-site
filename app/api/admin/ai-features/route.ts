/**
 * AI 开关矩阵 · 后台管理 API
 * GET    /api/admin/ai-features            → 功能点列表 + 全局开关
 * POST   /api/admin/ai-features            → { action:'toggle', key } | { action:'global', enabled }
 * PUT    /api/admin/ai-features            → { key, config }
 */
import { NextRequest, NextResponse } from "next/server";
import { BUILTIN_AI_FEATURES, AI_FEATURE_CATEGORY_LABELS, getAiFeatureState, saveAiFeatureState } from "@/lib/ai/features";
import { getAiGlobalConfig, saveAiGlobalConfig } from "@/lib/ai/gateway";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const [state, global] = await Promise.all([getAiFeatureState(), getAiGlobalConfig()]);
  const list = BUILTIN_AI_FEATURES.map((f) => {
    const entry = state[f.key];
    return {
      ...f,
      enabled: entry ? !!entry.enabled : f.defaultEnabled,
      config: entry?.config || {},
      categoryLabel: AI_FEATURE_CATEGORY_LABELS[f.category] || f.category,
    };
  });
  return NextResponse.json({ ok: true, list, globalEnabled: !!global.enabled });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const action = body?.action;
    if (action === "global") {
      await saveAiGlobalConfig({ enabled: !!body?.enabled });
      return NextResponse.json({ ok: true, enabled: !!body?.enabled });
    }
    const key = String(body?.key || "");
    if (!key) return NextResponse.json({ ok: false, error: "缺少功能点 key" }, { status: 400 });
    const state = await getAiFeatureState();
    const manifest = BUILTIN_AI_FEATURES.find((f) => f.key === key);
    const entry = state[key] || { enabled: manifest ? manifest.defaultEnabled : false, config: {} };
    if (action === "toggle") {
      entry.enabled = !entry.enabled;
      state[key] = entry;
      await saveAiFeatureState(state);
      return NextResponse.json({ ok: true, entry });
    }
    return NextResponse.json({ ok: false, error: "未知 action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "操作失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const key = String(body?.key || "");
    if (!key) return NextResponse.json({ ok: false, error: "缺少功能点 key" }, { status: 400 });
    const state = await getAiFeatureState();
    const manifest = BUILTIN_AI_FEATURES.find((f) => f.key === key);
    const entry = state[key] || { enabled: manifest ? manifest.defaultEnabled : true, config: {} };
    entry.config = body?.config || {};
    state[key] = entry;
    await saveAiFeatureState(state);
    return NextResponse.json({ ok: true, entry });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "保存失败" }, { status: 500 });
  }
}
