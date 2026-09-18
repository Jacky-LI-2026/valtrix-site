/**
 * AI 自动运营 · 后台 API
 * GET                  → 配置 + 内容类型列表 + 各类型草稿数 + 运行日志
 * POST {action:'save', ...cfg} → 保存配置（支持多类型 types[] + schedule）
 * POST {action:'run', ...cfg}  → 立即运行一轮
 * POST {action:'stats'}        → 草稿统计
 * POST {action:'logs'}         → 运行日志
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAutopilotConfig, saveAutopilotConfig, runAutopilot, getAutopilotLogs, ALL_AUTOPILOT_TYPES } from "@/lib/ai/autopilot";
import { listDynamicTypes } from "@/lib/content-types/dynamic";
import { isPluginEnabled } from "@/lib/plugins/store";
import { aiCapabilityEnabled } from "@/lib/ai/gateway";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// 静态内容类型（全类型支持）
const STATIC_TYPES = [
  { name: "products", label: "产品管理" },
  { name: "news", label: "新闻管理" },
  { name: "services", label: "服务内容" },
  { name: "industries", label: "行业方案" },
  { name: "case", label: "成功案例" },
  { name: "faq", label: "常见问题" },
];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const cfg = await getAutopilotConfig();
    const dynTypes = (await listDynamicTypes()).map((t) => ({ name: t.name, label: t.label }));
    const logs = await getAutopilotLogs(30);
    // 动态类型草稿数
    const dynCounts = await prisma.dynamicContent.groupBy({ by: ["type", "status"], _count: { id: true } });
    // 静态类型草稿数
    const statCounts: Record<string, number> = {};
    for (const t of STATIC_TYPES) {
      try {
        const { getContentType } = await import("@/lib/content-types/registry");
        const { contentService } = await import("@/lib/content-types/service");
        const cfgType = getContentType(t.name);
        if (!cfgType?.enableStatus) continue;
        const items = await contentService.list(t.name, { all: true, status: "draft" });
        statCounts[t.name] = Array.isArray(items) ? items.length : 0;
      } catch { /* ignore */ }
    }
    return NextResponse.json({ ok: true, cfg, dynTypes, statTypes: STATIC_TYPES, statCounts, dynCounts, logs, allTypes: [...STATIC_TYPES.map(t => t.name), ...dynTypes.map(t => t.name)] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "读取失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const action = body?.action || "";

    if (action === "save") {
      const cfg = await saveAutopilotConfig({
        types: Array.isArray(body.types) ? body.types.map(String) : body.type ? [String(body.type)] : undefined,
        targetLangs: Array.isArray(body.targetLangs) ? body.targetLangs.map(String) : [],
        autoPublish: !!body.autoPublish,
        maxPerRun: Number(body.maxPerRun) || 5,
        schedule: String(body.schedule || ""),
        scheduleEnabled: !!body.scheduleEnabled,
      });
      return NextResponse.json({ ok: true, cfg });
    }

    if (action === "logs") {
      const logs = await getAutopilotLogs(Number(body.limit) || 30);
      return NextResponse.json({ ok: true, logs });
    }

    if (action === "run") {
      const pluginOn = await isPluginEnabled("ai-autopilot");
      const globalOn = await aiCapabilityEnabled();
      if (!pluginOn || !globalOn) {
        return NextResponse.json(
          { ok: false, error: "自动运营未开启：需在 插件管理 启用 AI 自动运营 插件，且 系统设置 → AI 开关矩阵 中开启全局 AI" },
          { status: 403 }
        );
      }
      const overrides: any = {};
      if (Array.isArray(body.types)) overrides.types = body.types.map(String);
      if (Array.isArray(body.targetLangs)) overrides.targetLangs = body.targetLangs.map(String);
      if (typeof body.autoPublish === "boolean") overrides.autoPublish = body.autoPublish;
      if (body.maxPerRun) overrides.maxPerRun = Number(body.maxPerRun);
      const result = await runAutopilot(overrides);
      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ ok: false, error: "未知 action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "操作失败" }, { status: 500 });
  }
}
