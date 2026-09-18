"use client";

import PageTitle from "@/components/ui/PageTitle";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useProductTabs } from "@/lib/api/useProducts";
import PageHero from "@/components/ui/PageHero";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Factory,
  Cog,
  GraduationCap,
  Wrench,
  Send,
  HelpCircle,
} from "lucide-react";

interface CartItem {
  id: string;
  qty: number;
}

/** 后台可配置的询价附加需求选项（多语 label） */
interface QuoteOption {
  key: string;
  icon: string;
  label: { zh: string; en: string; ja: string; ko: string; fr: string; ar: string };
  enabled: boolean;
}

// icon key -> lucide 组件映射（未知 icon 回退 HelpCircle）
const ICON_MAP: Record<string, any> = {
  support: Factory,
  turnkey: Cog,
  training: GraduationCap,
  custom: Wrench,
  other: CheckCircle2,
};

// 前端简化判定：是否中国企业名称（需核实）
function looksChineseCompany(n: string): boolean {
  if (!n || !n.trim()) return false;
  const v = n.trim();
  if (!/[\u4e00-\u9fa5]/.test(v)) return false;
  return /公司|集团|股份|有限|厂|研究所|研究院|科技|实业|控股|工作室|商贸|贸易|工程|材料|设备|电子|半导体|光学|新能源/.test(v);
}

// 取图片字符串（兼容字符串/对象/数组）
function getImgStr(x: any): string {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (Array.isArray(x)) return getImgStr(x[0]);
  if (typeof x === "object") return typeof x.url === "string" ? x.url : "";
  return "";
}

