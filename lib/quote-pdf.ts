import path from "path";
import { getBrandName, getBrandNameEn } from '@/lib/brand';
import fs from "fs";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getSEOConfig } from "@/lib/seo";
// @ts-ignore pdfkit 无官方类型
import PDFDocument from "pdfkit";

const FONT_NAME = "NotoSansCJKsc-Regular.otf";

/** 报价单 PDF 文案字典：中文版 / 英文版（按询价客户语言选择，非中文一律英文版） */
const DICT = {
  zh: {
    quotation: "报价单",
    quoteNo: "报价单号",
    date: "日期",
    customer: "客户信息",
    company: "公司名称",
    contact: "联系人",
    phone: "联系电话",
    email: "电子邮箱",
    items: "产品明细",
    seq: "序号",
    name: "产品名称（型号）",
    qty: "数量",
    unit: "单位",
    price: "参考价",
    estTotal: "预估总价",
    reqs: "附加需求",
    msg: "需求说明",
    totalFallback: "价格面议",
    validity: (n: number) => `本报价单自出单之日起 ${n} 天内有效。`,
    footer: (s: string) => s || "本报价单仅供参考，最终价格与交货期以双方书面确认为准。",
    priceNote: "以上为参考价估算，最终报价以销售审核确认后的报价单为准。",
  },
  en: {
    quotation: "QUOTATION",
    quoteNo: "Quote No.",
    date: "Date",
    customer: "CUSTOMER",
    company: "Company",
    contact: "Contact",
    phone: "Phone",
    email: "Email",
    items: "ITEMS",
    seq: "No.",
    name: "Product (Model)",
    qty: "Qty",
    unit: "Unit",
    price: "Ref. Price",
    estTotal: "Estimated Total",
    reqs: "REQUIREMENTS",
    msg: "MESSAGE",
    totalFallback: "Price on request",
    validity: (n: number) => `This quotation is valid for ${n} days from the issue date.`,
    footer: () => "This quotation is for reference only. Final price and delivery terms are subject to written confirmation.",
    priceNote: "Estimate based on reference prices. Final quotation subject to sales review and confirmation.",
  },
} as const;

