"use client";

import { useState, useEffect, useCallback } from "react";
import PageHero from "@/components/ui/PageHero";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { usePageConfig } from "@/lib/api/usePageConfig";
import { translations } from "@/config/i18n";

interface FaqItem {
  id: string;
  question: string;
  questionEn?: string;
  questionJa?: string;
  questionKo?: string;
  questionFr?: string;
  questionAr?: string;
  answer: string;
  answerEn?: string;
  answerJa?: string;
  answerKo?: string;
  answerFr?: string;
  answerAr?: string;
  category?: string;
  sortOrder?: number;
}

export default function FaqsPage() {
  const { locale, t } = useI18n();
  const loc = createLocalizedGetter(locale);
  // FAQ 分类名多语言字典（i18n.faqCategories），未命中（自定义分类）回退原值
  const catLabel = useCallback(
    (c: string) => {
      const dict = (translations as Record<string, any>)[locale];
      return dict?.faqCategories?.[c] || c;
    },
    [locale]
  );
  const [items, setItems] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [active, setActive] = useState("");
  const [openId, setOpenId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { pageConfig } = usePageConfig("faqs");

  const load = useCallback((cat: string) => {
    setLoading(true);
    const qs = cat ? `?category=${encodeURIComponent(cat)}` : "";
    fetch("/api/public/faqs" + qs)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) setItems(data.items);
        if (data && Array.isArray(data.categories)) setCategories(data.categories);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  // 注入 FAQPage JSON-LD（当前语种）
  useEffect(() => {
    if (!items.length) return;
    const list = items.map((it) => ({
      "@type": "Question",
      name: String(loc.get(it, "question") || it.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: String(loc.get(it, "answer") || it.answer),
      },
    }));
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: list,
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-jsonld";
    script.text = JSON.stringify(jsonLd);
    document.getElementById("faq-jsonld")?.remove();
    document.head.appendChild(script);
    return () => {
      document.getElementById("faq-jsonld")?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, locale]);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? "" : id));

  return (
    <>
      <PageHero
        title={pageConfig?.title || t("faqPageTitle")}
        titleEn={pageConfig?.titleEn || "Frequently Asked Questions"}
        subtitle={pageConfig?.subtitle || t("faqPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "Answers to the most common questions about our equipment and services"}
        breadcrumb={pageConfig?.breadcrumb || t("faq")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "FAQ"}
      />

      {/* 分类筛选 */}
      {categories.length > 0 && (
        <section className="pt-10 bg-white">
          <div className="container flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => { setActive(""); load(""); }}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                active === "" ? "bg-primary text-white border-primary" : "border-dark-100 text-dark-600 hover:border-primary/40"
              }`}
            >
              {t("allFaqs") || "全部问题"}
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => { setActive(c); load(c); }}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                  active === c ? "bg-primary text-white border-primary" : "border-dark-100 text-dark-600 hover:border-primary/40"
                }`}
              >
                {catLabel(c)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="py-12 lg:py-16 bg-white">
        <div className="container max-w-4xl">
          {loading ? (
            <div className="text-center py-20 text-dark-400">{t("loading")}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-dark-400">{t("noContent") || "暂无问题"}</div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => {
                const q = String(loc.get(it, "question") || it.question);
                const a = String(loc.get(it, "answer") || it.answer);
                const open = openId === it.id;
                return (
                  <div key={it.id} className="border border-dark-100 rounded-lg overflow-hidden bg-white">
                    <button
                      onClick={() => toggle(it.id)}
                      className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 ${
                        open ? "bg-gray-50" : ""
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <HelpCircle size={18} className="text-primary flex-shrink-0 mt-0.5" />
                        <span className="font-medium text-dark text-[15px] leading-snug">{q}</span>
                      </span>
                      <ChevronDown
                        size={18}
                        className={`text-dark-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <div className="px-5 pb-5 pl-11">
                        <div
                          className="text-sm text-dark-600 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: a }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
