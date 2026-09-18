import { NextRequest, NextResponse } from "next/server";
import { getClientIp as rlIp, checkRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { encodeEmailToken, decodeEmailToken } from "@/lib/email-token";

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/**
 * 公开订阅接口
 * POST {email, name?, source?} → 订阅/重新激活
 * POST {action:'unsubscribe', token} 或 DELETE {token} → 退订
 */
export async function POST(req: NextRequest) {
  const rlIpAddr = rlIp(req);
  const rl = checkRateLimit("subscribe", rlIpAddr, 5, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  try {
    const body = await req.json();
    const { action } = body;

    // 退订
    if (action === "unsubscribe") {
      const token = String(body.token || "");
      const email = decodeEmailToken(token);
      if (!email) return NextResponse.json({ error: "无效的退订链接" }, { status: 400 });
      await prisma.emailSubscriber.updateMany({
        where: { email },
        data: { status: "unsubscribed", unsubscribedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    // 订阅
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim().slice(0, 100);
    const source = String(body.source || "").trim().slice(0, 100);
    if (!isValidEmail(email)) return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });

    const exist = await prisma.emailSubscriber.findUnique({ where: { email } });
    let sub;
    if (exist) {
      sub = await prisma.emailSubscriber.update({
        where: { email },
        data: {
          status: "active",
          name: name || exist.name,
          source: source || exist.source,
          unsubscribedAt: null,
        },
      });
    } else {
      sub = await prisma.emailSubscriber.create({
        data: { email, name: name || null, source: source || null, status: "active" },
      });
    }
    return NextResponse.json(serializeBigInt(sub));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
