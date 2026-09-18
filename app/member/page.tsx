"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { memberT } from "@/lib/member-i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { X, Truck, FileText, Download, LifeBuoy } from "lucide-react";

interface FavProduct {
  id: string;
  slug: string;
  model: string;
  name: string;
  nameEn: string | null;
  image: string | null;
}

interface Favorite {
  id: string;
  productId: string;
  product: FavProduct;
}

interface MemberOrder {
  orderNo: string;
  status: string;
  statusLabel: string;
  amount: number;
  currency: string;
  itemsCount: number;
  shippingCompany?: string | null;
  trackingNo?: string | null;
  shippingStatus?: string;
  shippedAt?: string | null;
  createdAt: string;
}

// 物流商（与后台一致：顺丰 / 跨越 / 京东）
const SHIPPING_LIST = [
  { code: "SF", name: "顺丰速运", url: "https://www.sf-express.com/chn/sc/waybill/waybill-detail" },
  { code: "KY", name: "跨越速运", url: "https://www.ky-express.com/waybill" },
  { code: "JD", name: "京东物流", url: "https://www.jd.com/waybill" },
];
const shippingName = (code?: string | null) => SHIPPING_LIST.find((s) => s.code === code)?.name || code || "";
const shippingUrl = (code?: string | null) => SHIPPING_LIST.find((s) => s.code === code)?.url || "";

interface MemberCoupon {
  code: string;
  name: string;
  type: string;
  amount: number;
  minAmount: number;
  state: string;
  orderNo?: string | null;
  claimedAt: string;
}

interface MemberQuote {
  id: string;
  quoteNo: string;
  company: string | null;
  items: any;
  totalMin: string | null;
  totalMax: string | null;
  currency: string;
  status: string;
  reviewStatus: string;
  createdAt: string;
  /** 是否可下载报价单 PDF（服务端按放行判据判定，见 app/api/public/member/route.ts 的 quotes 分支） */
  canDownloadPdf?: boolean;
}

interface MemberDownload {
  id: string;
  resourceType: string;
  resourceName: string | null;
  status: string;
  createdAt: string;
  downloadUrl: string | null;
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600",
  confirmed: "bg-blue-50 text-blue-600",
  completed: "bg-green-50 text-green-600",
  cancelled: "bg-gray-100 text-gray-500",
};

const INDUSTRIES = ["semiconductor", "jewelry", "optical", "newEnergy", "quantum", "precision", "other"];

type TabKey = "quotes" | "orders" | "downloads" | "favorites" | "invoices" | "addresses" | "profile";

