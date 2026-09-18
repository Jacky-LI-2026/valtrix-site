"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-lg">
        <div className="relative mb-8">
          <h1 className="text-[120px] md:text-[180px] font-black text-primary/10 leading-none">500</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {t("errorTitle")}
        </h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          {t("errorDesc")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto justify-center"
          >
            <RefreshCw size={18} />
            {t("errorRetry")}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-2 border-gray-300 text-gray-700 hover:border-primary hover:text-primary px-8 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto justify-center"
          >
            <Home size={18} />
            {t("backToHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
