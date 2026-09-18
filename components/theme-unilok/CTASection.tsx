"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import CornerAccent from "./CornerAccent";

/**
 * UNILOK 精密工业风 — 询价 CTA（深蓝底白字）
 * 左：标题 + 描述；右：Contact Us 按钮 + 热线
 */
export default function CTASection() {
  const { t } = useI18n();
  const [contact, setContact] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=contact_info", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success && data.data) setContact(data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const phone = contact?.phone || "";

  return (
    <section className="relative overflow-hidden bg-primary py-20 text-white lg:py-24">
      {/* 技术图纸网格叠加 */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <CornerAccent />

      <div className="container relative">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-accent" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                {t("contact")}
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              {t("unilokCtaTitle")}
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-white/75">{t("unilokCtaDesc")}</p>
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row lg:justify-end">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 bg-accent px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-[#c93b14]"
            >
              {t("unilokCtaButton")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
            </Link>
            {phone && (
              <a
                href={`tel:${String(phone).replace(/[\s-]/g, "")}`}
                className="inline-flex items-center gap-2 border border-white/40 px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white transition hover:border-white hover:bg-white/10"
              >
                <Phone className="h-4 w-4 rtl-flip" />
                <bdi dir="ltr">{phone}</bdi>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