export default function QuoteCartPage() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const router = useRouter();
  const { productTabs } = useProductTabs();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState<QuoteOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [companyVerify, setCompanyVerify] = useState<{ state: "idle" | "checking" | "verified" | "failed" | "skip"; msg: string }>({ state: "idle", msg: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("quote_cart");
      setCart(raw ? JSON.parse(raw) : []);
    } catch (e) {
      setCart([]);
    }
  }, []);

  // 拉取后台可配置的附加需求选项（多语）
  useEffect(() => {
    fetch("/api/public/quote-options")
      .then((r) => r.json())
      .then((res) => {
        const list: QuoteOption[] = Array.isArray(res?.data) ? res.data : [];
        setOptions(list.filter((o) => o.enabled));
      })
      .catch(() => {})
      .finally(() => setOptionsLoading(false));
  }, []);

  const idMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const tab of productTabs) {
      for (const c of tab.categories) {
        for (const p of c.models) m.set(String(p.id), p);
      }
    }
    return m;
  }, [productTabs]);

  const items = cart
    .map((c) => ({ ...c, product: idMap.get(c.id) }))
    .filter((x) => x.product);

  const persist = (next: CartItem[]) => {
    setCart(next);
    try {
      localStorage.setItem("quote_cart", JSON.stringify(next));
    } catch (e) {
      /* ignore */
    }
  };

  const setQty = (id: string, qty: number) => {
    const next = cart.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x));
    persist(next);
  };
  const removeItem = (id: string) => {
    persist(cart.filter((x) => x.id !== id));
  };

  const toggleOption = (key: string) => {
    setSelectedOptions((o) => ({ ...o, [key]: !o[key] }));
  };

  // 总价计算
  let totalMin = 0;
  let totalMax = 0;
  let hasPrice = false;
  let allPriced = true;
  for (const it of items) {
    const p = it.product;
    const min = p?.priceMin != null ? Number(p.priceMin) : null;
    const max = p?.priceMax != null ? Number(p.priceMax) : null;
    if (min && min > 0) {
      hasPrice = true;
      totalMin += min * it.qty;
    } else {
      allPriced = false;
    }
    if (max && max > 0) totalMax += max * it.qty;
  }

  const getVisitorKey = (): string => {
    try {
      let key = localStorage.getItem("zw_visitor_key");
      if (!key) {
        key = "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem("zw_visitor_key", key);
      }
      return key;
    } catch {
      return "v_" + Date.now().toString(36);
    }
  };

  const submit = async () => {
    // 公司名称预检：中国企业名称需先通过真实性核实
    if (company.trim()) {
      if (looksChineseCompany(company)) {
        setError("");
        setCompanyVerify({ state: "checking", msg: "" });
        try {
          const vres = await fetch("/api/public/company-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: company }),
          });
          const vd = await vres.json();
          if (vd?.skip) {
            setCompanyVerify({ state: "skip", msg: "" });
          } else if (vd?.ok) {
            setCompanyVerify({ state: "verified", msg: vd.message || "" });
          } else {
            setCompanyVerify({ state: "failed", msg: vd?.message || "公司名称未能核实" });
            setError(vd?.message || "公司名称未能核实，请确认后重试");
            return;
          }
        } catch (e) {
          setCompanyVerify({ state: "failed", msg: "公司核实服务暂不可用，请稍后重试" });
          setError("公司核实服务暂不可用，请稍后重试");
          return;
        }
      }
    }
    if (!company.trim()) {
      setError(t("quoteCompanyRequired") || "公司名称必填");
      return;
    }
    if (!name.trim()) {
      setError(t("quoteNameRequired") || "姓名必填");
      return;
    }
    if (!phone.trim()) {
      setError(t("quotePhoneRequired") || "电话必填");
      return;
    }
    if (!email.trim()) {
      setError(t("quoteEmailRequired") || "邮箱必填");
      return;
    }
    // 简单邮箱格式校验
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("quoteEmailInvalid") || "请输入有效的邮箱地址");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          name,
          phone,
          email,
          message,
          options: options
            .filter((o) => selectedOptions[o.key])
            .map((o) => ({
              key: o.key,
              label: o.label[locale] || o.label.zh || o.key,
              checked: true,
            })),
          items: cart.map((x) => ({ id: x.id, qty: x.qty })),
          locale,
          sourcePage: typeof window !== "undefined" ? window.location.href : "",
          visitorKey: getVisitorKey(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.quoteNo) {
        try {
          localStorage.removeItem("quote_cart");
        } catch (e) {
          /* ignore */
        }
        router.push(`/quote/success?no=${data.quoteNo}`);
      } else {
        setError(data.error || "提交失败，请重试");
      }
    } catch (e) {
      setError("提交失败，请检查网络后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const optLabel = (o: QuoteOption) => (o.label && o.label[locale]) || o.label?.zh || o.key;

  return (
      <>
<PageTitle title={t("quoteCartTitle") || "询价车"} fallback="VALTRIX VALTRIX" />
    <div className="bg-white">
      <PageHero
        title={t("quoteCartTitle")}
        subtitle={t("quoteFormTitle")}
        breadcrumb={t("quoteCartTitle")}
      />
      <div className="max-w-6xl mx-auto px-4 py-16">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart size={48} className="mx-auto text-dark-200 mb-4" />
            <p className="text-dark-500 mb-6">{t("quoteCartEmpty")}</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm"
            >
              <ArrowLeft size={16} className="rtl-flip" />
              {t("browseProducts")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 产品列表 */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-dark-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-dark-100 bg-dark-50/60">
                  <ShoppingCart size={18} className="text-primary" />
                  <span className="font-semibold text-dark">{t("quoteCartTitle")}</span>
                  <span className="text-xs text-dark-400 ml-1">({items.length})</span>
                </div>
                {items.map((it, idx) => {
                  const p = it.product;
                  const min = p.priceMin != null ? Number(p.priceMin) : null;
                  const max = p.priceMax != null ? Number(p.priceMax) : null;
                  const unit = p.priceUnit || "元/台";
                  let priceText = t("priceOnRequest");
                  if (min && max && min > 0 && max > 0) {
                    priceText = `¥${min.toLocaleString()} - ¥${max.toLocaleString()} ${unit}`;
                  } else if (min && min > 0) {
                    priceText = `¥${min.toLocaleString()} ${unit} 起`;
                  }
                  let subtotal = "—";
                  if (min && max && min > 0 && max > 0) {
                    subtotal = `¥${(min * it.qty).toLocaleString()} - ¥${(max * it.qty).toLocaleString()}`;
                  } else if (min && min > 0) {
                    subtotal = `¥${(min * it.qty).toLocaleString()} 起`;
                  }
                  const img =
                    getImgStr(p.image) ||
                    getImgStr(Array.isArray(p.images) ? p.images[0] : "") ||
                    "/placeholders/generic-tech.webp";
                  return (
                    <div
                      key={it.id}
                      className={`flex items-center gap-4 px-5 py-4 ${idx !== 0 ? "border-t border-dark-100" : ""} hover:bg-dark-50/40 transition-colors`}
                    >
                      {/* 图片 */}
                      <div className="w-16 h-16 shrink-0 rounded-xl bg-dark-50 border border-dark-100 overflow-hidden flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={loc.get(p, "name")} className="w-full h-full object-cover" />
                      </div>
                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-dark truncate">{loc.get(p, "name")}</div>
                        <div className="text-xs text-dark-400 mt-0.5">{p.model}</div>
                        <div className="text-xs text-dark-500 mt-1">{priceText}</div>
                      </div>
                      {/* 数量 */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQty(it.id, it.qty - 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-100 text-dark-600 hover:bg-dark-100 transition-colors"
                          aria-label="minus"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-11 text-center text-dark-800 text-sm font-medium">{it.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(it.id, it.qty + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-100 text-dark-600 hover:bg-dark-100 transition-colors"
                          aria-label="plus"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {/* 小计 */}
                      <div className="text-right shrink-0 min-w-[110px]">
                        <div className="text-xs text-dark-400">{t("subtotal")}</div>
                        <div className="font-semibold text-dark-800 text-sm mt-0.5">{subtotal}</div>
                      </div>
                      {/* 删除 */}
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="p-2 text-dark-300 hover:text-red-500 transition-colors shrink-0"
                        title="移除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 总价 */}
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-5 flex items-center justify-between">
                <span className="text-dark-700 font-semibold">{t("estimatedTotal")}</span>
                <span className="text-xl lg:text-2xl font-bold text-primary">
                  {allPriced && hasPrice && totalMax > 0
                    ? `¥${totalMin.toLocaleString()} - ¥${totalMax.toLocaleString()}`
                    : t("priceOnRequest")}
                </span>
              </div>
              <p className="mt-2 text-xs text-dark-400">{t("quoteTotalNote") || "以上为产品参考价估算，最终报价以销售审核确认后的报价单为准。"}</p>
            </div>

            {/* 联系表单 */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl bg-white p-6 border border-dark-100 shadow-sm text-left">
                <h2 className="font-bold text-lg text-dark mb-1">{t("quoteFormTitle")}</h2>
                <p className="text-xs text-dark-400 mb-5">{t("quoteFormTip") || "请留下您的联系方式，我们将尽快与您联系确认报价。"}</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">
                      {t("quoteCompany")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={company}
                      onChange={(e) => { setCompany(e.target.value); if (companyVerify.state !== "idle") setCompanyVerify({ state: "idle", msg: "" }); }}
                      onBlur={async () => {
                        const c = company.trim();
                        if (!c) { setCompanyVerify({ state: "idle", msg: "" }); return; }
                        if (!looksChineseCompany(c)) { setCompanyVerify({ state: "skip", msg: "" }); return; }
                        setCompanyVerify({ state: "checking", msg: "" });
                        try {
                          const vres = await fetch("/api/public/company-verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: c }),
                          });
                          const vd = await vres.json();
                          if (vd?.skip) setCompanyVerify({ state: "skip", msg: "" });
                          else if (vd?.ok) setCompanyVerify({ state: "verified", msg: vd.message || "公司名称核实通过" });
                          else setCompanyVerify({ state: "failed", msg: vd?.message || "公司名称未能核实" });
                        } catch (e) {
                          setCompanyVerify({ state: "failed", msg: "公司核实服务暂不可用，请稍后重试" });
                        }
                      }}
                      className="w-full px-3 py-2.5 border border-dark-100 rounded-lg bg-dark-50/40 text-dark-800 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      placeholder={t("quoteCompany")}
                    />
                    {companyVerify.state === "checking" && (
                      <p className="mt-1 text-xs text-dark-400">正在核实公司名称…</p>
                    )}
                    {companyVerify.state === "verified" && (
                      <p className="mt-1 text-xs text-green-600">✓ {companyVerify.msg || "公司名称核实通过"}</p>
                    )}
                    {companyVerify.state === "failed" && (
                      <p className="mt-1 text-xs text-red-500">✕ {companyVerify.msg || "公司名称未能核实"}</p>
                    )}
                    {companyVerify.state === "skip" && (
                      <p className="mt-1 text-xs text-dark-400">非中国企业名称，无需核实</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">
                      {t("quoteName")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-dark-100 rounded-lg bg-dark-50/40 text-dark-800 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      placeholder={t("quoteName")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">
                      {t("quotePhone")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 border border-dark-100 rounded-lg bg-dark-50/40 text-dark-800 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      placeholder={t("quotePhone")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">
                      {t("quoteEmail")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-dark-100 rounded-lg bg-dark-50/40 text-dark-800 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      placeholder={t("quoteEmail")}
                    />
                  </div>

                  {/* 附加需求（后台可配置、多语） */}
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2">
                      <span className="inline-flex items-center gap-1">
                        <FileText size={14} className="text-primary" />
                        {t("quoteOptionsTitle")}
                      </span>
                    </label>
                    {optionsLoading ? (
                      <div className="text-xs text-dark-400 py-1">…</div>
                    ) : options.length === 0 ? (
                      <div className="text-xs text-dark-400 py-1">{t("quoteOptionsEmpty") || "暂无附加需求选项"}</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {options.map((o) => {
                          const Icon = ICON_MAP[o.icon] || HelpCircle;
                          const active = !!selectedOptions[o.key];
                          return (
                            <button
                              key={o.key}
                              type="button"
                              onClick={() => toggleOption(o.key)}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                                active
                                  ? "border-primary bg-primary/5 text-primary-700"
                                  : "border-dark-100 bg-white text-dark-600 hover:border-primary/40"
                              }`}
                            >
                              <Icon size={16} className={active ? "text-primary" : "text-dark-300"} />
                              <span className="flex-1 text-left">{optLabel(o)}</span>
                              <span
                                className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  active ? "bg-primary border-primary text-white" : "border-dark-200"
                                }`}
                              >
                                {active && <CheckCircle2 size={13} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">{t("quoteMessage")}</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 border border-dark-100 rounded-lg bg-dark-50/40 text-dark-800 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      placeholder={t("quoteMessage")}
                    />
                  </div>
                  {error && <div className="text-sm text-red-500">{error}</div>}
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="w-full py-3 bg-primary hover:bg-primary-600 text-white rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    <Send size={15} />
                    {submitting ? "..." : t("quoteSubmit")}
                  </button>
                  <Link href="/products" className="block w-full text-center text-sm text-dark-400 hover:text-primary py-1.5">
                    {t("browseProducts")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
