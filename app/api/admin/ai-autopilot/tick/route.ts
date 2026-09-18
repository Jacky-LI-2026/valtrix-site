/**
 * AI 自动运营 · 内部定时 tick
 * 由自定义 server（server.js）每分钟调用一次。校验内部密钥后按配置 cron 到点触发一轮运行。
 */
import { NextRequest, NextResponse } from "next/server";
import { autopilotScheduleTick } from "@/lib/ai/autopilot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  // 🔴 2026-09-15 安全修复：此前兜底写成常量 `"zuowen-internal-tick"`（**还带别家品牌名**）。
  //    若生产未配置该环境变量，就等于把触发密钥**公开成一个已知常量** ——
  //    任何人带 `x-internal-secret: <该常量>` 就能触发 AI 自动运营。
  //    现改为**必须显式配置**：未配置时**拒绝服务（fail-closed）**，绝不退化成可猜的常量。
  const expected = process.env.AUTOPILOT_TICK_SECRET;
  if (!expected) {
    console.error("[autopilot/tick] 未配置 AUTOPILOT_TICK_SECRET，已拒绝内部 tick 请求（fail-closed）");
    return NextResponse.json({ ok: false, error: "internal secret not configured" }, { status: 503 });
  }
  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    const ran = await autopilotScheduleTick();
    return NextResponse.json({ ok: true, ran });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