/** 把上传的 LOGO URL 转成本地文件路径（/uploads/... → public/uploads/...） */
function resolveUploadPath(url: string): string | null {
  if (!url) return null;
  const m = String(url).match(/\/(uploads\/[^/?#]+)$/);
  if (!m) return null;
  const abs = path.join(process.cwd(), "public", m[1]);
  return fs.existsSync(abs) ? abs : null;
}

/**
 * 报价单 PDF 生成（pdfkit 渲染 A4）
 * 供 `app/api/quote/pdf/route.ts`（前台/后台下载）与后台审核发邮件复用。
 * @param quote 报价单对象（含 quoteNo/company/name/phone/email/message/items/totalMin/totalMax/options/locale）
 * @param tpl   报价单模板配置（可选，默认读 DB quote_template）
 * @param seo   站点信息（可选，默认读 DB）
 */
export async function generateQuotePdf(opts: {
  quote: any;
  tpl?: any;
  seo?: any;
}): Promise<Buffer> {
  const { quote: q } = opts;
  const seo = opts.seo || (await getSEOConfig());
  // 报价单模板配置（后台「报价单模板」页可编辑）
  let tpl: any = opts.tpl || {};
  if (!opts.tpl) {
    try {
      const trow = await prisma.siteConfig.findUnique({ where: { configKey: "quote_template" } });
      if (trow && trow.configValue) {
        const raw = trow.configValue as unknown
        tpl = typeof raw === "string" ? JSON.parse(raw) : (raw as any) || {};
      }
    } catch (e) {}
  }
  // 语言：询价客户语言为 zh → 中文版；非 zh（en/ja/ko/fr/ar）→ 英文版
  const isZh = (q.locale || "zh") === "zh";
  const D = (isZh ? DICT.zh : DICT.en) as typeof DICT.zh;

  const primary = tpl.primaryColor || "#CC0000";
  const headerName = tpl.headerName || (seo as any).siteName || getBrandName();
  const headerNameEn = tpl.headerNameEn || (seo as any).siteNameEn || getBrandNameEn();
  const quoteTitle = isZh ? tpl.quoteTitle || "报价单 QUOTATION" : "QUOTATION";
  const showPriceRange = tpl.showPriceRange !== false;
  const footerText = D.footer(tpl.footerText);
  const validityText =
    tpl.validityDays && Number(tpl.validityDays) > 0 ? D.validity(Number(tpl.validityDays)) : "";

  // 公司 LOGO（模板可上传，转 png buffer 供 pdfkit 使用）
  let logoBuf: Buffer | null = null;
  let logoW = 0;
  let logoH = 0;
  if (tpl.logo) {
    try {
      const abs = resolveUploadPath(tpl.logo);
      if (abs) {
        const r = await sharp(abs)
          .resize({ width: 220, height: 56, fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer({ resolveWithObject: true });
        logoBuf = r.data;
        logoW = r.info.width;
        logoH = r.info.height;
      }
    } catch (e) {
      console.error("[报价PDF] LOGO 处理失败：", e);
    }
  }

  const fontPath = path.join(process.cwd(), "public", "fonts", FONT_NAME);
  if (!fs.existsSync(fontPath)) {
    throw new Error("服务器缺少中文字体");
  }

  const items: any[] = Array.isArray(q.items) ? q.items : [];
  const totalMin = q.totalMin != null ? Number(q.totalMin) : null;
  const totalMax = q.totalMax != null ? Number(q.totalMax) : null;
  const created = q.createdAt ? new Date(q.createdAt) : new Date();
  const dateStr = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;
  const options: any[] = Array.isArray(q.options) ? q.options.filter((o: any) => o?.checked) : [];

  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: `${D.quotation} ${q.quoteNo}`, Author: isZh ? headerName : headerNameEn } });
  doc.registerFont("CN", fontPath);

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const marginL = 48;

    // ===== 页眉（顶部条带 + LOGO + 公司抬头） =====
    doc.rect(0, 0, pageW, 8).fill(primary);
    let headX = marginL;
    if (logoBuf && logoW > 0) {
      doc.image(logoBuf, marginL, 16, { width: logoW, height: logoH });
      headX = marginL + logoW + 14;
    }
    // 右上角英文抬头（中文版显示英文小字；英文版大字即英文抬头，不再重复）
    if (isZh) {
      doc.font("CN").fontSize(8).fillColor("#888888");
      doc.text(headerNameEn, marginL, 40, { align: "right" });
    }
    doc.fillColor(primary).fontSize(21).text(isZh ? headerName : headerNameEn, headX, 26, { characterSpacing: 0.5 });
    doc.fontSize(9).fillColor("#555555");
    doc.text(quoteTitle, headX, 52);
    doc.moveDown(0.4);

    // 报价单信息行
    doc.fontSize(9).fillColor("#444444");
    doc.text(`${D.quoteNo}：${q.quoteNo}`, marginL, 72);
    doc.text(`${D.date}：${dateStr}`, marginL + 260, 72);
    doc.moveTo(marginL, 92).lineTo(pageW - marginL, 92).strokeColor("#E5E5E5").lineWidth(0.8).stroke();

    // ===== 客户信息 =====
    let y = 106;
    doc.fillColor(primary).fontSize(10).text(D.customer, marginL, y);
    y += 20;
    doc.fontSize(9).fillColor("#333333");
    doc.text(`${D.company}：${q.company || "-"}`, marginL, y);
    doc.text(`${D.contact}：${q.name || "-"}`, marginL + 220, y);
    y += 16;
    doc.text(`${D.phone}：${q.phone || "-"}`, marginL, y);
    doc.text(`${D.email}：${q.email || "-"}`, marginL + 220, y);
    y += 26;

    // ===== 产品明细表 =====
    doc.fillColor(primary).fontSize(10).text(D.items, marginL, y);
    y += 20;
    const colX = [marginL, marginL + 46, marginL + 230, marginL + 340, pageW - marginL - 110];
    const colW = [46, 184, 60, 50, 110];
    const headers = [D.seq, D.name, D.qty, D.unit, D.price];
    // 表头（主色条带）
    doc.rect(marginL, y, pageW - marginL * 2, 22).fill(primary);
    doc.fillColor("#FFFFFF").fontSize(9);
    headers.forEach((h, i) => {
      doc.text(h, colX[i] + 6, y + 6, { width: colW[i] - 12 });
    });
    y += 22;
    // 行（斑马纹）
    doc.fontSize(9).fillColor("#333333");
    items.forEach((it, idx) => {
      const rowH = 24;
      doc.rect(marginL, y, pageW - marginL * 2, rowH).fill(idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA");
      doc.fillColor("#999999").fontSize(8).text(String(idx + 1), colX[0] + 6, y + 8);
      doc.fillColor("#333333").fontSize(9).text(`${isZh ? it.name || "" : it.nameEn || it.name || ""}（${it.model || ""}）`, colX[1] + 6, y + 7, { width: colW[1] - 12 });
      doc.text(String(it.qty || 1), colX[2] + 6, y + 7);
      doc.text(isZh ? it.unit || "台" : it.unitEn || "Unit", colX[3] + 6, y + 7);
      const pMin = it.priceMin != null && it.priceMin !== "" ? Number(it.priceMin) : null;
      const pMax = it.priceMax != null && it.priceMax !== "" ? Number(it.priceMax) : null;
      let priceTxt: string;
      if (isZh) {
        priceTxt =
          it.priceRange ||
          (pMin !== null && pMax !== null && pMin > 0
            ? `¥${pMin.toLocaleString("zh-CN")} ~ ¥${pMax.toLocaleString("zh-CN")}`
            : pMin !== null && pMin > 0
            ? `¥${pMin.toLocaleString("zh-CN")} 起`
            : "面议");
      } else {
        priceTxt =
          pMin !== null && pMax !== null && pMin > 0 && pMax > 0
            ? `¥${pMin.toLocaleString("en-US")} ~ ¥${pMax.toLocaleString("en-US")}`
            : pMin !== null && pMin > 0
            ? `From ¥${pMin.toLocaleString("en-US")}`
            : "On request";
      }
      doc.text(priceTxt, colX[4] + 6, y + 7, { width: colW[4] - 12 });
      y += rowH;
    });
    // 表格边框
    doc.rect(marginL, 106 + 20, pageW - marginL * 2, y - (106 + 20)).strokeColor("#E0E0E0").lineWidth(0.5).stroke();

    // ===== 合计 =====
    y += 10;
    let totalText: string = D.totalFallback;
    if (showPriceRange) {
      if (totalMin !== null && totalMax !== null && totalMin > 0 && totalMax > 0) {
        totalText = `¥${totalMin.toLocaleString("zh-CN")} ~ ¥${totalMax.toLocaleString("zh-CN")}`;
      } else if (totalMin !== null && totalMin > 0) {
        totalText = `¥${totalMin.toLocaleString("zh-CN")} 起`;
      }
    }
    doc.fontSize(10).fillColor("#111111").text(`${D.estTotal}：`, marginL, y);
    doc.fillColor(primary).fontSize(11).text(totalText, marginL + 80, y - 1, { width: 260 });
    y += 24;

    // ===== 附加需求选项 =====
    if (options.length) {
      doc.fillColor(primary).fontSize(10).text(D.reqs, marginL, y);
      y += 18;
      doc.fontSize(9).fillColor("#333333");
      doc.text(options.map((o) => o?.label || o?.key || "").join("　·　"), marginL, y, { width: pageW - marginL * 2 });
      y += 24;
    }

    // ===== 需求说明 =====
    const msg = String(q.message || "").trim();
    if (msg) {
      doc.fillColor(primary).fontSize(10).text(D.msg, marginL, y);
      y += 18;
      doc.fontSize(9).fillColor("#555555");
      doc.text(msg, marginL, y, { width: pageW - marginL * 2 });
      y += doc.heightOfString(msg, { width: pageW - marginL * 2 }) + 14;
    }

    // ===== 页脚 =====
    const footerTop = doc.page.height - 100;
    doc.moveTo(marginL, footerTop - 10).lineTo(pageW - marginL, footerTop - 10).strokeColor("#E5E5E5").lineWidth(0.8).stroke();
    doc.fontSize(8).fillColor("#666666");
    doc.text(isZh ? headerName : headerNameEn, marginL, footerTop);
    doc.text(`${isZh ? "电话" : "Tel"}：${(seo as any).phone || "-"}　${isZh ? "邮箱" : "Email"}：${(seo as any).email || "-"}`, marginL, footerTop + 12);
    if ((seo as any).companyAddress) doc.text(`地址/Address：${(seo as any).companyAddress}`, marginL, footerTop + 24);
    doc.fontSize(7).fillColor("#AAAAAA");
    doc.text(footerText, marginL, footerTop + 38);
    if (validityText) doc.text(validityText, marginL, footerTop + 48);

    doc.end();
  });
}
