/**
 * 对外 API 网关（Plugin API Gateway）
 * =====================================================
 * 第三方/外部系统通过 REST 调用「对外公开」的插件能力，统一鉴权/限流/审计。
 * - 调用：POST /api/integration/[capability]   Header: X-API-Key: <key>
 * - body：{ args?: any }（透传给能力 handler，args 中可带 optKey 覆盖能力配置）
 * - 只允许调用 registerCapability(..., { public: true }) 的能力（当前：seo.push）
 * - 限流：每 key 每分钟 60 次（内存计数）
 * 审计：调用记录写入 data/gateway-audit.jsonl（追加，含时间/key/能力/IP/结果）
 */
import { NextRequest, NextResponse } from "next/server";
import { isPublicCapability, callCapability, listCapabilities } from "@/lib/plugins/capabilities";
import { verifyGatewayKey, chargeGatewayKey } from "@/lib/plugins/gateway-store";
import { computeGatewayCost } from "@/lib/plugins/pricing";
import { ensurePlugins } from "@/lib/plugins/ensure";
import { getClientIp } from "@/lib/rate-limit";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// 确保能力已注册
ensurePlugins();

// 每 key 每分钟限流
const RATE_LIMIT = 60;
const rateMap = new Map<string, { count: number; reset: number }>();

function audit(entry: Record<string, any>): void {
  try {
    const dir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "gateway-audit.jsonl"), JSON.stringify(entry) + "\n", "utf8");
  } catch (e) {
    console.error("[gateway] 审计写入失败:", e);
  }
}

/** GET：列出可对外调用的能力（无需鉴权，用于发现） */
export async function GET() {
  const caps = listCapabilities().filter((c) => c.public);
  return NextResponse.json({
    ok: true,
    base: "/api/integration/[capability]",
    header: "X-API-Key",
    body: '{ "args": {...} }',
    capabilities: caps.map((c) => c.name),
  });
}

/** POST：调用公开能力 */
export async function POST(req: NextRequest, { params }: { params: { capability: string } }) {
  const capability = params.capability;
  const apiKey = req.headers.get("x-api-key") || "";

  // 1. 鉴权
  const valid = await verifyGatewayKey(apiKey);
  if (!valid) {
    audit({ time: new Date().toISOString(), capability, ip: getClientIp(req), key: apiKey.slice(-6), result: "401" });
    return NextResponse.json({ ok: false, error: "API Key 无效" }, { status: 401 });
  }

  // 2. 限流（每 key 每分钟）
  const now = Date.now();
  const slot = rateMap.get(apiKey);
  if (!slot || now > slot.reset) {
    rateMap.set(apiKey, { count: 1, reset: now + 60_000 });
  } else if (slot.count >= RATE_LIMIT) {
    audit({ time: new Date().toISOString(), capability, ip: getClientIp(req), key: apiKey.slice(-6), result: "429" });
    return NextResponse.json({ ok: false, error: "请求过于频繁，请稍后再试" }, { status: 429 });
  } else {
    slot.count += 1;
  }

  // 3. 能力校验（仅公开能力可对外调用）
  if (!isPublicCapability(capability)) {
    audit({ time: new Date().toISOString(), capability, ip: getClientIp(req), key: apiKey.slice(-6), result: "404" });
    return NextResponse.json({ ok: false, error: `能力 ${capability} 不存在或未对外开放` }, { status: 404 });
  }

  // 4. 执行 + 计费
  try {
    let args: any = {};
    try {
      const body = await req.json();
      args = body?.args || {};
    } catch {
      /* 空 body 视为无参数 */
    }
    // 4a. 计算积分成本
    const cost = computeGatewayCost(capability, args);
    // 4b. 预扣费（余额不足返回 402）
    if (cost.credits > 0) {
      const charged = await chargeGatewayKey(apiKey, cost.credits);
      if (!charged.ok) {
        audit({ time: new Date().toISOString(), capability, ip: getClientIp(req), key: apiKey.slice(-6), result: "402", credits: cost.credits, note: "余额不足" });
        return NextResponse.json(
          { ok: false, error: "API 积分余额不足，请充值", required: cost.credits, balance: charged.balance },
          { status: 402 }
        );
      }
    }
    const result = await callCapability(capability, args, { apiKey });
    audit({ time: new Date().toISOString(), capability, ip: getClientIp(req), key: apiKey.slice(-6), result: "ok", credits: cost.credits, note: cost.note });
    return NextResponse.json({ ok: true, capability, result, billing: { credits: cost.credits, note: cost.note } });
  } catch (err: any) {
    audit({ time: new Date().toISOString(), capability, ip: getClientIp(req), key: apiKey.slice(-6), result: "error:" + (err?.message || "unknown") });
    return NextResponse.json({ ok: false, error: err?.message || "调用失败" }, { status: 500 });
  }
}
