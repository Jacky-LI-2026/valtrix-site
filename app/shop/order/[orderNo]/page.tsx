"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import { Search, CheckCircle2, Truck, Package, Printer, RotateCcw, Upload, Building2, FileText, ExternalLink, QrCode } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * 状态 / 支付方式 / 物流状态：**存 code，不存中文**
 * --------------------------------------------------------------------------
 * owner 2026-10-14「前台显示多语言」：这几张表此前直接写死中文（且定义在模块作用域，
 * 拿不到组件里的 `t`）⇒ 英文/日文访客在查单页看到的是「待确认 / 对公转账 / 已发货」。
 * 现改为「code → i18n key」，渲染时用组件内的 `tr()` 取当前语种。
 */
const STATUS_KEY: Record<string, string> = {
  pending: "orderStPending",
  confirmed: "orderStConfirmed",
  completed: "orderStCompleted",
  cancelled: "orderStCancelled",
};
const PAY_KEY: Record<string, string> = {
  contact: "payContact",
  bank: "payBank",
  offline: "payOffline",
  wechat: "payWechat",
  alipay: "payAlipay",
};
const PAY_STATUS_KEY: Record<string, string> = {
  unpaid: "orderPayUnpaid",
  paid: "orderPayPaid",
  confirmed: "orderPayConfirmed",
};
// 物流商（顺丰 / 跨越 / 京东，与后台一致）
const SHIPPING_LIST = [
  { code: "SF", name: "顺丰速运", url: "https://www.sf-express.com/chn/sc/waybill/waybill-detail" },
  { code: "KY", name: "跨越速运", url: "https://www.ky-express.com/waybill" },
  { code: "JD", name: "京东物流", url: "https://www.jd.com/waybill" },
];
const SHIPPING_STATUS_KEY: Record<string, string> = {
  not_shipped: "orderShipNotShipped",
  shipped: "orderShipShipped",
  delivered: "orderShipDelivered",
};
const shippingName = (code?: string | null) => SHIPPING_LIST.find((s) => s.code === code)?.name || code || "";
const shippingUrl = (code?: string | null) => SHIPPING_LIST.find((s) => s.code === code)?.url || "";

