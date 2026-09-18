import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateQuotePdf } from "@/lib/quote-pdf";
import { hasQuoteAccess, canDownloadQuotePdf } from "@/lib/quote-access";
import { memberTokenFromRequest, verifyMemberToken } from "@/lib/member-token";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * 报价单 PDF 导出（前台询价成功页/后台报价单详情下载/模板预览共用）
 * POST { quoteNo } → application/pdf；POST { preview: true, template? } → 模板预览示例 PDF
 *
 * 🔒 2026-09-16 安全修复（未授权下载 PII/报价）：
 *   原实现无 auth()、不校验 reviewStatus，且报价单号当日连续自增 ⇒ 任何人可顺序遍历
 *   下载全部客户报价单（含公司/联系人/电话/邮箱/需求与价格）。
 *
 *   **现行放行判据（唯一真源：lib/quote-access.ts 的 canDownloadQuotePdf）**三选一：
 *   ① 后台已登录会话；② 本次提交者票据（HMAC 签名 cookie zw_quote_access，绑定具体报价单号）；
 *   ③ 会员本人归属（会员 token 的 mid == 该报价单的 QuoteRequest.memberId）。
 *   三者皆不满足一律 **404**（用 404 而非 403，避免确认报价单是否存在）。
 *   预览分支：必须为后台已登录会话（原为任意匿名可触发）。
 *   未登录调用按 IP 限流 10 次/10 分钟，拖慢顺序遍历。
 *
 *   ⚠️ 2026-09-16 第三轮：**已删除裸 reviewStatus === 'approved' 放行分支** ——
 *   它是「匿名只凭单号即可遍历下载已通过报价单」的口子。需要下载的单据现在必须能证明
 *   「后台 / 提交者 / 归属会员」三者之一；审核状态不再参与放行判定。
 */

const notFound = () => NextResponse.json({ error: "报价单不存在" }, { status: 404 });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = Boolean(session?.user);

    // 后台已登录不参与限流（模板/报价单反复预览属正常操作）；匿名调用限流 10 次/10 分钟
    if (!isAdmin) {
      const gate = checkRateLimit("quote-pdf", getClientIp(req), 10, 10 * 60 * 1000);
      if (!gate.ok) {
        return NextResponse.json(
          { error: `操作过于频繁，请 ${gate.retryAfter} 秒后再试` },
          { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const isPreview = body?.preview === true;
    let quoteNo = String(body?.quoteNo || "").trim();
    let quote: any;
    if (isPreview) {
      // 🔒 模板预览含自定义模板内容与任意 PDF 生成能力，仅后台登录会话可用
      if (!isAdmin) return notFound();
      quoteNo = `QT-PREVIEW-${String(Date.now()).slice(-6)}`;
      quote = {
        quoteNo,
        company: "示例公司（模板预览）",
        name: "张先生",
        phone: "138-0000-0000",
        email: "demo@example.com",
        message: "这是报价单模板预览，用于确认排版与样式。",
        items: [
          { name: "示例产品一", model: "MODEL-A1", qty: 1, unit: "台", priceMin: 150000, priceMax: 180000 },
          { name: "示例产品二", model: "MODEL-B2", qty: 2, unit: "台", priceMin: 80000, priceMax: 120000 },
        ],
        totalMin: 310000,
        totalMax: 390000,
        createdAt: new Date(),
        locale: typeof body?.locale === "string" ? body.locale : "zh",
        options: [
          { key: "turnkey", label: "交钥匙工程", checked: true },
          { key: "training", label: "工艺培训包", checked: true },
        ],
      };
    } else {
      if (!quoteNo) {
        return NextResponse.json({ error: "报价单号必填" }, { status: 400 });
      }
      quote = await prisma.quoteRequest.findUnique({ where: { quoteNo } });
      // 🔒 放行判据唯一真源：lib/quote-access.ts 的 canDownloadQuotePdf
      //    三选一：① 后台会话 ② 本次提交者票据 ③ 会员本人归属（token.mid == quote.memberId）
      //    ⚠️ 已删除裸 reviewStatus === 'approved' 分支（匿名可遍历下载的口子）。
      //    会员 token 复用 lib/member-token.ts 既有函数验签，不另造一套。
      const requestMemberId = (() => {
        try {
          const payload = verifyMemberToken(memberTokenFromRequest(req));
          return payload?.mid ? String(payload.mid) : null;
        } catch {
          return null;
        }
      })();
      const allowed = quote
        ? canDownloadQuotePdf({
            isAdmin,
            hasSubmitterTicket: hasQuoteAccess(req, quoteNo),
            requestMemberId,
            quoteMemberId: quote.memberId,
          })
        : false;
      // 404 而非 403：既不在未登录时泄露客户 PII，也不确认单号是否存在
      if (!allowed) return notFound();
    }

    // 预览模式：可用 body.template 覆盖模板（未保存实时预览）
    const pdf = await generateQuotePdf({
      quote,
      tpl: isPreview && body?.template && typeof body.template === "object" ? body.template : undefined,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quoteNo}.pdf"; filename*=UTF-8''${encodeURIComponent(quoteNo)}.pdf`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[报价PDF] 生成失败：", error);
    return NextResponse.json({ error: error?.message || "生成失败" }, { status: 500 });
  }
}
