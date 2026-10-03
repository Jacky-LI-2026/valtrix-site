"use client";

/**
 * SEO 多语言 alternates 注入：
 * - canonical：指向当前规范化 URL（无 ?lang 参数，避免重复内容）
 * - hreflang：六语种版本（zh-Hans 无参数；en/ja/ko/fr/ar 用 ?lang=xx）+ x-default
 * 因站点 URL 无语言前缀（locale 存 cookie/localStorage），搜索引擎无法从 URL 区分语种，
 * 故用 hreflang 显式声明语言版本，配合 sitemap.xml 的 alternates 帮助收录。
 * 仅前台注入（后台 /admin 不注入）。
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

// 除中文外的语种（?lang= 参数形式，与前台切换逻辑一致）
const HREFLANG_LOCALES = ["en", "ja", "ko", "fr", "ar"] as const;

export default function SeoAlternates() {
  const pathname = usePathname();
  const { locale } = useI18n();

  useEffect(() => {
    // ---- 服务端已输出则**完全不介入** ----
    // canonical / hreflang 现在由服务端 generateMetadata 输出
    // （app/layout.tsx → lib/seo-metadata.ts 的 buildCurrentPageAlternates）。
    // 本组件退化为**兜底**：仅当服务端没输出时（例如某些未接 metadata 的路由）才补齐。
    // 为什么必须先判断：本组件此前会**无条件覆盖** canonical 并删除全部 hreflang，
    // 若继续运行会把服务端刚输出的正确值改掉，等于白做。
    const serverCanonical = document.head.querySelector('link[rel="canonical"]');
    const serverHreflang = document.head.querySelector('link[rel="alternate"][hreflang]');
    if (serverCanonical && serverHreflang) return;

    const base = window.location.origin;
    const path = pathname && pathname !== "/" ? pathname : "";
    // 兜底口径与服务端保持一致：canonical 指向**当前语种自身**
    const selfHref = base + path + (locale && locale !== "zh" ? `?lang=${locale}` : "");
    const zhHref = base + path;

    // canonical
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", selfHref);

    // 清理旧的 alternate hreflang
    document.head
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((n) => n.remove());

    const add = (hreflang: string, href: string) => {
      const l = document.createElement("link");
      l.setAttribute("rel", "alternate");
      l.setAttribute("hreflang", hreflang);
      l.setAttribute("href", href);
      document.head.appendChild(l);
    };

    add("zh-Hans", zhHref);
    HREFLANG_LOCALES.forEach((lang) => add(lang, `${base}${path}?lang=${lang}`));
    add("x-default", zhHref);
  }, [pathname, locale]);

  return null;
}
