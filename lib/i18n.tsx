"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { defaultLocale, type Locale, translations, localeNames, localeFlags, locales } from "@/config/i18n";
import { legacyBrandPrefixedKeys } from "@/lib/brand";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof translations["zh"], fallback?: string) => string;
  localeNames: Record<Locale, string>;
  localeFlags: Record<Locale, string>;
  activeLocales: Locale[];
  locales: readonly Locale[];
  activeLanguages: any[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * 语种偏好的 localStorage 键。
 *
 * **必须是品牌中立固定键**（AGENTS.md G2）：两个 fork（企业网站 / 阀门网站）
 * 合并为同一份 Base 代码后，键名若含品牌串，A 站的品牌名会被写进 B 站
 * 用户的浏览器存储（品牌串外泄到用户存储）。站点差异一律走配置，键名恒定。
 */
const LOCALE_STORAGE_KEY = "cms-locale";

/**
 * 历史键名（**仅用于向后兼容迁移**）。
 *
 * 品牌名从 `getBrandName()`（`NEXT_PUBLIC_BRAND_NAME`）**派生**，不写死品牌 ——
 * 同一份 Base 代码在不同部署上自动得到该部署自己的旧键
 * （阀门站 → `VALTRIX-locale`，基地 → `左文科技-locale`）。
 * 末尾显式字面量是**历史 Base 键**：它生效时 `NEXT_PUBLIC_BRAND_NAME` 未必已配置，
 * 故无法仅靠派生覆盖。
 * TODO(迁移期)：确认存量用户已完成一次访问（旧键已回写新键）后，可删除显式字面量。
 * **禁止**把任何候选键用作新的写入目标。
 */
const LEGACY_LOCALE_STORAGE_KEYS = legacyBrandPrefixedKeys("-locale", [
  "左文科技-locale", // TODO(迁移期)：存量迁移完成后可删
]);

/** 读取语种偏好：优先新键；没有则读旧键并回写新键（迁移） */
function readStoredLocale(): Locale | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const current = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (current) return current as Locale;
    for (const legacyKey of LEGACY_LOCALE_STORAGE_KEYS) {
      const old = localStorage.getItem(legacyKey);
      if (old) {
        try {
          localStorage.setItem(LOCALE_STORAGE_KEY, old);
        } catch {
          /* 回写失败不影响本次读取 */
        }
        return old as Locale;
      }
    }
  } catch {
    /* localStorage 不可用（隐私模式等）时按"未保存"处理 */
  }
  return null;
}

/** 读取 URL 上的显式语种 `?lang=xx`（站点地图 hreflang 采用的入口，优先级最高） */
function readUrlLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const v = new URLSearchParams(window.location.search).get("lang");
    return v && (locales as readonly string[]).includes(v) ? (v as Locale) : null;
  } catch {
    return null;
  }
}

/** 写入语种偏好（只写品牌中立新键） */
function writeStoredLocale(l: Locale) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, l);
  } catch {
    /* localStorage 不可用时忽略（如隐私模式） */
  }
}

// 把语种写入 cookie（供服务端 generateMetadata 读取真实语种；localStorage 客户端专用）
function persistLocaleCookie(l: Locale) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (e) {
    /* cookie 写入失败不影响功能 */
  }
}

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale);
  const [activeLocales, setActiveLocales] = useState<Locale[]>(["zh", "en"]);
  const [activeLanguages, setActiveLanguages] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    // 从后台API获取已启用的语种
    const fetchLanguages = async () => {
      try {
        const res = await fetch("/api/public/languages");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const codes = data.map((l: any) => l.code) as Locale[];
          setActiveLocales(codes);
          setActiveLanguages(data);
          
          // 语种优先级：**URL 显式指定 ?lang=** > 用户手动选择(localStorage) > 后台默认语种(isDefault) > SSR 初始语种
          // ⚠️ ?lang= 必须最高：站点地图的 hreflang 就是用它做入口，点开 ?lang=ja 链接就应当看到日文，
          //    不能被浏览器里遗留的 localStorage 偏好「顶回去」。
          const urlLang = readUrlLocale();
          const saved = readStoredLocale();
          const targetLocale =
            urlLang && codes.includes(urlLang)
              ? urlLang
              : saved && codes.includes(saved)
                ? saved
                : ((data.find((l: any) => l.isDefault)?.code as Locale) || initialLocale || defaultLocale);
          setLocaleState(targetLocale);
          persistLocaleCookie(targetLocale);
          if (urlLang) writeStoredLocale(targetLocale); // 经 ?lang= 进入 → 记住该选择，后续导航保持一致
          document.documentElement.lang = targetLocale;
          document.documentElement.dir = targetLocale === "ar" ? "rtl" : "ltr";
          return;
        }
      } catch (e) {
        console.error("获取语种列表失败，使用默认语种", e);
      }
      // 降级：使用 URL 显式语种，其次 localStorage
      const urlLangFallback = readUrlLocale();
      const saved = readStoredLocale();
      const fallback = urlLangFallback || (saved && locales.includes(saved as Locale) ? saved : null);
      if (fallback) {
        setLocaleState(fallback);
        persistLocaleCookie(fallback);
        if (urlLangFallback) writeStoredLocale(fallback);
        document.documentElement.lang = fallback;
        document.documentElement.dir = fallback === "ar" ? "rtl" : "ltr";
      }
    };
    fetchLanguages();
  }, []);

  const setLocale = (newLocale: Locale) => {
    // 只允许切换到已启用的语种
    if (!activeLocales.includes(newLocale)) {
      console.warn(`语种 ${newLocale} 未启用，忽略切换`);
      return;
    }
    setLocaleState(newLocale);
    writeStoredLocale(newLocale);
    persistLocaleCookie(newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
    // 触发服务端按**新的 locale cookie** 重算 metadata。
    //
    // 为什么必须做：`<title>` / `description` / `og:*` 由服务端
    //   generateMetadata() 依据 cookie 生成（lib/seo-metadata.ts 读 `locale` cookie），
    //   而本函数只是纯客户端切换 ⇒ 不重算的话标题会**停留在切语言前那个语种**
    //   （用户报障：切到英文后浏览器 <title> 仍是中文）。
    // router.refresh() 会在**保留客户端状态**的前提下重新请求当前路由，
    //   从而让服务端按新 cookie 重新渲染并更新头部 metadata。
    try {
      router.refresh();
    } catch {
      /* 非 App Router 环境（如单测）忽略 */
    }
  };

  /**
   * 取文案。
   *
   * **第二参数 fallback（2026-09-14 新增）**：调用点常用「中文即键 + 英文兜底」写法，
   * 例如 `t("登录后查看价格", "Login to view price")`。此前实现只接受一个参数，
   * **第二参数被静默忽略** ⇒ 这些文案在任何语种下都显示中文
   * （`components/PriceDisplay.tsx` 有 15 处，属用户报的"翻译质量"问题）。
   *
   * 取值优先级（**不改变既有行为**）：
   *   1. 当前语种字典里的值
   *   2. 非中文语种 + 调用点给了 fallback → 用 fallback（避免显示中文）
   *   3. 中文字典里的值 → 4. 键本身（该模式下键即为中文文案）
   */
  const t = (key: keyof typeof translations["zh"], fallback?: string) => {
    const v = translations[locale]?.[key];
    if (typeof v === "string" && v) return v;
    if (fallback && locale !== "zh") return fallback;
    const zh = translations["zh"]?.[key];
    if (typeof zh === "string" && zh) return zh;
    return String(key);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, localeNames, localeFlags, locales, activeLocales, activeLanguages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
