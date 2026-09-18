import { NextResponse } from "next/server";
import { requestPriceCode } from "@/lib/server/price-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 价格查看：发送邮箱验证码 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const r = await requestPriceCode(email);
  if (!r.ok) return NextResponse.json({ ok: false, message: r.message }, { status: 429 });
  // devMode 下回传验证码便于本地联调
  return NextResponse.json({ ok: true, devMode: r.devMode || false, code: r.code, message: r.message });
}
