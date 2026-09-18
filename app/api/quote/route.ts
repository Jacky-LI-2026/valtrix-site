import { NextRequest, NextResponse } from "next/server";
import { getBrandInfo } from '@/lib/server/brand';
import { getClientIp as rlIp, checkRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { getClientIp, getLocationFields } from '@/lib/geo'
import { getCompanyVerifyConfig, isChineseCompanyName, verifyChineseCompany } from '@/lib/company-verify'
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { memberTokenFromRequest, verifyMemberToken } from "@/lib/member-token";
import nodemailer from "nodemailer";
import { getSmtpConfig, isSmtpConfigured } from "@/lib/server/smtp-config";
import { generateQuotePdf } from "@/lib/quote-pdf";
import { quoteAccessSetCookie } from "@/lib/quote-access";

// 自动报价回执：询价提交后自动生成报价单 PDF 并发送到客户邮箱（后台可配置开关 autoQuoteReply）
async function notifyQuoteToCustomer(q: any, totalText: string): Promise<void> {
  try {
    if (!q?.email) {
      console.log("[报价] 客户未填邮箱，跳过自动报价回执");
      return;
    }
    if (!(await isSmtpConfigured())) {
      console.log("[报价] 未配置 SMTP，跳过自动报价回执");
      return;
    }
    // 开关：site_config.autoQuoteReply（默认开启；值可为 boolean 或 {enabled:boolean}）
    try {
      const ac = await prisma.siteConfig.findUnique({ where: { configKey: "autoQuoteReply" } });
      if (ac) {
        const v = ac.configValue as any;
        const enabled = typeof v === "boolean" ? v : typeof v === "object" && v !== null ? v.enabled !== false : true;
        if (!enabled) {
          console.log("[报价] autoQuoteReply 已关闭，跳过自动报价回执");
          return;
        }
      }
    } catch { /* 默认开启 */ }

    const cfg = await getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    const from = cfg.from || cfg.user;
    const fromName = cfg.fromName || "企业官网";

    // 报价单 PDF
    let pdf: Buffer | null = null;
    try {
      const quoteForPdf = {
        ...q,
        items: (q.items || []).map((it: any) => ({
          name: it.name || "",
          nameEn: it.nameEn || "",
          model: it.model || "",
          qty: it.qty || 1,
          unit: it.unit || "台",
          priceMin: it.priceMin ?? null,
          priceMax: it.priceMax ?? null,
          priceRange: it.priceRange || "面议",
        })),
        totalMin: q.totalMin ?? null,
        totalMax: q.totalMax ?? null,
        locale: q.locale || "zh",
      };
      pdf = await generateQuotePdf({ quote: quoteForPdf });
    } catch (e: any) {
      console.error("[报价] 自动报价 PDF 生成失败（继续发 HTML 邮件）:", e?.message);
    }

    const isZh = String(q.locale || "zh").startsWith("zh");
    const itemsHtml = (q.items || [])
      .map(
        (it: any) =>
          `<tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${isZh ? it.name || "" : it.nameEn || it.name || ""}（${it.model || "-"}）</td>` +
          `<td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:center;">${it.qty}</td>` +
          `<td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">${it.priceRange || "面议"}</td></tr>`
      )
      .join("");

    const subject = isZh
      ? `【自动报价】${q.quoteNo} 报价单已生成`
      : `[Auto Quote] Quotation ${q.quoteNo}`;

    const html = isZh
      ? `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:18px 24px;"><span style="color:#fff;font-size:16px;font-weight:bold;">${fromName} · 自动报价单</span></div>
          <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
            <p style="margin:0 0 12px;">${q.name || ""}，您好！</p>
            <p style="margin:0 0 12px;">感谢您通过我们的网站提交询价。系统已自动生成报价单 <b>${q.quoteNo}</b>，明细如下：</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#f7f7f7;"><td style="padding:6px 8px;font-weight:bold;">产品</td><td style="padding:6px 8px;font-weight:bold;text-align:center;">数量</td><td style="padding:6px 8px;font-weight:bold;text-align:right;">参考价</td></tr>
              ${itemsHtml}
            </table>
            <p style="margin:12px 0 0;"><b>${totalText}</b></p>
            ${q.options && Array.isArray(q.options) && q.options.some((o: any) => o?.checked) ? `<p style="margin:10px 0 0;color:#666;">附加需求：${q.options.filter((o: any) => o?.checked).map((o: any) => o?.label || o?.key || "").join("、")}</p>` : ""}
            ${pdf ? `<p style="margin:14px 0 0;">报价单 PDF 已作为附件附上，请查收。</p>` : ""}
            <p style="margin:18px 0 0;color:#999;font-size:12px;">如对报价有任何疑问，欢迎直接回复本邮件与我们联系。本报价单仅供参考，最终价格以双方确认为准。</p>
          </div>
        </div>
      `
      : `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:18px 24px;"><span style="color:#fff;font-size:16px;font-weight:bold;">${fromName} · Auto Quotation</span></div>
          <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
            <p style="margin:0 0 12px;">Dear ${q.name || ""},</p>
            <p style="margin:0 0 12px;">Thank you for your inquiry. Your quotation <b>${q.quoteNo}</b> has been generated automatically:</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#f7f7f7;"><td style="padding:6px 8px;font-weight:bold;">Product</td><td style="padding:6px 8px;font-weight:bold;text-align:center;">Qty</td><td style="padding:6px 8px;font-weight:bold;text-align:right;">Price</td></tr>
              ${itemsHtml}
            </table>
            <p style="margin:12px 0 0;"><b>${totalText}</b></p>
            ${q.options && Array.isArray(q.options) && q.options.some((o: any) => o?.checked) ? `<p style="margin:10px 0 0;color:#666;">Add-ons: ${q.options.filter((o: any) => o?.checked).map((o: any) => o?.label || o?.key || "").join(", ")}</p>` : ""}
            ${pdf ? `<p style="margin:14px 0 0;">The quotation PDF is attached to this email.</p>` : ""}
            <p style="margin:18px 0 0;color:#999;font-size:12px;">If you have any questions, feel free to reply to this email. This quotation is for reference only.</p>
          </div>
        </div>
      `;

    const mail: any = {
      from: `"${fromName}" <${from}>`,
      to: q.email,
      subject,
      html,
    };
    if (pdf) {
      mail.attachments = [{ filename: `${q.quoteNo}.pdf`, content: pdf, contentType: "application/pdf" }];
    }
    await transporter.sendMail(mail);
    console.log("[报价] 自动报价回执已发送:", q.email, q.quoteNo);
  } catch (err) {
    console.error("[报价] 自动报价回执发送失败：", err);
  }
}

// 报价提交通知邮件给管理员
async function notifyQuoteByEmail(q: any): Promise<void> {
  if (!(await isSmtpConfigured())) {
    console.log("[报价] 未配置 SMTP，跳过邮件通知，报价已保存");
    return;
  }
  try {
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
    let notifyTo = cfg.user;
    try {
      const nc = await prisma.siteConfig.findUnique({ where: { configKey: "notifyEmail" } });
      if (nc && typeof nc.configValue === "string" && nc.configValue.trim()) {
        notifyTo = nc.configValue.trim();
      } else if (process.env.ADMIN_NOTIFY_EMAIL) {
        notifyTo = process.env.ADMIN_NOTIFY_EMAIL;
      }
    } catch (e) {
      if (process.env.ADMIN_NOTIFY_EMAIL) notifyTo = process.env.ADMIN_NOTIFY_EMAIL;
    }
    const itemsHtml = (q.items || [])
      .map(
        (it: any) =>
          `<tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${it.name}（${it.model}）</td>` +
          `<td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${it.qty}</td>` +
          `<td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${it.priceRange || "面议"}</td></tr>`
      )
      .join("");
    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: notifyTo,
      subject: `【报价询价】${q.quoteNo} ${q.company || q.name}`,
      html: `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:18px 24px;">
            <span style="color:#fff;font-size:16px;font-weight:bold;">${brand.name} — 新报价询价</span>
          </div>
          <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
            <p style="margin:0 0 12px;">管理员您好，网站收到一条报价询价（${q.quoteNo}）：</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;width:90px;">公司</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${q.company || "-"}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">联系人</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${q.name}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">电话</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${q.phone}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">邮箱</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${q.email || "-"}</td></tr>
            </table>
            <p style="margin:14px 0 6px;font-weight:bold;">产品明细：</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#f7f7f7;"><td style="padding:6px 8px;font-weight:bold;">产品</td><td style="padding:6px 8px;font-weight:bold;">数量</td><td style="padding:6px 8px;font-weight:bold;">参考价</td></tr>
              ${itemsHtml}
            </table>
            <p style="margin:14px 0 0;">${q.totalText || ""}</p>
            ${q.message ? `<p style="margin:10px 0 0;color:#666;">需求说明：${String(q.message).replace(/\n/g, "<br>")}</p>` : ""}
            ${q.options && Array.isArray(q.options) && q.options.some((o: any) => o?.checked)
              ? `<p style="margin:10px 0 0;color:#666;">附加需求：${q.options
                  .filter((o: any) => o?.checked)
                  .map((o: any) => o?.label || o?.key || "")
                  .join("、")}</p>`
              : ""}
            <p style="margin:20px 0 0;color:#999;font-size:12px;">提交时间：${new Date().toLocaleString("zh-CN")}　|　请登录后台 /admin/quotes 处理</p>
          </div>
        </div>
      `,
    });
    console.log("[报价] 管理员通知邮件已发送", q.quoteNo);
  } catch (err) {
    console.error("[报价] 通知邮件发送失败：", err);
  }
}

