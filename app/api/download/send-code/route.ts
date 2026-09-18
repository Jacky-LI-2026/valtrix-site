import { NextResponse } from "next/server";
import { getClientIp as rlIp, checkRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { requestVerificationCode } from "@/lib/server/verification";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/download/send-code
 * body: { email }
 * 生成 6 位验证码并发送邮件；未配置 SMTP 时进入开发模式（验证码打印到控制台，
 * 并仅在开发环境下回传 code 便于本地联调）。
 */
export async function POST(req: Request) {
  const rlIpAddr = rlIp(req);
  const rl = checkRateLimit("send_code", rlIpAddr, 5, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: "请输入有效的邮箱地址" }, { status: 400 });
  }

  const result = await requestVerificationCode(email);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
