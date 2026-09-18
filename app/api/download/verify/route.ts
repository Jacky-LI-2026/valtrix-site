import { NextResponse } from "next/server";
import { getClientIp as rlIp, checkRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { verifyCodeAndRecordLead } from "@/lib/server/verification";

export const runtime = "nodejs";

/**
 * POST /api/download/verify
 * body: { email, code, name, company, phone, resourceName?, downloadUrl? }
 * 校验邮箱验证码；验证通过后记录留资信息（公司/个人、手机号、邮箱等）。
 */
export async function POST(req: Request) {
  const rlIpAddr = rlIp(req);
  const rl = checkRateLimit("verify_code", rlIpAddr, 5, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  const company = String(body.company || "").trim();
  const phone = String(body.phone || "").trim();
  const resourceName = String(body.resourceName || "").trim();
  const downloadUrl = String(body.downloadUrl || "").trim();

  if (!email || !code) {
    return NextResponse.json({ ok: false, message: "参数不完整" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, message: "验证码为 6 位数字" }, { status: 400 });
  }

  const result = await verifyCodeAndRecordLead({
    email,
    code,
    name,
    company,
    phone,
    resourceName,
    downloadUrl,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