export default function ShopOrderQueryPage() {
  const { orderNo } = useParams<{ orderNo: string }>();
  const { t, locale } = useI18n();
  /** 「code → i18n key」查出来的 key 喂给 t()（显式收窄一次；查不到回退空串由调用方兜底） */
  const tr = (key?: string): string => (key ? t(key as Parameters<typeof t>[0]) : "");
  /** 标签后的分隔符：中日用全角「：」，其余语种用半角「: 」（与全站页脚同一口径） */
  const sep = locale === "zh" || locale === "ja" ? "：" : ": ";
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!orderNo);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (orderNo) query(orderNo);
    // 拉对公账户信息
    fetch("/api/public/site-config?key=shop_bank_info")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) {
          let v = d.data;
          if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
          setBankInfo(v);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  async function query(no: string) {
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/public/shop/orders?orderNo=${encodeURIComponent(no)}`);
      const d = await r.json();
      if (d.ok) setOrder(d.order);
      else setError(d.error || t("orderQueryFailed"));
    } catch {
      setError(t("shopNetErrorShort"));
    } finally {
      setLoading(false);
    }
  }

  async function uploadVoucher(file: File) {
    if (!order) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("orderNo", order.orderNo);
      fd.append("email", order.email || "");
      const r = await fetch("/api/public/shop/orders/voucher", { method: "POST", body: fd });
      const d = await r.json();
      if (d.ok) {
        setUploadMsg(t("orderUploadMsgOk"));
        setOrder((o: any) => ({ ...o, payVoucher: d.url, payStatus: "paid" }));
      } else {
        setUploadMsg(d.error || t("orderUploadFailed"));
      }
    } catch {
      setUploadMsg(t("orderUploadNetError"));
    } finally {
      setUploading(false);
    }
  }

  function reorder() {
    if (!order) return;
    const arr = (order.items || []).map((it: any) => ({
      slug: it.slug,
      name: it.name,
      nameEn: it.nameEn,
      price: it.price,
      unit: it.unit,
      cover: it.cover,
      qty: it.qty,
      specText: it.specText,
      specMode: it.specMode,
    }));
    const prev = JSON.parse(localStorage.getItem("shop_cart") || "[]");
    // 合并相同 slug+spec 的行
    for (const n of arr) {
      const hit = prev.find((p: any) => p.slug === n.slug && (p.specText || "") === (n.specText || ""));
      if (hit) hit.qty += n.qty;
      else prev.push(n);
    }
    localStorage.setItem("shop_cart", JSON.stringify(prev));
    window.location.href = "/shop/cart";
  }

  const payable = order ? Math.max(0, Number(order.amount) - Number(order.discountAmount || 0)) : 0;
  const needBank = order && (order.payMethod === "bank" || order.payMethod === "offline") && order.payStatus !== "confirmed";
  /**
   * 微信 / 支付宝收款码（owner 2026-10-14「商城需要增加收款管理设置」）：
   * 客户选了对应方式 **且** 后台「收款管理」上传过该收款码 才展示。
   * 没有这一块的话，后台上传的收款码只能在对公转账订单里看到，等于摆设。
   */
  const onlineQr =
    order && order.payStatus !== "confirmed"
      ? order.payMethod === "wechat"
        ? bankInfo?.wechatQr
        : order.payMethod === "alipay"
          ? bankInfo?.alipayQr
          : null
      : null;

  return (
    <>
      <PageHero title={t("orderQuery")} titleEn="Order Query" subtitle={t("shopNotice")} subtitleEn="Enter your order number to check status" breadcrumb={t("orderQuery")} breadcrumbEn="Order Query" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex gap-2">
          <input
            defaultValue={orderNo}
            id="order-no-input"
            className="flex-1 rounded-lg border border-dark-200 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            placeholder={t("orderNo")}
          />
          <button
            onClick={() => query((document.getElementById("order-no-input") as HTMLInputElement)?.value?.trim() || "")}
            className="flex items-center gap-2 rounded-lg px-6 py-2.5 font-medium text-white"
            style={{ background: "var(--color-primary, #CC0000)" }}
          >
            <Search className="h-4 w-4" />
            {t("orderQuery")}
          </button>
        </div>
        {loading && <div className="mt-8 text-center text-dark-400">{t("loading") || "加载中..."}</div>}
        {error && <div className="mt-8 text-center text-red-500">{error}</div>}
        {order && (
          <>
            {/* ===== 操作按钮 ===== */}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-lg border border-dark-200 bg-white px-4 py-2 text-sm font-medium text-dark-700 hover:bg-dark-50"
              >
                <Printer className="h-4 w-4" /> {t("orderPrintBtn")}
              </button>
              <button
                onClick={reorder}
                className="flex items-center gap-2 rounded-lg border border-dark-200 bg-white px-4 py-2 text-sm font-medium text-dark-700 hover:bg-dark-50"
              >
                <RotateCcw className="h-4 w-4" /> {t("orderReorder")}
              </button>
              <Link href="/shop" className="flex items-center gap-2 rounded-lg border border-dark-200 bg-white px-4 py-2 text-sm font-medium text-dark-700 hover:bg-dark-50">
                {t("continueShopping")}
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-dark-100 bg-white p-6">
              {/* 头部：订单号 + 状态 */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dark-100 pb-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-dark-800">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  {t("orderNo")}: <span className="font-mono">{order.orderNo}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block rounded-full px-3 py-1 text-sm font-medium text-white" style={{ background: "var(--color-primary, #CC0000)" }}>
                    {tr(STATUS_KEY[order.status]) || order.status}
                  </span>
                  {order.payMethod && (
                    <span className="inline-block rounded-full border border-dark-200 px-3 py-1 text-sm text-dark-600">
                      {tr(PAY_KEY[order.payMethod]) || order.payMethod}
                    </span>
                  )}
                  {order.payStatus !== "confirmed" && (order.payMethod === "wechat" || order.payMethod === "alipay") && (
                    <span className="text-xs text-dark-400">{t("orderOnlinePayPending")}</span>
                  )}
                </div>
              </div>

              {/* 订单信息 */}
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-dark-600 sm:grid-cols-3">
                <div><span className="text-dark-400">{t("orderCreatedAt")}{sep}</span>{new Date(order.createdAt).toLocaleString()}</div>
                {order.poNo && <div><span className="text-dark-400">{t("orderCustomerPoNo")}{sep}</span><span className="font-medium">{order.poNo}</span></div>}
                {order.invoiceTitle && <div><span className="text-dark-400">{t("orderInvoiceLabel")}{sep}</span>{order.invoiceTitle}</div>}
                {order.taxNo && <div><span className="text-dark-400">{t("orderTaxNoLabel")}{sep}</span>{order.taxNo}</div>}
                <div className="col-span-2"><span className="text-dark-400">{t("orderCustomerLabel")}{sep}</span>{order.name} · {order.phone} · {order.email}</div>
                {order.company && <div className="col-span-2"><span className="text-dark-400">{t("orderCompanyLabel")}{sep}</span>{order.company}</div>}
                {order.address && <div className="col-span-2"><span className="text-dark-400">{t("orderShipToLabel")}{sep}</span>{order.address}</div>}
                {order.remark && <div className="col-span-2"><span className="text-dark-400">{t("orderRemarkLabel")}{sep}</span>{order.remark}</div>}
              </div>

              {/* 商品明细 */}
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-100 text-left text-dark-400">
                      <th className="py-2 pr-3 font-medium">{t("orderColProduct")}</th>
                      <th className="py-2 pr-3 font-medium">{t("orderColSpec")}</th>
                      <th className="py-2 pr-3 text-right font-medium">{t("orderColPrice")}</th>
                      <th className="py-2 pr-3 text-right font-medium">{t("orderColQty")}</th>
                      <th className="py-2 text-right font-medium">{t("orderColAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((it: any, idx: number) => (
                      <tr key={idx} className="border-b border-dark-50">
                        <td className="py-2.5 pr-3">{it.name}</td>
                        <td className="py-2.5 pr-3 text-dark-500">{it.specText || it.slug || "-"}</td>
                        <td className="py-2.5 pr-3 text-right">{it.price !== null && it.price !== undefined ? `¥${Number(it.price).toLocaleString()}` : t("priceNegotiable")}</td>
                        <td className="py-2.5 pr-3 text-right">{it.qty}</td>
                        <td className="py-2.5 text-right font-medium">{it.price !== null && it.price !== undefined ? `¥${(Number(it.price) * it.qty).toLocaleString()}` : t("priceNegotiable")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 金额汇总 */}
              <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-dark-600">
                  <span>{t("shopTotal")}</span>
                  <span>¥{Number(order.amount).toLocaleString()}</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-dark-400">
                    <span>{t("shopDiscount")}{order.couponCode ? `（${order.couponCode}）` : ""}</span>
                    <span>-¥{Number(order.discountAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-dark-200 pt-2 text-base font-semibold">
                  <span>{t("orderPayableTax")}</span>
                  <span style={{ color: "var(--color-primary, #CC0000)" }}>¥{payable.toLocaleString()}</span>
                </div>
              </div>

              {/* 对公转账信息 + 凭证上传 */}
              {needBank && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium text-dark-800">
                    <Building2 className="h-4 w-4" style={{ color: "var(--color-primary, #CC0000)" }} />
                    {t("orderBankInfoTitle")}
                  </div>
                  {bankInfo ? (
                    <div className="mt-2 grid gap-1 text-dark-700 sm:grid-cols-2">
                      <div>{t("orderBankAccountName")}{sep}{bankInfo.accountName || "-"}</div>
                      <div>{t("orderBankName")}{sep}{bankInfo.bankName || "-"}</div>
                      <div>{t("orderBankAccountNo")}{sep}<span className="font-mono">{bankInfo.accountNo || "-"}</span></div>
                      <div>{t("orderBankBranch")}{sep}{bankInfo.branch || "-"}</div>
                      {bankInfo.remark && <div className="col-span-2 text-xs text-dark-500">{t("orderRemarkLabel")}{sep}{bankInfo.remark}</div>}
                      {bankInfo.instructions && (
                        <div className="col-span-2 text-xs text-dark-500">{bankInfo.instructions}</div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-dark-500">{t("orderBankNotConfigured")}</div>
                  )}
                  {/*
                    收款码（owner 2026-10-14「商城需要增加收款管理设置」）：
                    后台「收款管理」上传的微信/支付宝收款码，在这里随对公信息一起展示。
                  */}
                  {(bankInfo?.wechatQr || bankInfo?.alipayQr) && (
                    <div className="mt-3 flex flex-wrap items-start gap-5">
                      {bankInfo?.wechatQr && (
                        <div className="text-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={String(bankInfo.wechatQr)}
                            alt="微信收款码"
                            className="h-32 w-32 rounded-lg border border-amber-200 bg-white object-contain"
                          />
                          <div className="mt-1 text-xs text-dark-500">{t("orderWechatQr")}</div>
                        </div>
                      )}
                      {bankInfo?.alipayQr && (
                        <div className="text-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={String(bankInfo.alipayQr)}
                            alt="支付宝收款码"
                            className="h-32 w-32 rounded-lg border border-amber-200 bg-white object-contain"
                          />
                          <div className="mt-1 text-xs text-dark-500">{t("orderAlipayQr")}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-3">
                    {order.payVoucher ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" /> {t("orderVoucherUploaded")}
                        <a href={order.payVoucher} target="_blank" className="underline">{t("orderView")}</a>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadVoucher(f);
                          }}
                        />
                        <button
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white disabled:opacity-60"
                          style={{ background: "var(--color-primary, #CC0000)" }}
                        >
                          <Upload className="h-4 w-4" /> {uploading ? t("orderUploading") : t("orderUploadVoucher")}
                        </button>
                        <div className="mt-2 text-xs text-dark-400">{t("orderVoucherHint")}</div>
                      </>
                    )}
                    {uploadMsg && <div className="mt-2 text-xs text-dark-600">{uploadMsg}</div>}
                  </div>
                </div>
              )}

              {/* 微信 / 支付宝收款码（后台「收款管理」上传；客户选了该方式且已配置时展示） */}
              {onlineQr && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium text-dark-800">
                    <QrCode className="h-4 w-4" style={{ color: "var(--color-primary, #CC0000)" }} />
                    {(order.payMethod === "wechat" ? t("orderWechatQr") : t("orderAlipayQr")) + t("orderQrPayTitle")}
                  </div>
                  <div className="mt-3 flex flex-wrap items-start gap-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={String(onlineQr)}
                      alt={order.payMethod === "wechat" ? "微信收款码" : "支付宝收款码"}
                      className="h-40 w-40 rounded-lg border border-amber-200 bg-white object-contain"
                    />
                    <div className="text-xs text-dark-500">
                      <div>{t("orderPayMethod")}{sep}{tr(PAY_KEY[order.payMethod]) || order.payMethod}</div>
                      <div className="mt-1">{t("orderPayAmount")}{sep}¥{payable.toLocaleString()}</div>
                      {bankInfo?.instructions && <div className="mt-1">{bankInfo.instructions}</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* 支付状态 */}
              {order.payStatus && order.payStatus !== "unpaid" && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-dark-400" />
                  <span className="text-dark-400">{t("orderPayStatusLabel")}{sep}</span>
                  <span className="font-medium text-dark-700">{tr(PAY_STATUS_KEY[order.payStatus]) || order.payStatus}</span>
                </div>
              )}

              {/* 物流 */}
              {order.shippingCompany || order.trackingNo ? (
                <div className="mt-4 rounded-xl border border-dark-100 bg-gray-50 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-dark-700">
                    <Truck className="h-4 w-4" style={{ color: "var(--color-primary, #CC0000)" }} />
                    {t("orderShippingInfo")}
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        background: order.shippingStatus === "delivered" ? "#ECFDF5" : order.shippingStatus === "shipped" ? "#EFF6FF" : "#F3F4F6",
                        color: order.shippingStatus === "delivered" ? "#059669" : order.shippingStatus === "shipped" ? "#2563EB" : "#6B7280",
                      }}
                    >
                      {tr(SHIPPING_STATUS_KEY[order.shippingStatus || "not_shipped"])}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1 text-dark-600">
                    {order.shippingCompany && <div>{t("orderShipper")}{sep}{shippingName(order.shippingCompany)}</div>}
                    {order.trackingNo && (
                      <div className="flex items-center gap-1">
                        {t("orderTrackingNo")}{sep}<span className="font-mono">{order.trackingNo}</span>
                        {shippingUrl(order.shippingCompany) && (
                          <a
                            href={shippingUrl(order.shippingCompany)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-xs"
                            style={{ color: "var(--color-primary, #CC0000)" }}
                          >
                            {t("orderQueryLogistics")} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                    {order.shippedAt && <div className="text-xs text-dark-400">{t("orderShippedAt")}{sep}{new Date(order.shippedAt).toLocaleString()}</div>}
                    {order.deliveredAt && <div className="text-xs" style={{ color: "#059669" }}>{t("orderDeliveredAt")}{sep}{new Date(order.deliveredAt).toLocaleString()}</div>}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* ===== 打印模板（米思米式采购订单）===== */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-order, #print-order * { visibility: visible; }
          #print-order { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      {order && (
        <div id="print-order" className="hidden print:block" style={{ fontFamily: "SimSun, serif" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: 32, color: "#111" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #111", paddingBottom: 12 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>采购订单</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>PURCHASE ORDER</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 12 }}>
                <div>订单号：{order.orderNo}</div>
                {order.poNo && <div>客户采购单号：{order.poNo}</div>}
                <div>日期：{new Date(order.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "12px 0" }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>买方信息 / Buyer</div>
                <div>公司：{order.company || "-"}</div>
                <div>联系人：{order.name}</div>
                <div>电话：{order.phone}　邮箱：{order.email}</div>
                <div>地址：{order.address || "-"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>卖方信息 / Seller</div>
                <div>VALTRIX（深圳）</div>
                <div>VALTRIX Co., Ltd.</div>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ border: "1px solid #111" }}>
                  <th style={{ border: "1px solid #111", padding: 6 }}>序号</th>
                  <th style={{ border: "1px solid #111", padding: 6 }}>商品名称</th>
                  <th style={{ border: "1px solid #111", padding: 6 }}>规格</th>
                  <th style={{ border: "1px solid #111", padding: 6 }}>单价</th>
                  <th style={{ border: "1px solid #111", padding: 6 }}>数量</th>
                  <th style={{ border: "1px solid #111", padding: 6 }}>金额</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((it: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #111", padding: 6, textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ border: "1px solid #111", padding: 6 }}>{it.name}</td>
                    <td style={{ border: "1px solid #111", padding: 6 }}>{it.specText || "-"}</td>
                    <td style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>{it.price !== null && it.price !== undefined ? `¥${Number(it.price).toLocaleString()}` : "-"}</td>
                    <td style={{ border: "1px solid #111", padding: 6, textAlign: "center" }}>{it.qty}</td>
                    <td style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>{it.price !== null && it.price !== undefined ? `¥${(Number(it.price) * it.qty).toLocaleString()}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, fontSize: 12, textAlign: "right" }}>
              {Number(order.discountAmount) > 0 && <div>优惠：-¥{Number(order.discountAmount).toLocaleString()}</div>}
              <div style={{ fontSize: 14, fontWeight: 700 }}>实付总额（含税）：¥{payable.toLocaleString()}</div>
              <div style={{ marginTop: 4 }}>支付方式：{tr(PAY_KEY[order.payMethod]) || order.payMethod}</div>
            </div>
            <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <div>买方签字 / Buyer Signature：______________________</div>
              <div>卖方盖章 / Seller Seal：______________________</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
