import { NextResponse } from "next/server";
import { getBrandInfo, brandLetterhead, brandSubjectPrefix } from '@/lib/server/brand';
import { prisma } from "@/lib/prisma";
import { verifyPriceCode, sendQuoteEmail } from "@/lib/server/price-verify";
import { parsePricingConfig, applyDiscount, formatPrice } from "@/lib/pricing";
import { verifyMemberToken, memberTokenFromRequest } from "@/lib/member-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 价格查看：邮箱验证码确认
 * - emailVerify 模式：验证通过 → { ok, verified: true }（前端标记后显示价格）
 * - emailQuote 模式：验证通过 → 生成该产品/询价车报价明细 → 发送到邮箱 → { ok, sent: true }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const code = String(body.code || "").trim();
  const productId = body.productId ? String(body.productId) : null;

  const r = await verifyPriceCode(email, code);
  if (!r.ok) return NextResponse.json({ ok: false, message: r.message }, { status: 400 });

  const cfg = await prisma.siteConfig.findUnique({ where: { configKey: "pricing_config" } });
  const { mode } = parsePricingConfig(cfg?.configValue);
  const brand = await getBrandInfo();

  if (mode === "emailQuote") {
    // 发送报价到邮箱：单个产品价格明细
    let html = "";
    if (productId) {
      const p = await prisma.product.findFirst({ where: { OR: [{ slug: String(productId) }, { id: /^\d+$/.test(String(productId)) ? BigInt(productId) : BigInt(-1) }] } });
      if (!p) return NextResponse.json({ ok: false, message: "产品不存在" }, { status: 404 });
      const price = p.price ? Number(p.price) : null;
      // 会员折扣（若有登录态）
      let typeDiscount = 0, levelDiscount = 0;
      const token = memberTokenFromRequest(req);
      if (token) {
        const tokenPayload = verifyMemberToken(token);
        if (tokenPayload) {
          const member = await prisma.member.findUnique({ where: { id: BigInt(tokenPayload.mid) } });
          if (member && member.status === "active") {
            const ct = await prisma.customerType.findUnique({ where: { key: member.customerType } });
            const lv = await prisma.memberLevel.findUnique({ where: { key: member.level } });
            typeDiscount = ct?.discount || 0;
            levelDiscount = lv?.discount || 0;
          }
        }
      }
      const finalPrice = price !== null ? applyDiscount(price, typeDiscount, levelDiscount) : null;
      html = `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:20px 24px;"><span style="color:#fff;font-size:18px;font-weight:bold;">${brandLetterhead(brand)}</span></div>
          <div style="padding:28px 24px;color:#333;">
            <p style="margin:0 0 16px;">您好，您申请的产品报价如下：</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="background:#f8f8f8;"><td style="padding:10px 12px;border:1px solid #eee;width:100px;">产品型号</td><td style="padding:10px 12px;border:1px solid #eee;">${p.model}</td></tr>
              <tr><td style="padding:10px 12px;border:1px solid #eee;">产品名称</td><td style="padding:10px 12px;border:1px solid #eee;">${p.name}</td></tr>
              <tr style="background:#f8f8f8;"><td style="padding:10px 12px;border:1px solid #eee;">参考价格</td><td style="padding:10px 12px;border:1px solid #eee;">${price !== null ? formatPrice(finalPrice) : "面议（请提交询价获取正式报价）"}</td></tr>
              <tr><td style="padding:10px 12px;border:1px solid #eee;">说明</td><td style="padding:10px 12px;border:1px solid #eee;">${typeDiscount || levelDiscount ? `已含客户折扣 ${Math.max(typeDiscount, levelDiscount)}%` : "具体报价以正式报价单为准"}</td></tr>
            </table>
            <p style="margin:20px 0 0;font-size:12px;color:#999;">如需正式报价或了解更多产品，欢迎回复本邮件或通过官网提交询价。</p>
          </div>
        </div>`;
      const sent = await sendQuoteEmail({ email, subject: `${brand.name}报价 - ${p.model}`, html });
      if (!sent.ok) return NextResponse.json({ ok: false, message: sent.message }, { status: 500 });
      return NextResponse.json({ ok: true, sent: true, message: "报价已发送到您的邮箱" });
    }
    // 无产品 ID：发送通用报价邀请
    html = `
      <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        <div style="background:#CC0000;padding:20px 24px;"><span style="color:#fff;font-size:18px;font-weight:bold;">${brandLetterhead(brand)}</span></div>
        <div style="padding:28px 24px;color:#333;">
          <p>您好，感谢您的关注！请通过官网提交询价单，我们的销售工程师将在 1 个工作日内为您提供正式报价。</p>
          <p><a href="/quote/cart" style="color:#CC0000;">前往询价车 →</a></p>
        </div>
      </div>`;
    const sent = await sendQuoteEmail({ email, subject: `${brandSubjectPrefix(brand)}报价获取`, html });
    if (!sent.ok) return NextResponse.json({ ok: false, message: sent.message }, { status: 500 });
    return NextResponse.json({ ok: true, sent: true, message: "报价指引已发送到您的邮箱" });
  }

  // emailVerify 等模式：验证通过即返回 verified
  return NextResponse.json({ ok: true, verified: true, message: "验证通过" });
}
