"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { getContactEmail, getContactPhone } from "@/lib/brand";
import KitzPageHero from "./PageHero";

/**
 * 访客唯一标识的 localStorage 键。
 * 为什么是固定中性键：一份 Base 代码服务多个独立部署，键里带品牌串会把
 * A 站的品牌名写进 B 站用户的浏览器存储（G2）。与 lib/i18n.tsx 的 cms-locale 同族。
 */
const VISITOR_KEY_STORAGE = "cms_visitor_key";

/**
 * KITZ SCT 日式工业风 · 联系页
 *
 * 联系方式来自 site_config.contact_info（DB 优先），兜底走 lib/brand.ts 的
 * 部署级环境变量 —— 代码里不写死任何电话/邮箱/地址。
 * 表单与验证码流程与 UNILOK 对应件**逐字同构**：
 *   GET  /api/contact/captcha 取题（captchaId + question）
 *   PUT  /api/contact 提交（带 captchaId / captchaAnswer / locale / visitorKey）
 *   失败或成功后都刷新验证码（验证码是一次性的，旧题已作废）
 */
export default function KitzContactPage() {
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
        // 契约：该接口返回 { success, data }，不是裸对象
        if (!cancelled && data.success && data.data) {
          setContactData(data.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 取题：captchaId 一次性，提交后无论成败都要重新取
  const fetchCaptcha = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  // 访客唯一标识（后台 OneID 归因用）；localStorage 不可用时退化为会话内随机串
  const getVisitorKey = (): string => {
    try {
      let key = localStorage.getItem(VISITOR_KEY_STORAGE);
      if (!key) {
        key =
          "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(VISITOR_KEY_STORAGE, key);
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
          // 来源标记用于后台区分主题表单（不含任何品牌串）
          source: "contact_page_kitz",
          captchaId,
          captchaAnswer,
          locale,
          visitorKey: getVisitorKey(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, message: t("submitSuccess") });
        setFormData({
          name: "",
          company: "",
          phone: "",
          email: "",
          subject: "",
          message: "",
        });
        fetchCaptcha();
      } else {
        setSubmitResult({
          success: false,
          message: data.error || t("submitFailed"),
        });
        fetchCaptcha();
      }
    } catch {
      setSubmitResult({ success: false, message: t("submitFailed") });
      fetchCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 地址/选项解包：字段可能是字符串，也可能是**对象型多语言**（{zh,en,ja,…}）。
   * ⚠️ lib/localized.ts 只支持扁平分列（name/nameEn/…），不支持对象型，
   *    故此处在页面内做最小解包（与 UNILOK 同写法）。若后续 lib 增加对象型支持，
   *    应删掉本函数改为统一入口 —— 已在交付报告中登记为待办。
   */
  const unwrapText = (a: any): string => {
    if (typeof a === "string") return a;
    if (a && typeof a === "object") {
      const picked = a[locale] || a.zh || a.en;
      return picked === undefined || picked === null ? "" : String(picked);
    }
    return a === undefined || a === null ? "" : String(a);
  };

  // 地址列表：多地址优先，其次单地址，最后部署级兜底文案
  const addressList = contactData
    ? (() => {
        const arr = loc.getArray(contactData, "addresses");
        if (arr.length > 0) return arr.map(unwrapText);
        const single = loc.get(contactData, "address");
        if (single) return [String(single)];
        return [t("footerAddressDefault")];
      })()
    : [t("footerAddressDefault")];

  // 联系方式条目：DB 优先，兜底取部署级 env（两者都空则不显示该值）
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

  // 兜底询盘类型：仅在后台 contact_info.inquiryTypes 未配置时使用
  // （去掉了 UNILOK 那个带行业缩写的选项 —— 主题树是各部署共用的，不写死某站行业）
  const defaultInquiryTypes = [
    t("inquiryProduct"),
    t("inquiryOdm"),
    t("inquiryTech"),
    t("inquiryBusiness"),
    t("inquiryOther"),
  ];
  const inquiryTypes = contactData
    ? (() => {
        const arr = loc.getArray(contactData, "inquiryTypes");
        return arr.length > 0 ? arr.map(unwrapText) : defaultInquiryTypes;
      })()
    : defaultInquiryTypes;

  // 方形输入框：无圆角、无阴影，聚焦只换边线色
  const inputCls =
    "w-full border border-gray-200 bg-white px-4 py-3 text-sm text-dark-800 transition-colors placeholder:text-dark-300 focus:border-dark focus:outline-none";

  return (
    <>
      <KitzPageHero
        eyebrow={t("kitzEyebrowContact")}
        title={t("contact")}
        subtitle={t("kitzContactIntro")}
        breadcrumb={[{ label: t("home"), href: "/" }, { label: t("contact") }]}
      />

      <section className="bg-white py-16 lg:py-24">
        <div className="container">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            {/* 联系信息：细线行式，不用彩色卡片 */}
            <div>
              <h2 className="mb-8 flex items-center gap-3 border-b border-dark pb-4 text-sm font-semibold uppercase tracking-[0.2em] text-dark">
                {t("contactInfo")}
              </h2>
              {contactItems.length > 0 ? (
                <div className="border-t border-gray-200">
                  {contactItems.map((item, i) => {
                    const Icon = item.icon;
                    // 电话/邮箱走 bdi 强 LTR —— 阿拉伯语等 RTL 语种下号码不应被镜像
                    const isLatinValue =
                      /^[+\d][\d\s\-()]*$/.test(item.value) ||
                      String(item.value).includes("@");
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-4 border-b border-gray-200 py-6"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gray-200">
                          <Icon size={16} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-dark-400">
                            {item.label}
                          </div>
                          {item.value && (
                            <div className="text-sm font-medium text-dark">
                              {isLatinValue ? (
                                <bdi dir="ltr" className="inline-block break-all">
                                  {item.value}
                                </bdi>
                              ) : (
                                item.value
                              )}
                            </div>
                          )}
                          {item.sub && (
                            <div className="mt-0.5 text-xs text-dark-400">
                              {item.sub}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-10 text-sm text-dark-400">{t("loading")}</p>
              )}
            </div>

            {/* 在线留言 */}
            <div>
              <h2 className="mb-8 flex items-center gap-3 border-b border-dark pb-4 text-sm font-semibold uppercase tracking-[0.2em] text-dark">
                {t("onlineForm")}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-dark-700"
                      htmlFor="contact-name"
                    >
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
                    <label
                      className="mb-2 block text-sm font-medium text-dark-700"
                      htmlFor="contact-company"
                    >
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
                    <label
                      className="mb-2 block text-sm font-medium text-dark-700"
                      htmlFor="contact-phone"
                    >
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
                    <label
                      className="mb-2 block text-sm font-medium text-dark-700"
                      htmlFor="contact-email"
                    >
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
                  <label
                    className="mb-2 block text-sm font-medium text-dark-700"
                    htmlFor="contact-subject"
                  >
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
                  <label
                    className="mb-2 block text-sm font-medium text-dark-700"
                    htmlFor="contact-message"
                  >
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

                {/* 人机验证：题目按钮即刷新按钮（一次性题目，提交后自动换题） */}
                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-dark-700"
                    htmlFor="contact-captcha"
                  >
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
                      className="min-w-[130px] border border-gray-200 bg-dark-50 px-5 py-3 text-sm font-medium tabular-nums text-dark-700 transition-colors hover:border-dark disabled:opacity-50"
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
                  className="inline-flex items-center gap-2 bg-primary px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={16} />
                  {submitting ? t("submitting") : t("submit")}
                </button>

                {submitResult && (
                  <div
                    className={`border p-4 text-sm ${
                      submitResult.success
                        ? "border-primary/30 bg-primary/5 text-primary"
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

      {/* 底部提示条（细线框） */}
      <section className="bg-white pb-16 lg:pb-24">
        <div className="container">
          <div className="border border-gray-200 p-10 text-center lg:p-14">
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-dark lg:text-3xl">
              {t("kitzGetInTouch")}
            </h2>
            <p className="mx-auto mb-0 max-w-2xl text-sm leading-relaxed text-dark-500">
              {t("kitzGetInTouchDesc")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
