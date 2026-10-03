"use client";

import { useEffect, useState } from "react";
import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { getContactEmail, getContactPhone } from "@/lib/brand";
import UnilokPageHero from "./PageHero";

/**
 * UNILOK 精密工业风 · 联系页
 * PageHero + 联系信息卡片（电话/邮箱/地址/工作时间）+ 在线留言表单
 */
export default function UnilokContactPage() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [contactData, setContactData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [captchaId, setCaptchaId] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=contact_info", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) {
          setContactData(data.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    fetchCaptcha();
  }, []);

  // 访客唯一标识
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          source: "contact_page_unilok",
          captchaId,
          captchaAnswer,
          locale,
          visitorKey: getVisitorKey(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, message: t("submitSuccess") });
        setFormData({ name: "", company: "", phone: "", email: "", subject: "", message: "" });
        setCaptchaAnswer("");
        fetchCaptcha();
      } else {
        setSubmitResult({
          success: false,
          message: data.error || t("submitFailed"),
        });
        fetchCaptcha();
      }
    } catch (err) {
      setSubmitResult({ success: false, message: t("submitFailed") });
    } finally {
      setSubmitting(false);
    }
  };

  // 地址元素解包（字符串 / {zh,en,...} 多语言对象）
  const addrText = (a: any): string => {
    if (typeof a === "string") return a;
    if (a && typeof a === "object") return String(a[locale] || a.zh || a.en || "");
    return String(a ?? "");
  };

  // 多地址列表
  const addressList = contactData
    ? (() => {
        const arr = loc.getArray(contactData, "addresses");
        if (arr.length > 0) return arr.map(addrText);
        const single = loc.get(contactData, "address");
        if (single) return [String(single)];
        return [t("footerAddressDefault")];
      })()
    : [t("footerAddressDefault")];

  const contactItems: { icon: any; label: string; value: string; sub?: string }[] =
    contactData
      ? [
          {
            icon: Phone,
            label: t("phone"),
            value: String(contactData.phone || getContactPhone()).trim(),
            sub: loc.get(contactData, "workTime") || "",
          },
          {
            icon: Mail,
            label: t("email"),
            value: String(contactData.email || getContactEmail()).trim(),
            sub: loc.get(contactData, "replyTime") || "",
          },
          ...addressList.map((addr, i) => ({
            icon: MapPin,
            label: i === 0 ? t("address") : `${t("address")} ${i + 1}`,
            value: addr,
            sub: i === 0 ? loc.get(contactData, "welcome") || "" : "",
          })),
          {
            icon: Clock,
            label: t("businessHours"),
            value: loc.get(contactData, "businessHours") || t("businessHours"),
            sub: loc.get(contactData, "holiday") || "",
          },
        ]
      : [];

  // 询盘类型
  const inquiryTypes = contactData
    ? (() => {
        const arr = loc.getArray(contactData, "inquiryTypes");
        if (arr.length > 0) return arr.map(addrText);
        return [
          t("inquiryProduct"),
          t("inquiryOdm"),
          t("inquiryUhp"),
          t("inquiryTech"),
          t("inquiryBusiness"),
          t("inquiryOther"),
        ];
      })()
    : [
        t("inquiryProduct"),
        t("inquiryOdm"),
        t("inquiryUhp"),
        t("inquiryTech"),
        t("inquiryBusiness"),
        t("inquiryOther"),
      ];

  const inputCls =
    "w-full border border-gray-200 bg-white px-4 py-3 text-sm text-dark-800 transition-colors placeholder:text-dark-300 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <>
      <UnilokPageHero
        eyebrow={t("unilokEyebrowContact")}
        title={t("contact")}
        subtitle={t("unilokContactIntro")}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("contact") },
        ]}
      />

      <section className="bg-white py-14 lg:py-20">
        <div className="container">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* 联系信息 */}
            <div>
              <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold text-dark">
                <span className="h-7 w-1 bg-accent" />
                {t("contactInfo")}
              </h2>
              {contactItems.length > 0 ? (
                <div className="space-y-4">
                  {contactItems.map((item, i) => {
                    const Icon = item.icon;
                    const isLink =
                      /^[+\d][\d\s\-()]*$/.test(item.value) ||
                      String(item.value).includes("@");
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-4 border border-gray-200 bg-white p-5 transition-colors hover:border-accent"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-accent/40 bg-accent/5">
                          <Icon size={20} className="text-accent" />
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1 text-xs uppercase tracking-wide text-dark-400">
                            {item.label}
                          </div>
                          {item.value && (
                            <div className="font-medium text-dark">
                              {isLink ? (
                                <bdi dir="ltr" className="inline-block break-all">
                                  {item.value}
                                </bdi>
                              ) : (
                                item.value
                              )}
                            </div>
                          )}
                          {item.sub && (
                            <div className="mt-0.5 text-sm text-dark-400">
                              {item.sub}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-10 text-dark-400">{t("loading")}</p>
              )}
            </div>

            {/* 在线留言 */}
            <div>
              <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold text-dark">
                <span className="h-7 w-1 bg-accent" />
                {t("onlineForm")}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark-700" htmlFor="contact-name">
                      {t("name")} *
                    </label>
                    <input
                      type="text"
                      id="contact-name"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                      className={inputCls}
                      placeholder={t("downloadNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark-700" htmlFor="contact-company">
                      {t("company")}
                    </label>
                    <input
                      type="text"
                      id="contact-company"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, company: e.target.value }))
                      }
                      className={inputCls}
                      placeholder={t("companyNamePlaceholder")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark-700" htmlFor="contact-phone">
                      {t("phone")} *
                    </label>
                    <input
                      type="tel"
                      id="contact-phone"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, phone: e.target.value }))
                      }
                      className={inputCls}
                      placeholder={t("phonePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark-700" htmlFor="contact-email">
                      {t("email")} *
                    </label>
                    <input
                      type="email"
                      id="contact-email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, email: e.target.value }))
                      }
                      className={inputCls}
                      placeholder={t("emailPlaceholder")}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark-700" htmlFor="contact-subject">
                    {t("inquiryType")}
                  </label>
                  <select
                    id="contact-subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, subject: e.target.value }))
                    }
                    className={`${inputCls} bg-white`}
                  >
                    {inquiryTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark-700" htmlFor="contact-message">
                    {t("message")} *
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, message: e.target.value }))
                    }
                    className={`${inputCls} resize-none`}
                    placeholder={t("requirementsPlaceholder")}
                  />
                </div>
                {/* 验证码 */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark-700" htmlFor="contact-captcha">
                    {t("captcha")} *
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      id="contact-captcha"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      className={inputCls}
                      placeholder={t("captchaPlaceholder")}
                      maxLength={10}
                    />
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      disabled={captchaLoading}
                      className="min-w-[130px] border border-gray-200 bg-dark-50 px-5 py-3 text-center font-medium text-dark-700 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                      title={t("refreshCaptcha")}
                    >
                      {captchaLoading
                        ? "..."
                        : captchaQuestion
                          ? `${captchaQuestion} = ?`
                          : t("refreshCaptcha")}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-primary px-8 py-3 font-medium text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={18} />
                  {submitting ? t("submitting") : t("submit")}
                </button>
                {submitResult && (
                  <div
                    className={`border p-4 text-sm ${
                      submitResult.success
                        ? "border-accent/20 bg-accent/5 text-accent"
                        : "border-dark-200 bg-dark-50 text-dark-700"
                    }`}
                  >
                    {submitResult.message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <h2 className="mb-4 text-2xl font-bold text-white lg:text-3xl">
            {t("unilokGetInTouch")}
          </h2>
          <p className="mx-auto mb-0 max-w-2xl text-white/80">
            {t("unilokGetInTouchDesc")}
          </p>
        </div>
      </section>
    </>
  );
}
