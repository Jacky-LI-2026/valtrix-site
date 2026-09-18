"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, Download, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import PageHero from "@/components/ui/PageHero";

export default function QuoteSuccessPage() {
  const { t } = useI18n();
  const [quoteNo, setQuoteNo] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setQuoteNo(new URLSearchParams(window.location.search).get("no") || "");
  }, []);

  async function downloadPdf() {
    if (!quoteNo || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/quote/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteNo }),
      });
      if (!res.ok) {
        let msg = "下载失败，请稍后重试";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        alert(msg);
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
    } catch (e) {
      alert("下载失败，请稍后重试");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="bg-white">
      <PageHero
        title={t("quoteSuccessTitle")}
        subtitle={t("quoteSuccessDesc")}
        breadcrumb={t("quoteSuccessTitle")}
      />
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <CheckCircle2 size={64} className="mx-auto text-green-500 mb-6" />
        <h1 className="text-3xl font-bold text-dark mb-3">{t("quoteSuccessTitle")}</h1>
        <p className="text-dark-500 text-center mb-8">{t("quoteSuccessDesc")}</p>

        <div className="bg-dark-50 rounded-xl p-6 mb-8 inline-block text-left">
          <div className="text-sm text-dark-500">{t("quoteNo")}</div>
          <div className="text-2xl font-mono font-bold text-primary mt-1" dir="ltr">
            {quoteNo}
          </div>
        </div>

        {/* 后续流程提示 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 max-w-xl mx-auto">
          {[
            { step: "1", title: t("quoteStepSubmitted"), desc: t("quoteStepSubmittedDesc") },
            { step: "2", title: t("quoteStepReview"), desc: t("quoteStepReviewDesc") },
            { step: "3", title: t("quoteStepEmail"), desc: t("quoteStepEmailDesc") },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-dark-100 bg-white p-4 text-left">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mb-2">
                {s.step}
              </div>
              <div className="font-semibold text-dark text-sm">{s.title}</div>
              <div className="text-xs text-dark-400 mt-1 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white px-6 py-3 rounded font-medium transition-all disabled:opacity-60"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {t("downloadQuotePdf")}
          </button>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white px-6 py-3 rounded font-medium transition-all"
          >
            <ArrowLeft size={16} className="rtl-flip" />
            {t("browseProducts")}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-dark-100 hover:bg-dark-200 text-dark-700 px-6 py-3 rounded font-medium transition-all"
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
