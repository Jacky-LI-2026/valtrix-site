"use client";

import { useState, useEffect } from "react";
import PageHero from "@/components/ui/PageHero";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import ContactMap from "@/components/ui/ContactMap";
import { usePageConfig } from "@/lib/api/usePageConfig";
import { getContactEmail, getContactPhone } from "@/lib/brand";

export default function ContactDefaultClient() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [contactData, setContactData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", company: "", phone: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [captchaId, setCaptchaId] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const { pageConfig } = usePageConfig("contact");

  // 优先从API获取联系信息，失败时使用硬编码数据
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=contact_info", { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) {
          setContactData(data.data);
        }
      })
      .catch((err) => {
        console.warn("获取联系信息失败，使用默认数据:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // 表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, source: "contact_page", captchaId, captchaAnswer, locale, visitorKey: getVisitorKey() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, message: t("submitSuccess") || "提交成功，我们会尽快与您联系！" });
        setFormData({ name: "", company: "", phone: "", email: "", subject: "", message: "" });
        setCaptchaAnswer("");
        fetchCaptcha(); // 提交成功后刷新验证码
      } else {
        setSubmitResult({ success: false, message: data.error || (t("submitFailed") || "提交失败，请稍后重试") });
        fetchCaptcha(); // 失败也刷新验证码（一次性使用）
      }
    } catch (err: any) {
      setSubmitResult({ success: false, message: t("submitFailed") || "提交失败，请稍后重试" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 获取访客唯一标识（与埋点 AnalyticsTracker 共用 localStorage）
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

  // 获取验证码
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/contact/captcha");
      const data = await res.json();
      if (data.captchaId) {
        setCaptchaId(data.captchaId);
        setCaptchaQuestion(data.question);
        setCaptchaAnswer("");
      }
    } catch (e) {
      console.error("获取验证码失败:", e);
    } finally {
      setCaptchaLoading(false);
    }
  };

  // 页面加载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, []);

  // 部署级兜底联系方式（G2）：为空时对应条目**不渲染**，绝不用写死号码/邮箱兜底
  const fallbackPhone = getContactPhone();
  const fallbackEmail = getContactEmail();

  // 默认联系信息（回退）
  const defaultContactInfo = [
    ...(fallbackPhone ? [{ icon: Phone, label: t("phone"), value: fallbackPhone, sub: "" }] : []),
    ...(fallbackEmail ? [{ icon: Mail, label: t("email"), value: fallbackEmail, sub: "" }] : []),
    { icon: MapPin, label: t("address"), value: t("address"), sub: "" },
    { icon: Clock, label: t("businessHours"), value: t("businessHours"), sub: "" },
  ];

  // 地址元素解包：兼容字符串或 {zh,en,ja,ko,fr,ar} 多语言对象
  const addrText = (a: any): string => {
    if (typeof a === "string") return a;
    if (a && typeof a === "object") return String(a[locale] || a.zh || a.en || "");
    return String(a ?? "");
  };

  // 多地址列表（按 locale 取，缺语种回退中文），兼容多地址配置
  // G2：地址只能来自后台 contact_info；未配置时**不渲染地址条目**，
  //     绝不回退到词条默认值（footerAddressDefault 为空串时 t() 会返回 key 本身，会印出 "footerAddressDefault"）
  const addressList = contactData
    ? (() => {
        const arr = loc.getArray(contactData, "addresses");
        if (arr.length > 0) return arr.map(addrText);
        const single = loc.get(contactData, "address");
        if (single) return [String(single)];
        return [];
      })()
    : [];

  // 地址自定义名称（addressMaps[i].name，支持 {zh,en,...} 对象或字符串）
  const rawAddrMaps: any[] = contactData && Array.isArray(contactData.addressMaps) ? contactData.addressMaps : [];
  const addrNameOf = (i: number): string => {
    const m = rawAddrMaps[i];
    if (!m) return "";
    const nm = m.name;
    if (typeof nm === "string") return nm;
    if (nm && typeof nm === "object") return String(nm[locale] || nm.zh || "");
    return "";
  };

  // 展示用联系方式：DB 优先，兜底取部署级 env；均为空 → 该条目不渲染
  const displayPhone = String(contactData?.phone || fallbackPhone).trim();
  const displayEmail = String(contactData?.email || fallbackEmail).trim();

  // 从API数据构建联系信息数组（地址展开为多项）
  const contactInfo = contactData ? [
    ...(displayPhone ? [{ icon: Phone, label: t("phone"), value: displayPhone, sub: loc.get(contactData, "workTime") || (t("phone")) }] : []),
    ...(displayEmail ? [{ icon: Mail, label: t("email"), value: displayEmail, sub: loc.get(contactData, "replyTime") || (t("email")) }] : []),
    ...addressList.map((addr, i) => ({
      icon: MapPin,
      label: addrNameOf(i) || (i === 0 ? t("address") : t("address") + " " + (i + 1)),
      value: addr,
      sub: i === 0 ? (loc.get(contactData, "welcome") || (t("welcomeVisit"))) : "",
    })),
    { icon: Clock, label: t("businessHours"), value: loc.get(contactData, "businessHours") || (t("businessHours")), sub: loc.get(contactData, "holiday") || (t("businessHours")) },
  ] : defaultContactInfo;

  const inquiryTypes = contactData
    ? (() => {
        const arr = loc.getArray(contactData, "inquiryTypes");
        if (arr.length > 0) return arr.map(addrText);
        return [t("inquiryProduct"), t("inquiryOdm"), t("inquiryUhp"), t("inquiryTech"), t("inquiryBusiness"), t("inquiryOther")];
      })()
    : [t("inquiryProduct"), t("inquiryOdm"), t("inquiryUhp"), t("inquiryTech"), t("inquiryBusiness"), t("inquiryOther")];

  return (
    <>
      <PageHero
        title={pageConfig?.title || t("contact")}
        titleEn={pageConfig?.titleEn || "Contact Us"}
        subtitle={pageConfig?.subtitle || t("contactPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "Whether you need product info, technical support or partnership, we'd love to hear from you"}
        breadcrumb={pageConfig?.breadcrumb || t("contact")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "Contact"}
      />

      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-8">{t("contactInfo")}</h2>
              <div className="space-y-6 mb-10">
                {contactInfo.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon size={22} className="text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-dark-400 mb-1">{item.label}</div>
                        {item.value && item.value !== item.label ? (
                          <div className="text-dark font-medium">
                            {/^[+\d][\d\s\-()]*$/.test(String(item.value)) || String(item.value).includes("@") ? (
                              <bdi dir="ltr" className="inline-block">{item.value}</bdi>
                            ) : (
                              item.value
                            )}
                          </div>
                        ) : null}
                        {item.sub && item.sub !== item.label ? (
                          <div className="text-sm text-dark-400">{item.sub}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 高德地图 */}
              <ContactMap />
            </div>

            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-dark mb-8">{t("onlineForm")}</h2>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2" htmlFor="contact-name">{t("name")} *</label>
                    <input type="text" id="contact-name" required value={formData.name} onChange={(e) => handleFieldChange("name", e.target.value)} className="w-full px-4 py-3 border border-dark-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t("downloadNamePlaceholder")} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2" htmlFor="contact-company">{t("company")}</label>
                    <input type="text" id="contact-company" value={formData.company} onChange={(e) => handleFieldChange("company", e.target.value)} className="w-full px-4 py-3 border border-dark-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t("companyNamePlaceholder")} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2" htmlFor="contact-phone">{t("phone")} *</label>
                    <input type="tel" id="contact-phone" required value={formData.phone} onChange={(e) => handleFieldChange("phone", e.target.value)} className="w-full px-4 py-3 border border-dark-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t("phonePlaceholder")} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2" htmlFor="contact-email">{t("email")} *</label>
                    <input type="email" id="contact-email" required value={formData.email} onChange={(e) => handleFieldChange("email", e.target.value)} className="w-full px-4 py-3 border border-dark-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t("emailPlaceholder")} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2" htmlFor="contact-subject">{t("inquiryType")}</label>
                  <select id="contact-subject" value={formData.subject} onChange={(e) => handleFieldChange("subject", e.target.value)} className="w-full px-4 py-3 border border-dark-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-white">
                    {inquiryTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2" htmlFor="contact-message">{t("message")} *</label>
                  <textarea id="contact-message" required rows={5} value={formData.message} onChange={(e) => handleFieldChange("message", e.target.value)} className="w-full px-4 py-3 border border-dark-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none" placeholder={t("requirementsPlaceholder")} />
                </div>
                {/* 验证码 */}
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2" htmlFor="contact-captcha">{t("captcha") || "验证码"} *</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      id="contact-captcha"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      className="flex-1 px-4 py-3 border border-dark-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      placeholder={t("captchaPlaceholder") || "请输入计算结果"}
                      maxLength={10}
                    />
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      disabled={captchaLoading}
                      className="px-5 py-3 bg-dark-50 border border-dark-200 rounded-lg text-dark-700 font-medium hover:bg-dark-100 transition-colors disabled:opacity-50 min-w-[120px] text-center"
                      title={t("refreshCaptcha") || "点击刷新验证码"}
                    >
                      {captchaLoading ? "..." : captchaQuestion ? `${captchaQuestion} = ?` : (t("refreshCaptcha") || "刷新")}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white px-8 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send size={18} />
                  {submitting ? (t("submitting") || "提交中...") : t("submit")}
                </button>
                {submitResult && (
                  <div className={`p-4 rounded-lg text-sm ${submitResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {submitResult.message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
