/**
 * 商城订单邮件服务（仅允许在服务端 Route Handler 中引用）
 *
 * 功能：
 * 1. 客户订单提交成功确认邮件（含订单明细/金额/支付方式/查单链接）
 * 2. 新订单通知邮件（发送到商家邮箱，便于销售及时跟进）
 * 3. 订单状态变更通知邮件
 * 未配置 SMTP 时打印服务器日志（开发模式），不阻断下单流程。
 */
import nodemailer from "nodemailer";
import { getSmtpConfig, isSmtpConfigured } from "./smtp-config";
import { getBrandInfo, brandLetterhead, brandSubjectPrefix, type BrandInfo } from "./brand";
import { getSiteBaseUrl } from "@/lib/site-url";

export const runtime = "nodejs";

// 站点域名一律取自部署级环境变量 NEXT_PUBLIC_SITE_URL（勿硬编码域名，也勿写死服务器 IP）
const SITE_URL = getSiteBaseUrl();

interface OrderItemView {
  name: string;
  qty: number;
  price: number;
  unit?: string | null;
}

export interface OrderMailData {
  orderNo: string;
  name: string;
  email: string;
  phone: string;
  company?: string | null;
  address?: string | null;
  remark?: string | null;
  amount: number;
  currency: string;
  payMethod: string;
  status: string;
  items: OrderItemView[];
  createdAt?: Date | string;
}

const PAY_LABELS: Record<string, string> = {
  offline: "线下转账",
  bank: "对公汇款",
  contact: "联系销售",
  wechat: "微信支付",
  alipay: "支付宝",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待确认",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
};

function layout(title: string, bodyHtml: string, brand: BrandInfo): string {
  // 品牌名/邮箱来自 DB（见 lib/server/brand.ts），不写死在代码里 —— 双 fork 各自部署时不会串站
  const letterhead = brandLetterhead(brand);
  const footer = brand.contactEmail
    ? `此邮件由系统自动发送，请勿直接回复。如需帮助请联系 ${brand.contactEmail}`
    : "此邮件由系统自动发送，请勿直接回复。";
  return `
    <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <div style="background:#CC0000;padding:20px 24px;">
        <span style="color:#fff;font-size:18px;font-weight:bold;">${letterhead}</span>
      </div>
      <div style="padding:28px 24px;color:#333;">
        <h2 style="margin:0 0 16px;font-size:18px;">${title}</h2>
        ${bodyHtml}
        <p style="margin:24px 0 0;color:#999;font-size:12px;">${footer}</p>
      </div>
    </div>`;
}

