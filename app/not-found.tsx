"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();

  const quickLinks = [
    { label: t("products"), href: "/products" },
    { label: t("industries"), href: "/industries" },
    { label: t("services"), href: "/services" },
    { label: t("about"), href: "/about" },
    { label: t("contact"), href: "/contact" },
  ];

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-lg">
        <div className="relative mb-8">
          <h1 className="text-[120px] md:text-[180px] font-black text-primary/10 leading-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="w-10 h-10 text-primary" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{t("notFound")}</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">{t("notFoundDesc")}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto justify-center">
            <Home size={18} />
            {t("backToHome")}
          </Link>
          <Link href="/products" className="inline-flex items-center gap-2 border-2 border-gray-300 text-gray-700 hover:border-primary hover:text-primary px-8 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto justify-center">
            <ArrowLeft size={18} />
            {t("browseProductsFooter")}
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">{t("youMayWant")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-gray-600 hover:text-primary px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
