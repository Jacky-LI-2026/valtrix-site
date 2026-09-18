/**
 * 前台组件市场 · 配置 API
 * GET  → 区块定义 + 当前配置
 * PUT  → 保存配置（启停 + 排序）
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { HOME_SECTIONS, getHomeSectionConfig, saveHomeSectionConfig, type HomeSectionConfig } from "@/lib/home-sections";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const cfg = await getHomeSectionConfig();
  // 合并定义与配置（保证定义新增也有默认配置）
  const merged = HOME_SECTIONS.map((def, i) => {
    const c = cfg.find((x) => x.key === def.key);
    return { ...def, enabled: c ? c.enabled : true, sortOrder: c ? c.sortOrder : i };
  });
  return NextResponse.json({ sections: merged });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    const list: HomeSectionConfig[] = Array.isArray(body?.sections) ? body.sections : [];
    if (!list.length) return NextResponse.json({ error: "参数错误" }, { status: 400 });
    const valid = list.filter((x: any) => HOME_SECTIONS.some((d) => d.key === x.key));
    if (!valid.length) return NextResponse.json({ error: "无有效区块" }, { status: 400 });
    const saved = await saveHomeSectionConfig(valid);
    return NextResponse.json({ ok: true, sections: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "保存失败" }, { status: 500 });
  }
}