export async function POST(req: NextRequest) {
  const rlIpAddr = rlIp(req);
  const rl = checkRateLimit("quote", rlIpAddr, 5, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  try {
    const body = await req.json();
    const { company, name, phone, email, message, items, options, locale, sourcePage, visitorKey } = body;

    // 登录会员自动关联（米思米式：个人中心「我的询价单」）
    let memberId: bigint | null = null;
    try {
      const mToken = memberTokenFromRequest(req);
      const mPayload = verifyMemberToken(mToken);
      if (mPayload) {
        const m = await prisma.member.findUnique({ where: { id: BigInt(mPayload.mid) } });
        if (m && m.status === "active") memberId = m.id;
      }
    } catch {
      memberId = null;
    }

    if (!company || !name || !phone) {
      return NextResponse.json({ error: "公司名称、姓名和电话必填" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "询价商品不能为空" }, { status: 400 });
    }

    // 收集商品 id（兼容数字主键 id 与 slug 两种标识）+ 数量（最小 1）
    const qtyMap: Record<string, number> = {};
    const ids: bigint[] = [];
    const slugs: string[] = [];
    for (const it of items) {
      const rawId = it?.id;
      const nid = Number(rawId);
      if (Number.isInteger(nid) && nid > 0) {
        const key = "id:" + nid;
        qtyMap[key] = Math.max(1, parseInt(String(it.qty), 10) || 1);
        ids.push(BigInt(nid));
      } else if (typeof rawId === "string" && rawId.trim()) {
        const key = "slug:" + rawId.trim();
        qtyMap[key] = Math.max(1, parseInt(String(it.qty), 10) || 1);
        slugs.push(rawId.trim());
      }
    }
    if (ids.length === 0 && slugs.length === 0) {
      return NextResponse.json({ error: "询价商品无效" }, { status: 400 });
    }

    // 中国企业名称真实性核实（联网 AI 判断；未启用/非中国企业名称自动跳过）
    let companyVerified: any = null;
    if (company) {
      try {
        const cfg = await getCompanyVerifyConfig();
        if (cfg.enabled && isChineseCompanyName(company)) {
          const v = await verifyChineseCompany(company);
          companyVerified = {
            exists: v.exists,
            confidence: v.confidence,
            reason: v.reason || "",
            verified: v.verified,
            checkedAt: new Date().toISOString(),
          };
          const strict = cfg.strict;
          const pass = v.verified || (!strict && v.exists === null);
          if (!pass) {
            return NextResponse.json(
              { error: `公司名称未能核实：${v.reason || "请确认公司名称是否正确"}` },
              { status: 400 }
            );
          }
        }
      } catch (e: any) {
        console.error("[报价] 公司名称核实失败，放行:", e?.message);
      }
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [{ id: { in: ids } }, { slug: { in: slugs } }],
      },
    });
    const byId = new Map(products.map((p) => ["id:" + p.id, p]));
    const bySlug = new Map(products.map((p) => ["slug:" + p.slug, p]));

    const detailItems: any[] = [];
    let totalMin = 0;
    let totalMax = 0;
    let hasMin = true;
    let hasMax = true;
    for (const it of items) {
      const rawId = it?.id;
      const nid = Number(rawId);
      const key = Number.isInteger(nid) && nid > 0 ? "id:" + nid : "slug:" + String(rawId || "").trim();
      const p = byId.get(key) || bySlug.get(key);
      if (!p) continue;
      const qty = qtyMap[key] || 1;
      const min = p.priceMin !== null && p.priceMin !== undefined ? Number(p.priceMin) : null;
      const max = p.priceMax !== null && p.priceMax !== undefined ? Number(p.priceMax) : null;
      const unit = p.priceUnit || "元/台";
      let priceRange = "面议";
      if (min !== null && max !== null && min > 0 && max > 0) {
        priceRange = `¥${min.toLocaleString()} - ¥${max.toLocaleString()} ${unit}`;
      } else if (min !== null && min > 0) {
        priceRange = `¥${min.toLocaleString()} ${unit} 起`;
      }
      detailItems.push({
        id: Number(p.id),
        model: p.model,
        name: p.name,
        nameEn: (p as any).nameEn || "",
        qty,
        unit,
        unitEn: "Unit",
        priceMin: min,
        priceMax: max,
        priceRange,
      });
      if (min === null || min <= 0) hasMin = false;
      else totalMin += min * qty;
      if (max === null || max <= 0) hasMax = false;
      else totalMax += max * qty;
    }
    if (detailItems.length === 0) {
      return NextResponse.json({ error: "未找到对应产品" }, { status: 400 });
    }

    // 生成报价单号：QT + 日期 + 当日最大序号+1（避免 count 不连续导致唯一约束冲突）
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const prefix = `QT${ymd}-`;
    const last = await prisma.quoteRequest.findFirst({
      where: { quoteNo: { startsWith: prefix } },
      orderBy: { quoteNo: "desc" },
      select: { quoteNo: true },
    });
    let nextSeq = 1;
    if (last?.quoteNo) {
      const n = parseInt(String(last.quoteNo).slice(prefix.length), 10);
      if (!isNaN(n)) nextSeq = n + 1;
    }

    const _loc = getLocationFields(getClientIp(req.headers));
    // create 循环重试：唯一约束冲突（P2002）时重新取当日最大序号并重试，最多 5 次
    let quote: any = null;
    let quoteNo = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        const _last = await prisma.quoteRequest.findFirst({
          where: { quoteNo: { startsWith: prefix } },
          orderBy: { quoteNo: "desc" },
          select: { quoteNo: true },
        });
        if (_last?.quoteNo) {
          const _n = parseInt(String(_last.quoteNo).slice(prefix.length), 10);
          if (!isNaN(_n)) nextSeq = _n + 1;
        } else nextSeq = 1;
      }
      quoteNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;
      try {
        quote = await prisma.quoteRequest.create({
          data: {
            quoteNo,
            company: company || "",
            name,
            phone,
            email: email || "",
            message: message || "",
            items: detailItems,
            options: Array.isArray(options) && options.length ? options : undefined,
            locale: typeof locale === "string" && locale ? String(locale).slice(0, 10) : "zh",
            companyVerified: companyVerified || undefined,
            totalMin: hasMin ? totalMin : null,
            totalMax: hasMax ? totalMax : null,
            sourcePage: sourcePage || "",
            visitorKey: String(visitorKey || "").slice(0, 64) || null,
            memberId: memberId || null,
            ip: _loc.ip,
            country: _loc.country,
            city: _loc.city,
          },
        });
        break;
      } catch (e: any) {
        if (e?.code === "P2002" && attempt < 4) {
          nextSeq++;
          continue;
        }
        throw e;
      }
    }

    // 写入商机台账（统一线索视图）
    const itemSummary = detailItems.map((it) => `${it.name}(${it.model})×${it.qty}`).join("；");
    const totalText =
      hasMin && hasMax && totalMin > 0 && totalMax > 0
        ? `预估总价 ¥${totalMin.toLocaleString()} - ¥${totalMax.toLocaleString()}`
        : "价格面议";
    await prisma.contactMessage.create({
      data: {
        name,
        company: company || "",
        phone,
        email: email || "",
        subject: `报价询价 ${quoteNo}`,
        message: `报价单号：${quoteNo}\n产品明细：${itemSummary}\n${totalText}${message ? `\n需求说明：${message}` : ""}`,
        source: "quote:报价询价",
        ip: _loc.ip,
        country: _loc.country,
        city: _loc.city,
      },
    });

    // 异步发邮件，不阻塞响应
    notifyQuoteByEmail({ ...quote, totalText });
    // 自动报价回执（发客户邮箱，含报价单 PDF）
    notifyQuoteToCustomer({ ...quote, totalText, locale: quote.locale || "zh" }, totalText);

    // EDM 订阅者自动收集（询价邮箱 → 邮件营销订阅者）
    try {
      const { ensureEmailSubscriber } = await import("@/lib/email-subscriber");
      await ensureEmailSubscriber(email, "询价", "quote:询价", name);
    } catch { /* 静默 */ }

    const out = {
      ...serializeBigInt(quote),
      totalMin: quote.totalMin ? Number(quote.totalMin) : null,
      totalMax: quote.totalMax ? Number(quote.totalMax) : null,
    };
    const res = NextResponse.json(out);
    // 🔒 2026-09-16 安全修复（第二轮）：给**本次提交者**下发一枚签名能力票据（cookie），
    //    使其能在 /quote/success 页下载自己刚提交的报价单 PDF（该页 POST /api/quote/pdf 时
    //    浏览器按默认 same-origin 自动携带本 cookie ⇒ **前端无需任何改动**）。
    //    只知单号的第三方拿不到也伪造不了这枚票据（HMAC 服务端密钥），顺序遍历仍全部 404。
    //    详见 lib/quote-access.ts 的说明与已知边界。
    res.headers.set("Set-Cookie", quoteAccessSetCookie(req, quoteNo));
    return res;
  } catch (error: any) {
    console.error("[报价] 创建失败：", error);
    return NextResponse.json({ error: error.message || "提交失败" }, { status: 500 });
  }
}