export default function MemberCenterPage() {
  const { locale } = useI18n();
  const router = useRouter();
  const loc = createLocalizedGetter(locale);
  const [me, setMe] = useState<any>(null);
  const [tab, setTab] = useState<TabKey>("quotes");
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [coupons, setCoupons] = useState<MemberCoupon[]>([]);
  const [quotes, setQuotes] = useState<MemberQuote[]>([]);
  const [downloads, setDownloads] = useState<MemberDownload[]>([]);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // 企业资料
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  // 改密
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [savedTip, setSavedTip] = useState("");
  const [pwdTip, setPwdTip] = useState("");
  // 发票信息
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  // 收货地址
  const [addr, setAddr] = useState<any>({});
  const [addrTip, setAddrTip] = useState("");
  const [invTip, setInvTip] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/public/member");
      const d = await r.json();
      if (!d || !d.ok) {
        setMe(null);
        return;
      }
      setMe({ ...d.member, level: d.level || null });
      setName(d.member.name || "");
      setCompany(d.member.company || "");
      setIndustry(d.member.industry || "");
      setCountry(d.member.country || "");
      setPhone(d.member.phone || "");
      setInvoiceTitle(d.member.invoiceTitle || "");
      setTaxNo(d.member.taxNo || "");
      setInvoiceEmail(d.member.invoiceEmail || "");
      setAddr(d.member.address || {});
      const fr = await fetch("/api/public/member?action=favorites");
      const fd = await fr.json();
      if (fd && fd.ok) setFavs(fd.favorites || []);
      const or = await fetch("/api/public/member/orders");
      const od = await or.json();
      if (od && od.ok) setOrders(od.orders || []);
      const cr = await fetch("/api/public/member/coupons");
      const cd = await cr.json();
      if (cd && cd.ok) setCoupons(cd.coupons || []);
      const qr = await fetch("/api/public/member?action=quotes");
      const qd = await qr.json();
      if (qd && qd.ok) setQuotes(qd.quotes || []);
      const dl = await fetch("/api/public/member?action=downloads");
      const dd = await dl.json();
      if (dd && dd.ok) setDownloads(dd.downloads || []);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 下载本人报价单 PDF。
   * 路由 `/api/quote/pdf` **只接受 POST** 且只读 `body.quoteNo`（原 `<a href>` 的 GET 必然 405）；
   * 会员 token 在 HttpOnly cookie `zw_member_token` 里，同源 fetch 自动携带 ⇒ 命中「会员本人归属」。
   */
  const downloadQuotePdf = async (quoteNo: string) => {
    try {
      const res = await fetch("/api/quote/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ quoteNo }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        alert((d && d.error) || memberT(locale, "downloadPdfFailed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quoteNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert(memberT(locale, "downloadPdfFailed"));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveInvoice = async () => {
    const r = await fetch("/api/public/member", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceTitle, taxNo, invoiceEmail }),
    });
    const d = await r.json();
    setInvTip(d && d.ok ? "已保存" : (d?.error || "保存失败"));
    if (d && d.ok) setTimeout(() => setInvTip(""), 3000);
  };

  const saveAddress = async () => {
    const r = await fetch("/api/public/member", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addr }),
    });
    const d = await r.json();
    setAddrTip(d && d.ok ? "已保存" : (d?.error || "保存失败"));
    if (d && d.ok) setTimeout(() => setAddrTip(""), 3000);
  };

  const setAddrField = (k: string, v: string) => setAddr((a: any) => ({ ...(a || {}), [k]: v }));

  const saveProfile = async () => {
    const r = await fetch("/api/public/member", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, company, industry, country, locale }),
    });
    const d = await r.json();
    if (d && d.ok) {
      setSavedTip(memberT(locale, "saved"));
      load();
    }
  };

  const savePwd = async () => {
    setPwdTip("");
    const r = await fetch("/api/public/member", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
    });
    const d = await r.json();
    if (d && d.ok) {
      setPwdTip(memberT(locale, "saved"));
      setOldPwd("");
      setNewPwd("");
    } else {
      setPwdTip(d?.error || "error");
    }
  };

  const unfav = async (productId: string) => {
    await fetch(`/api/public/member/favorites/${productId}`, { method: "DELETE" });
    setFavs((prev) => prev.filter((f) => f.productId !== productId));
  };

  const showOrder = async (orderNo: string) => {
    try {
      const r = await fetch(`/api/public/member/orders?orderNo=${encodeURIComponent(orderNo)}`);
      const d = await r.json();
      if (d && d.ok) setOrderDetail(d.order);
    } catch {
      /* 忽略 */
    }
  };

  if (loading) {
    return <div className="container py-20 text-center text-gray-500">...</div>;
  }

  if (!me) {
    return (
      <div className="container max-w-md py-20 text-center">
        <p className="text-gray-600 mb-6">{memberT(locale, "loginRequired")}</p>
        <Link href="/member/login" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-dark">
          {memberT(locale, "toLogin")}
        </Link>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "quotes", label: memberT(locale, "myQuotes") },
    { key: "orders", label: memberT(locale, "myOrders") },
    { key: "downloads", label: memberT(locale, "myDownloads") },
    { key: "favorites", label: memberT(locale, "myFavorites") },
    { key: "invoices", label: "发票信息" },
    { key: "addresses", label: "收货地址" },
    { key: "profile", label: memberT(locale, "businessProfile") },
  ];

  const levelBadgeCls =
    me.level?.key === "black" ? "bg-gray-900 text-white" :
    me.level?.key === "gold" ? "bg-amber-100 text-amber-700" :
    me.level?.key === "silver" ? "bg-slate-100 text-slate-600" :
    "bg-gray-100 text-gray-500";

  const reviewLabel = (s: string) =>
    s === "approved" ? memberT(locale, "reviewApproved") : s === "rejected" ? memberT(locale, "reviewRejected") : memberT(locale, "reviewPending");

  const quoteStatusLabel = (s: string) =>
    s === "processing" ? memberT(locale, "quoteStatusProcessing") : s === "deal" ? memberT(locale, "quoteStatusDeal") : s === "closed" ? memberT(locale, "quoteStatusClosed") : memberT(locale, "quoteStatusNew");

  const dlStatusLabel = (s: string) =>
    s === "approved" ? memberT(locale, "downloadStatusApproved") : s === "rejected" ? memberT(locale, "downloadStatusRejected") : memberT(locale, "downloadStatusPending");

  return (
    <div className="container py-12">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">{memberT(locale, "memberCenter")}</h1>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 bg-red-50 rounded-lg px-3 py-1.5">
          <LifeBuoy size={14} /> 客户门户（授权 / 工单 / 资料）
        </Link>
      </div>

      {/* 米思米式企业信息卡 */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {(me.company || me.name || "M").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">{me.company || me.name}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelBadgeCls}`}>{me.level?.name || "普通会员"}</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">{me.email}</p>
            </div>
          </div>
          {me.customerNo && (
            <div>
              <div className="text-xs text-gray-400">{memberT(locale, "customerNo")}</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-gray-900">{me.customerNo}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-400">{memberT(locale, "industry")}</div>
            <div className="mt-0.5 text-sm font-medium text-gray-800">
              {me.industry ? memberT(locale, "industry" + me.industry[0].toUpperCase() + me.industry.slice(1)) : "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">{memberT(locale, "country")}</div>
            <div className="mt-0.5 text-sm font-medium text-gray-800">{me.country || "-"}</div>
          </div>
          {me.level && (
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-400">{memberT(locale, "myLevel")}</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">{me.level.points}</span>
                <span className="text-xs text-gray-400">pts</span>
                {me.level.discount > 0 && (
                  <span className="ms-2 text-xs font-medium text-primary">{me.level.discount}% off</span>
                )}
              </div>
              {me.level.nextLevel ? (
                <div className="mt-1.5 h-1.5 w-40 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, me.level.progress || 0))}%` }} />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 米思米式侧栏 + 内容区 */}
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-52 shrink-0">
          <nav className="flex flex-wrap gap-1 lg:flex-col">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3.5 py-2.5 text-sm font-medium text-left transition-colors ${
                  tab === t.key
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">

      {/* 我的询价单 */}
      {tab === "quotes" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {quotes.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              {memberT(locale, "quotesEmpty")}
              <Link href="/products" className="ml-1 text-primary hover:underline">→</Link>
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {quotes.map((q) => (
                <div key={q.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">{q.quoteNo}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{quoteStatusLabel(q.status)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${q.reviewStatus === "approved" ? "bg-green-50 text-green-600" : q.reviewStatus === "rejected" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
                        {reviewLabel(q.reviewStatus)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {Array.isArray(q.items) ? `${q.items.length} 项` : ""}
                      {q.totalMin ? ` · ${q.totalMin} ~ ${q.totalMax || q.totalMin} ${q.currency}` : " · 面议"}
                      {" · "}
                      {new Date(q.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {q.canDownloadPdf && (
                    <button
                      type="button"
                      onClick={() => downloadQuotePdf(q.quoteNo)}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary hover:text-white"
                    >
                      <FileText className="h-4 w-4" />
                      {memberT(locale, "downloadPdf")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 我的订单 */}
      {tab === "orders" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-medium text-gray-900">
            {memberT(locale, "myOrders")}
            {orders.length > 0 && <span className="ms-2 text-sm text-gray-400">({orders.length})</span>}
          </h2>
          {orders.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">{memberT(locale, "ordersEmpty")}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.map((o) => (
                <div key={o.orderNo} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">{o.orderNo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${ORDER_STATUS_COLOR[o.status] || "bg-gray-100 text-gray-500"}`}>{o.statusLabel}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {o.itemsCount} 件 · {o.currency === "USD" ? "$" : "¥"}{o.amount.toLocaleString()} · {new Date(o.createdAt).toLocaleString()}
                      {o.trackingNo ? ` · ${o.trackingNo}` : ""}
                    </p>
                    {o.shippingStatus && o.shippingStatus !== "not_shipped" && (
                      <p className="mt-1 text-xs">
                        <span className={o.shippingStatus === "delivered" ? "text-green-600" : "text-blue-600"}>
                          {o.shippingStatus === "delivered" ? "已送达" : "已发货"}
                        </span>
                        {o.shippingCompany ? ` · ${shippingName(o.shippingCompany)}` : ""}
                        {o.shippedAt ? ` · ${new Date(o.shippedAt).toLocaleDateString()}` : ""}
                      </p>
                    )}
                  </div>
                  <button onClick={() => showOrder(o.orderNo)} className="text-sm text-primary hover:underline">
                    {memberT(locale, "orderDetail")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 我的下载 */}
      {tab === "downloads" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {downloads.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">{memberT(locale, "downloadsEmpty")}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {downloads.map((d) => (
                <div key={d.id} className="flex items-center gap-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-gray-900">{d.resourceName || d.resourceType}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${d.status === "approved" ? "bg-green-50 text-green-600" : d.status === "rejected" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
                        {dlStatusLabel(d.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{new Date(d.createdAt).toLocaleString()}</p>
                  </div>
                  {d.downloadUrl && d.status === "approved" && (
                    <a href={d.downloadUrl} className="text-sm text-primary hover:underline">{memberT(locale, "download")}</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 我的收藏 */}
      {tab === "favorites" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-medium text-gray-900">
            {memberT(locale, "myFavorites")}
            {favs.length > 0 && <span className="ms-2 text-sm text-gray-400">({favs.length})</span>}
          </h2>
          {favs.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">{memberT(locale, "favoritesEmpty")}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {favs.map((f) => (
                <div key={f.id} className="flex items-center gap-4 py-3">
                  {f.product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.product.image} alt={loc.get(f.product, "name")} className="h-14 w-14 rounded-md object-cover bg-gray-100" />
                  ) : (
                    <div className="h-14 w-14 rounded-md bg-gray-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${f.product.slug}`} className="block truncate text-sm font-medium text-gray-900 hover:text-primary">
                      {loc.get(f.product, "name") || f.product.model}
                    </Link>
                    <p className="text-xs text-gray-400">{f.product.model}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/products/${f.product.slug}`} className="text-sm text-primary hover:underline">
                      {memberT(locale, "viewProduct")}
                    </Link>
                    <button onClick={() => unfav(f.productId)} className="text-sm text-gray-400 hover:text-red-500">
                      {memberT(locale, "unfavorite")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 发票信息 */}
      {tab === "invoices" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-medium text-gray-900">发票信息（下单开票默认使用）</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">发票抬头</label>
              <input value={invoiceTitle} onChange={(e) => setInvoiceTitle(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" placeholder="公司全称（个人可填姓名）" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">纳税人识别号</label>
              <input value={taxNo} onChange={(e) => setTaxNo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" placeholder="选填" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">发票接收邮箱</label>
              <input value={invoiceEmail} onChange={(e) => setInvoiceEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" placeholder="选填，电子发票发送至此邮箱" />
            </div>
            {invTip && <p className="text-sm text-green-600">{invTip}</p>}
            <button onClick={saveInvoice} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-dark">保存发票信息</button>
          </div>
        </div>
      )}

      {/* 收货地址 */}
      {tab === "addresses" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-medium text-gray-900">默认收货地址（下单自动带入）</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-700 mb-1">收货人</label>
              <input value={addr.name || ""} onChange={(e) => setAddrField("name", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">联系电话</label>
              <input value={addr.phone || ""} onChange={(e) => setAddrField("phone", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">省份</label>
              <input value={addr.province || ""} onChange={(e) => setAddrField("province", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">城市</label>
              <input value={addr.city || ""} onChange={(e) => setAddrField("city", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">区/县</label>
              <input value={addr.district || ""} onChange={(e) => setAddrField("district", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">详细地址</label>
              <input value={addr.detail || ""} onChange={(e) => setAddrField("detail", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" placeholder="街道、门牌号、楼层等" />
            </div>
          </div>
          {addrTip && <p className="mt-3 text-sm text-green-600">{addrTip}</p>}
          <button onClick={saveAddress} className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-dark">保存收货地址</button>
        </div>
      )}

      {/* 企业资料 */}
      {tab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-medium text-gray-900">{memberT(locale, "businessProfile")}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "name")}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "company")}</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "industry")}</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary">
                  <option value="">-</option>
                  {INDUSTRIES.map((k) => (
                    <option key={k} value={k}>{memberT(locale, "industry" + k[0].toUpperCase() + k.slice(1))}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "country")}</label>
                <input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "phone")}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "email")}</label>
                <input value={me.email} disabled className="w-full border border-gray-100 rounded-lg px-3 py-2 text-gray-400 bg-gray-50" />
              </div>
              {savedTip && <p className="text-sm text-green-600">{savedTip}</p>}
              <button onClick={saveProfile} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-dark">
                {memberT(locale, "save")}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm self-start">
            <h2 className="mb-4 text-base font-medium text-gray-900">{memberT(locale, "changePassword")}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "oldPassword")}</label>
                <input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "newPassword")}</label>
                <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary" />
              </div>
              {pwdTip && <p className="text-sm text-red-600">{pwdTip}</p>}
              <button onClick={savePwd} className="w-full rounded-lg border border-primary py-2.5 text-sm font-medium text-primary hover:bg-primary hover:text-white">
                {memberT(locale, "save")}
              </button>
            </div>
            {coupons.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <h3 className="mb-2 text-sm font-medium text-gray-700">{memberT(locale, "myCoupons")}</h3>
                <div className="space-y-1.5">
                  {coupons.slice(0, 5).map((c) => (
                    <div key={c.code} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{c.name}</span>
                      <span className={`rounded-full px-2 py-0.5 ${c.state === "usable" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                        {c.state === "usable" ? memberT(locale, "couponUsable") : c.state === "used" ? memberT(locale, "couponUsed") : memberT(locale, "couponExpired")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        </div>
      </div>

      {/* 订单详情弹窗 */}
      {orderDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={() => setOrderDetail(null)}>
          <div className="mt-10 w-full max-w-lg rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold font-mono">{orderDetail.orderNo}</h3>
              <button onClick={() => setOrderDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${ORDER_STATUS_COLOR[orderDetail.status] || "bg-gray-100 text-gray-500"}`}>{orderDetail.statusLabel}</span>
            </div>
            <div className="mt-4 rounded-xl border border-gray-100">
              {(orderDetail.items || []).map((it: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5 text-sm last:border-0">
                  <div className="flex items-center gap-3">
                    {it.cover && <img src={it.cover} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                    <span>{it.name} × {it.qty}</span>
                  </div>
                  <span className="font-medium">{it.price ? `¥${(Number(it.price) * Number(it.qty)).toLocaleString()}` : "面议"}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3 text-base font-semibold">
                <span>{memberT(locale, "orderAmount")}</span>
                <span className="text-primary">¥{Number(orderDetail.amount).toLocaleString()}</span>
              </div>
            </div>
            {orderDetail.shippingCompany || orderDetail.trackingNo ? (
              <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-gray-800">
                  <Truck className="h-4 w-4 text-primary" />
                  {memberT(locale, "orderShipping")}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${orderDetail.shippingStatus === "delivered" ? "bg-green-50 text-green-600" : orderDetail.shippingStatus === "shipped" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                    {orderDetail.shippingStatus === "delivered" ? "已送达" : orderDetail.shippingStatus === "shipped" ? "已发货" : "待发货"}
                  </span>
                </div>
                <div className="mt-1 space-y-1 text-gray-600">
                  {orderDetail.shippingCompany && <div>承运：{shippingName(orderDetail.shippingCompany)}</div>}
                  {orderDetail.trackingNo && (
                    <div className="flex items-center gap-1">
                      物流单号：<span className="font-mono">{orderDetail.trackingNo}</span>
                      {shippingUrl(orderDetail.shippingCompany) && (
                        <a href={shippingUrl(orderDetail.shippingCompany)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          查询物流
                        </a>
                      )}
                    </div>
                  )}
                  {orderDetail.shippedAt && <div className="text-xs text-gray-400">发货时间：{new Date(orderDetail.shippedAt).toLocaleString()}</div>}
                  {orderDetail.deliveredAt && <div className="text-xs text-green-600">送达时间：{new Date(orderDetail.deliveredAt).toLocaleString()}</div>}
                </div>
              </div>
            ) : null}
            {orderDetail.remark && <div className="mt-3 text-sm text-gray-500">备注：{orderDetail.remark}</div>}
            <div className="mt-4 text-xs text-gray-400">下单时间：{new Date(orderDetail.createdAt).toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
