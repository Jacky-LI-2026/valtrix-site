"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useNavTabs } from "@/lib/api/useProducts";

/**
 * KITZ SCT 日式工业风 — 产品搜索条（**新组件**）
 *
 * 职责：把「按系列浏览」与「按型号搜索」收进同一条横向带里。
 * - 分类 chip：数据来自 `useNavTabs()`（即 `/api/public/nav`，2026-09-18 起导航/搜索
 *   统一走这个轻量入口 —— 原先打 `/api/public/products` 会在每页多下载约 500KB 大字段）
 * - 型号搜索：提交后跳 `/products?q=<关键词>`
 *
 * 为什么不做「不跳页的即时搜索」：`/products` 是既有页面，关键词参数由它接管；
 * 首页只负责把用户送过去，避免在首页再维护一套搜索结果渲染逻辑（双源）。
 */
export default function KitzProductSearch() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const router = useRouter();
  const { productTabs } = useNavTabs();
  const [keyword, setKeyword] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = keyword.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  return (
    <section className="border-y border-gray-200 bg-white">
      <div className="container py-10 lg:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          {/* 左：系列 chips */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-dark" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-dark-400">
                {t("kitzSearchEyebrow")}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-dark md:text-2xl">
              {t("kitzSearchTitle")}
            </h2>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                href="/products"
                className="border border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-dark-600 transition-colors hover:border-dark hover:bg-dark hover:text-white"
              >
                {t("kitzSearchAll")}
              </Link>
              {productTabs.slice(0, 6).map((tab) => (
                <Link
                  key={tab.id}
                  href={`/products?tab=${tab.id}`}
                  className="border border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-dark-600 transition-colors hover:border-dark hover:bg-dark hover:text-white"
                >
                  {loc.get(tab, "name")}
                </Link>
              ))}
            </div>
          </div>

          {/* 右：型号搜索入口 */}
          <form onSubmit={handleSubmit} className="w-full shrink-0 lg:max-w-md" role="search">
            <label
              htmlFor="kitz-model-search"
              className="block text-xs font-semibold uppercase tracking-[0.25em] text-dark-400"
            >
              {t("kitzSearchByModel")}
            </label>
            <div className="mt-3 flex border border-gray-300 focus-within:border-dark">
              <span className="flex items-center ps-4 text-dark-300" aria-hidden="true">
                <Search className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <input
                id="kitz-model-search"
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t("kitzSearchPlaceholder")}
                className="w-full bg-transparent px-3 py-3 text-sm text-dark placeholder:text-dark-300 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 bg-dark px-6 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-dark-700"
              >
                {t("kitzSearchAction")}
              </button>
            </div>
            <p className="mt-2 text-xs text-dark-400">{t("kitzSearchHint")}</p>
          </form>
        </div>
      </div>
    </section>
  );
}
