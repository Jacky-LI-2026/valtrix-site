/**
 * 对外 API 网关管理（Admin API Gateway）
 * =====================================================
 * 后台管理：密钥列表/创建/吊销/充值，调用用量（审计聚合），能力单价展示与调整。
 * 路由：
 *  - GET  /api/admin/gateway              → { keys, usage, pricing }
 *  - POST /api/admin/gateway              → 创建 key { name, balance? }
 *  - POST /api/admin/gateway?action=charge→ 充值 { key, balance }
 *  - POST /api/admin/gateway?action=revoke→ 吊销 { key }
 *  - POST /api/admin/gateway?action=pricing→ 调整单价 { capability, credits, perChar?, note? }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  listGatewayKeys,
  createGatewayKey,
  revokeGatewayKey,
  setGatewayKeyBalance,
} from "@/lib/plugins/gateway-store";
import { listPricing, setGatewayPricing, PricingRule } from "@/lib/plugins/pricing";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const USAGE_CONFIG = "plugin_api_usage";

/** 读取审计日志并聚合成按 key 的用量（最近 1000 条） */
function aggregateAudit(): Record<string, { calls: number; credits: number; last: string }> {
  const fs = require("fs");
  const path = require("path");
  const file = path.join(process.cwd(), "data", "gateway-audit.jsonl");
  const agg: Record<string, { calls: number; credits: number; last: string }> = {};
  try {
    if (!fs.existsSync(file)) return agg;
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).slice(-1000);
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        const k = (e.key || "?").padStart(6, "*");
        const a = (agg[k] = agg[k] || { calls: 0, credits: 0, last: "" });
        a.calls += 1;
        a.credits += Number(e.credits || 0);
        if (e.time > a.last) a.last = e.time;
      } catch { /* 忽略坏行 */ }
    }
  } catch { /* 忽略 */ }
  return agg;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  // 从 DB 加载自定义单价（若有）覆盖默认
  try {
    const cfg = await prisma.siteConfig.findUnique({ where: { configKey: "plugin_api_pricing" } });
    if (cfg?.configValue) setGatewayPricing(cfg.configValue as any);
  } catch { /* 忽略 */ }
  const keys = await listGatewayKeys();
  const usage = aggregateAudit();
  const pricing = listPricing();
  return NextResponse.json({ ok: true, keys, usage, pricing });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  let body: any = {};
  try { body = await req.json(); } catch { /* 空 body */ }
  const action = new URL(req.url).searchParams.get("action") || "create";

  try {
    if (action === "create") {
      const bal = body?.balance === null || body?.balance === undefined || body?.balance === "" ? undefined : Number(body.balance);
      const key = await createGatewayKey(String(body?.name || "未命名"), bal);
      return NextResponse.json({ ok: true, key });
    }
    if (action === "charge") {
      // null / 空 / undefined → 不限余额；数字 → 设置余额
      const bal = body?.balance === null || body?.balance === undefined || body?.balance === "" ? null : Number(body.balance);
      const ok = await setGatewayKeyBalance(String(body?.key || ""), bal);
      return NextResponse.json({ ok, error: ok ? undefined : "key 不存在" });
    }
    if (action === "revoke") {
      const ok = await revokeGatewayKey(String(body?.key || ""));
      return NextResponse.json({ ok, error: ok ? undefined : "key 不存在" });
    }
    if (action === "pricing") {
      // 读取当前自定义价并覆盖某项（写回 site_config）
      const cap = String(body?.capability || "");
      if (!cap) return NextResponse.json({ ok: false, error: "缺少 capability" });
      const current = await listPricing();
      const next: Record<string, PricingRule> = {};
      // 保留默认价作基底，覆盖目标项
      const defaults: Record<string, PricingRule> = {
        "translate.text": { credits: 1, perChar: 0.01, note: "按次1积分 + 每100字符1积分" },
        "ai.text": { credits: 10, note: "按次10积分" },
        "mail.send": { credits: 1, note: "按封1积分" },
        "seo.push": { credits: 5, note: "按次5积分" },
      };
      Object.assign(next, defaults, current && typeof current === "object" ? Object.fromEntries(Object.entries(current).map(([k, v]) => [k, (v as any).rule])) : {});
      next[cap] = {
        credits: Number(body?.credits ?? defaults[cap]?.credits ?? 1),
        perChar: body?.perChar !== undefined ? Number(body.perChar) : defaults[cap]?.perChar,
        note: String(body?.note || defaults[cap]?.note || ""),
      };
      await prisma.siteConfig.upsert({
        where: { configKey: "plugin_api_pricing" },
        update: { configValue: next as any },
        create: { configKey: "plugin_api_pricing", configValue: next as any },
      });
      setGatewayPricing(next);
      return NextResponse.json({ ok: true, pricing: next });
    }
    return NextResponse.json({ ok: false, error: "未知 action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "操作失败" }, { status: 500 });
  }
}
