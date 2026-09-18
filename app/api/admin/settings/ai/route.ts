import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEYS = [
  "enabled", "name", "nameEn", "nameJa", "nameKo", "nameFr", "nameAr",
  "welcome", "welcomeEn", "welcomeJa", "welcomeKo", "welcomeFr", "welcomeAr",
  "apiKey", "baseUrl", "model", "maxTurns",
];

// Prisma Json 字段读出可能是对象或字符串，统一转对象
function parseConfigValue(v: unknown): any {
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return (v as any) || {};
}

/** GET /api/admin/settings/ai — 读取 AI 客服配置（apiKey 脱敏） */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  let cfg: any = {};
  try {
    const db = await prisma.siteConfig.findUnique({ where: { configKey: "ai_chat_config" } });
    if (db) cfg = parseConfigValue(db.configValue);
  } catch (e) {
    console.error("读取 AI 客服配置失败:", e);
  }
  const out: any = { ...cfg, apiKey: cfg.apiKey ? "******" : "" };
  return NextResponse.json({ ok: true, config: out });
}

/** POST /api/admin/settings/ai — 保存配置（apiKey 留空/****** = 保留原值） */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  let current: any = {};
  try {
    const db = await prisma.siteConfig.findUnique({ where: { configKey: "ai_chat_config" } });
    if (db) current = parseConfigValue(db.configValue);
  } catch (e) {}

  const next: any = { ...current };
  for (const k of KEYS) {
    if (body[k] === undefined) continue;
    if (k === "enabled") next.enabled = body[k] === true || body[k] === "true" || body[k] === 1 || body[k] === "1";
    else if (k === "maxTurns") next.maxTurns = Math.max(1, Math.min(20, Number(body[k]) || 8));
    else if (k === "apiKey") {
      const v = String(body[k] || "").trim();
      if (v && v !== "******") next.apiKey = v;
    } else {
      next[k] = String(body[k] ?? "").trim();
    }
  }

  await prisma.siteConfig.upsert({
    where: { configKey: "ai_chat_config" },
    update: { configValue: next },
    create: { configKey: "ai_chat_config", configValue: next },
  });

  return NextResponse.json({ ok: true, message: "AI 客服配置已保存" });
}
