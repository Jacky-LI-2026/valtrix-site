import { NextRequest, NextResponse } from "next/server";
import { getBrandInfo } from '@/lib/server/brand';
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";
import nodemailer from "nodemailer";
import { getSmtpConfig, isSmtpConfigured } from "@/lib/server/smtp-config";
import { generateQuotePdf } from "@/lib/quote-pdf";

/** 审核通过后：将报价单 PDF 作为附件发送到客户邮箱（SMTP 已配置时） */
async function sendApprovalPdf(quote: any): Promise<void> {
  try {
    if (!(await isSmtpConfigured())) {
      console.log("[报价审核] 未配置 SMTP，跳过邮件，报价单已通过审核");
      return;
    }
    const cfg = await getSmtpConfig();
    const brand = await getBrandInfo();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    const from = cfg.from || cfg.user;
    const fromName = cfg.fromName || brand.name;
    // 生成报价单 PDF（当前模板）
    const pdf = await generateQuotePdf({ quote });
    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: quote.email || "",
      subject: `【${fromName}】报价单 ${quote.quoteNo} 已确认`,
      html: `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:18px 24px;">
            <span style="color:#fff;font-size:16px;font-weight:bold;">${fromName} — 报价单已确认</span>
          </div>
          <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
            <p style="margin:0 0 12px;">${quote.name || "您好"}，您提交的报价询价已完成审核，报价单已生成，请查收附件（PDF）。</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;width:110px;">报价单号</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;"><b>${quote.quoteNo}</b></td></tr>
              ${quote.company ? `<tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">公司</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${quote.company}</td></tr>` : ""}
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">产品数量</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${Array.isArray(quote.items) ? quote.items.length : 0} 项</td></tr>
            </table>
            <p style="margin:0 0 16px;">如需进一步沟通或有任何疑问，欢迎随时与我们联系。感谢您的信任！</p>
            <p style="margin:0;color:#999;font-size:12px;">此邮件由系统自动发送，请勿直接回复。</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `${quote.quoteNo}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });
    console.log("[报价审核] 报价单 PDF 已发送至客户邮箱", quote.quoteNo, quote.email);
  } catch (e) {
    console.error("[报价审核] 报价单邮件发送失败：", (e as Error).message);
  }
}

// 更新报价单状态/审核/人工修改报价
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });

  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const {
      status,
      notes,
      reviewStatus,
      items,
      totalMin,
      totalMax,
      currency,
      message,
    } = body;
    const data: any = {};
    if (status && ["new", "processing", "deal", "closed"].includes(status)) data.status = status;
    if (notes !== undefined) data.notes = notes === "" ? null : String(notes);
    // 审核：通过/驳回，自动记录审核人/审核时间
    if (reviewStatus && ["pending", "approved", "rejected"].includes(reviewStatus)) {
      data.reviewStatus = reviewStatus;
      data.reviewedAt = new Date();
      data.reviewedBy = (session as any).user?.name || (session as any).user?.email || "";
    }
    // 人工修改报价：明细（items: [{model,name,qty,unit,priceMin,priceMax}]）与总价区间
    if (items !== undefined && Array.isArray(items)) {
      data.items = items.map((it: any) => ({
        id: String(it.id ?? ""),
        model: String(it.model ?? ""),
        name: String(it.name ?? ""),
        qty: Number(it.qty ?? 1),
        unit: String(it.unit ?? "台"),
        priceMin: it.priceMin != null && it.priceMin !== "" ? Number(it.priceMin) : null,
        priceMax: it.priceMax != null && it.priceMax !== "" ? Number(it.priceMax) : null,
      }));
    }
    if (totalMin !== undefined) data.totalMin = totalMin === null || totalMin === "" ? null : Number(totalMin);
    if (totalMax !== undefined) data.totalMax = totalMax === null || totalMax === "" ? null : Number(totalMax);
    if (currency !== undefined) data.currency = String(currency || "CNY");
    if (message !== undefined) data.message = String(message);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "没有可更新字段" }, { status: 400 });
    }
    const quote = await prisma.quoteRequest.update({
      where: { id },
      data,
    });
    // 审核通过 → 异步发送报价单 PDF 到客户邮箱（不阻塞响应）
    if (reviewStatus === "approved" && quote.email) {
      sendApprovalPdf(quote);
    }
    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        ...quote,
        totalMin: quote.totalMin ? Number(quote.totalMin) : null,
        totalMax: quote.totalMax ? Number(quote.totalMax) : null,
      }),
    });
  } catch (error: any) {
    console.error("更新报价单失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除报价单
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });

  try {
    const id = BigInt(params.id);
    await prisma.quoteRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("删除报价单失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