function orderItemsHtml(items: OrderItemView[]): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;">${i.name}${i.unit ? " / " + i.unit : ""}</td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.qty}</td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:right;">¥${(Number(i.price) * i.qty).toLocaleString()}</td></tr>`
    )
    .join("");
  return `
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">
      <thead><tr style="background:#FAFAFA;">
        <th style="padding:8px 10px;text-align:left;">商品</th>
        <th style="padding:8px 10px;">数量</th>
        <th style="padding:8px 10px;text-align:right;">小计</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function sendMail(
  to: string,
  subject: string,
  html: string,
  fallbackFromName = ""
): Promise<boolean> {
  if (!(await isSmtpConfigured())) {
    // 开发模式：未配置 SMTP 时打印日志
    // eslint-disable-next-line no-console
    console.log(`[商城邮件] 开发模式（未配置 SMTP）：${subject} -> ${to}`);
    return false;
  }
  try {
    const cfg = await getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    const from = cfg.from || cfg.user;
    // 发件人显示名：后台 SMTP 配置 → 品牌名（DB）→ 不显示显示名（绝不写死某站品牌）
    const fromName = cfg.fromName || fallbackFromName;
    await transporter.sendMail({
      from: fromName ? `"${fromName}" <${from}>` : from,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[商城邮件] 发送失败：", err);
    return false;
  }
}

/** 未配置通知收件人时的统一处理：跳过发送并告警（绝不回退到硬编码/别家邮箱） */
function skipNoRecipient(orderNo: string, kind: string): boolean {
  // eslint-disable-next-line no-console
  console.warn(
    `[商城邮件] 未配置订单通知收件人（DB contact_info.email / 环境变量 SHOP_ORDER_NOTICE_EMAIL 均为空），` +
      `已跳过「${kind}」发送：${orderNo}`
  );
  return false;
}

/** 客户订单提交成功确认邮件 */
export async function sendOrderConfirmationMail(o: OrderMailData): Promise<boolean> {
  const brand = await getBrandInfo();
  const brandName = brand.name || "我们";
  const total = o.currency === "CNY" ? `¥${o.amount.toLocaleString()}` : `${o.currency} ${o.amount}`;
  const html = layout(
    "订单提交成功",
    `<p style="margin:0 0 12px;">您好，<b>${o.name}</b>，感谢您向${brandName}提交订单！我们将在 1-2 个工作日内与您联系确认。</p>
     <p style="margin:0 0 4px;">订单号：<b style="color:#CC0000;">${o.orderNo}</b></p>
     <p style="margin:0 0 12px;">支付方式：${PAY_LABELS[o.payMethod] || o.payMethod}（提交意向，线下确认）</p>
     ${orderItemsHtml(o.items)}
     <p style="margin:12px 0 0;font-size:14px;">合计：<b style="color:#CC0000;font-size:16px;">${total}</b></p>
     <p style="margin:16px 0 0;">您可随时凭订单号查询进度：<a href="${SITE_URL}/shop/order/${o.orderNo}" style="color:#CC0000;">查询订单</a></p>`,
    brand
  );
  return sendMail(o.email, `${brandSubjectPrefix(brand)}订单提交成功（${o.orderNo}）`, html, brand.name);
}

/** 新订单通知邮件（发往负责跟进的销售；无指定收件人时发往商家默认邮箱） */
export async function sendNewOrderNoticeMail(o: OrderMailData, to?: string): Promise<boolean> {
  const brand = await getBrandInfo();
  const target = (to && to.trim()) || brand.shopNoticeEmail;
  if (!target) return skipNoRecipient(o.orderNo, "新订单通知");
  const total = o.currency === "CNY" ? `¥${o.amount.toLocaleString()}` : `${o.currency} ${o.amount}`;
  const html = layout(
    "新订单通知",
    `<p style="margin:0 0 12px;">收到一笔新订单，请及时跟进：</p>
     <p style="margin:0 0 4px;">订单号：<b style="color:#CC0000;">${o.orderNo}</b></p>
     <p style="margin:0 0 4px;">客户：${o.name}（${o.phone} / ${o.email}）</p>
     <p style="margin:0 0 4px;">公司：${o.company || "-"}</p>
     <p style="margin:0 0 4px;">地址：${o.address || "-"}</p>
     <p style="margin:0 0 12px;">支付方式：${PAY_LABELS[o.payMethod] || o.payMethod}</p>
     ${orderItemsHtml(o.items)}
     <p style="margin:12px 0 0;font-size:14px;">合计：<b style="color:#CC0000;font-size:16px;">${total}</b></p>
     <p style="margin:16px 0 0;">请到后台「商城订单」认领并跟进：<a href="${SITE_URL}/admin/shop/orders" style="color:#CC0000;">前往处理</a></p>`,
    brand
  );
  return sendMail(target, `【新订单】${o.orderNo}（${o.name}）`, html, brand.name);
}

/** 订单跟进超时轮转通知邮件（发给下一个负责销售） */
export async function sendOrderEscalationMail(o: OrderMailData, to?: string, round = 1): Promise<boolean> {
  const brand = await getBrandInfo();
  const target = (to && to.trim()) || brand.shopNoticeEmail;
  if (!target) return skipNoRecipient(o.orderNo, "跟进超时轮转通知");
  const total = o.currency === "CNY" ? `¥${o.amount.toLocaleString()}` : `${o.currency} ${o.amount}`;
  const html = layout(
    "订单跟进超时 - 请接手",
    `<p style="margin:0 0 12px;">订单已超过 <b style="color:#CC0000;">2 小时</b>未被跟进，已自动转给您，请尽快接手处理：</p>
     <p style="margin:0 0 4px;">订单号：<b style="color:#CC0000;">${o.orderNo}</b>（第 ${round} 次轮转）</p>
     <p style="margin:0 0 4px;">客户：${o.name}（${o.phone} / ${o.email}）</p>
     <p style="margin:0 0 4px;">公司：${o.company || "-"}</p>
     <p style="margin:0 0 12px;">支付方式：${PAY_LABELS[o.payMethod] || o.payMethod}</p>
     ${orderItemsHtml(o.items)}
     <p style="margin:12px 0 0;font-size:14px;">合计：<b style="color:#CC0000;font-size:16px;">${total}</b></p>
     <p style="margin:16px 0 0;">请到后台「商城订单」认领并跟进：<a href="${SITE_URL}/admin/shop/orders" style="color:#CC0000;">前往处理</a></p>`,
    brand
  );
  return sendMail(target, `【跟进超时转单】${o.orderNo}（${o.name}）`, html, brand.name);
}

/** 订单状态变更通知邮件（发送给客户） */
export async function sendOrderStatusMail(o: OrderMailData): Promise<boolean> {
  const brand = await getBrandInfo();
  const html = layout(
    "订单状态更新",
    `<p style="margin:0 0 12px;">您好，<b>${o.name}</b>，您的订单状态已更新为：</p>
     <p style="margin:0 0 12px;font-size:16px;"><b style="color:#CC0000;">${STATUS_LABELS[o.status] || o.status}</b></p>
     <p style="margin:0 0 4px;">订单号：${o.orderNo}</p>
     <p style="margin:0;">您可随时凭订单号查询最新进度：<a href="${SITE_URL}/shop/order/${o.orderNo}" style="color:#CC0000;">查询订单</a></p>`,
    brand
  );
  return sendMail(o.email, `${brandSubjectPrefix(brand)}订单状态更新（${o.orderNo}）`, html, brand.name);
}
