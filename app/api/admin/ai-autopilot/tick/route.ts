/**
 * AI 自动运营 · 内部定时 tick
 * 由自定义 server（server.js）每分钟调用一次。校验内部密钥后按配置 cron 到点触发一轮运行。
 */
import { NextRequest, NextResponse } from "next/server";
import { autopilotScheduleTick } from "@/lib/ai/autopilot";

export const dynamic = "force-dynamic";

/**
 * 🔴 2026-09-15 安全修复（fail-closed）
 * =====================================================
 * 此前本文件接受「`AUTOPILOT_TICK_SECRET` 未配置时的兜底常量」以及一组"历史常量"。
 * 但那两种值**都是写在仓库里、可被任何人读到的常量**，而实测**两台生产服务器均未配置
 * `AUTOPILOT_TICK_SECRET`** ⇒ 那个常量事实上就是**公开的触发密钥**：任何人只要带
 * `x-internal-secret: <该常量>` 就能触发 AI 自动运营。
 *
 * 现改为**必须显式配置**：未配置时**拒绝服务**（503），且**不再接受任何常量/历史值**
 * ——「兜底成可猜的常量」比「功能暂时不可用」危险得多。
 * 配置方式：服务器 `.env` 加一行 `AUTOPILOT_TICK_SECRET=<强随机值>` 后重启。
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  const expected = process.env.AUTOPILOT_TICK_SECRET;
  if (!expected) {
    console.error("[autopilot/tick] 未配置 AUTOPILOT_TICK_SECRET，已拒绝内部 tick 请求（fail-closed）");
    return NextResponse.json({ ok: false, error: "internal secret not configured" }, { status: 503 });
  }
  if (!secret || secret !== expected) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    const ran = await autopilotScheduleTick();
    return NextResponse.json({ ok: true, ran });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
