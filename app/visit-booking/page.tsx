"use client";

import PageTitle from "@/components/ui/PageTitle";
import { useState } from "react";
import PageHero from "@/components/ui/PageHero";
import CalendarInput from "@/components/ui/CalendarInput";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePageConfig } from "@/lib/api/usePageConfig";

export default function VisitBookingPage() {
  const { locale, t } = useI18n();
  const { pageConfig } = usePageConfig("visit-booking");
  const [form, setForm] = useState({
    name: "", phone: "", company: "", email: "",
    preferredDate: "", visitTime: "上午 (9:00-12:00)", visitors: "1", message: "",
  });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [bookingNo, setBookingNo] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setMsg(t("bookingFormHint") || "请填写姓名和联系电话");
      setState("error");
      return;
    }
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/visit-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          visitors: Number(form.visitors) || 1,
          visitorKey: getVisitorKey(),
          sourcePage: typeof window !== "undefined" ? window.location.pathname : "",
          locale,
        }),
      });
      const data = await res.json();
      if (res.ok && data.bookingNo) {
        setBookingNo(data.bookingNo);
        setState("done");
      } else {
        setState("error");
        setMsg(data.error || t("submitFail") || "提交失败，请稍后重试");
      }
    } catch {
      setState("error");
      setMsg(t("submitFail") || "提交失败，请稍后重试");
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none";

  return (
      <>
<PageTitle title={t("visitBookingTitle") || "考察预约"} fallback="VALTRIX VALTRIX" />
    <>
      <PageHero
        title={pageConfig?.title || t("visitBooking") || "考察预约"}
        titleEn={pageConfig?.titleEn || "Visit Booking"}
        subtitle={pageConfig?.subtitle || t("visitBookingSubtitle") || "欢迎预约到访参观考察，我们将安排专业人员接待"}
        subtitleEn={pageConfig?.subtitleEn || "Schedule a factory visit, our team will arrange professional reception"}
        breadcrumb={t("visitBooking") || "考察预约"}
        breadcrumbEn="Visit Booking"
      />

      <section className="py-14 lg:py-20 bg-white">
        <div className="container max-w-3xl">
          {state === "done" ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <CheckCircle2 size={56} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("bookingSuccess") || "预约提交成功"}</h2>
              <p className="text-gray-500 mb-6">
                {t("bookingSuccessDesc") || "我们将在 1-2 个工作日内与您联系确认，请保持电话畅通。"}
              </p>
              <div className="inline-block bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-600">
                {t("bookingNo") || "预约编号"}：<span className="font-semibold text-gray-900">{bookingNo}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-10 space-y-5">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <CalendarDays size={16} className="text-red-600" />
                {t("bookingFormHint") || "请填写以下信息，提交后我们尽快与您联系"}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookingName")} *</label>
                  <input type="text" value={form.name} onChange={set("name")} className={inputCls} placeholder={t("bookingNamePh")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookingPhone")} *</label>
                  <input type="tel" value={form.phone} onChange={set("phone")} className={inputCls} placeholder={t("bookingPhonePh")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookingCompany")}</label>
                  <input type="text" value={form.company} onChange={set("company")} className={inputCls} placeholder={t("bookingCompanyPh")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookingEmail")}</label>
                  <input type="email" value={form.email} onChange={set("email")} className={inputCls} placeholder={t("bookingEmailPh")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookingDate")}</label>
                  <CalendarInput
                    value={form.preferredDate}
                    onChange={(v) => setForm((f) => ({ ...f, preferredDate: v }))}
                    locale={locale}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookingTime")}</label>
                  <select value={form.visitTime} onChange={set("visitTime")} className={inputCls}>
                    <option value="上午 (9:00-12:00)">{t("bookingTimeMorning")}</option>
                    <option value="下午 (14:00-17:00)">{t("bookingTimeAfternoon")}</option>
                    <option value="全天">{t("bookingTimeAllDay")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookingVisitors")}</label>
                  <input type="number" min={1} max={100} value={form.visitors} onChange={set("visitors")} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookingMessage")}</label>
                <textarea value={form.message} onChange={set("message")} rows={4} className={inputCls} placeholder={t("bookingMessagePh")} />
              </div>

              {state === "error" && msg && (
                <div className="p-3 rounded-md text-sm bg-red-50 border border-red-200 text-red-700">{msg}</div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="px-8 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {state === "loading" ? t("bookingSubmitting") : t("submitBooking") || "提交预约"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
      </>
    </>
  );
}
