"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { defaultLocale, type Locale, translations, localeNames, localeFlags, locales } from "@/config/i18n";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof translations["zh"]) => string;
  localeNames: Record<Locale, string>;
  localeFlags: Record<Locale, string>;
  activeLocales: Locale[];
  locales: readonly Locale[];
  activeLanguages: any[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

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
          
          // 优先用户手动选择（localStorage），否则用后台默认语种（isDefault），再回退 SSR 初始语种
          const saved = localStorage.getItem("VALTRIX-locale") as Locale | null;
          const targetLocale = saved && codes.includes(saved) ? saved : (data.find((l: any) => l.isDefault)?.code as Locale) || initialLocale || defaultLocale;
          setLocaleState(targetLocale);
          persistLocaleCookie(targetLocale);
          document.documentElement.lang = targetLocale;
          document.documentElement.dir = targetLocale === "ar" ? "rtl" : "ltr";
          return;
        }
      } catch (e) {
        console.error("获取语种列表失败，使用默认语种", e);
      }
      // 降级：使用localStorage中的语种
      const saved = localStorage.getItem("VALTRIX-locale") as Locale | null;
      if (saved && locales.includes(saved as Locale)) {
        setLocaleState(saved);
        persistLocaleCookie(saved);
        document.documentElement.lang = saved;
        document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
      }
    };
    fetchLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = (newLocale: Locale) => {
    // 只允许切换到已启用的语种
    if (!activeLocales.includes(newLocale)) {
      console.warn(`语种 ${newLocale} 未启用，忽略切换`);
      return;
    }
    setLocaleState(newLocale);
    localStorage.setItem("VALTRIX-locale", newLocale);
    persistLocaleCookie(newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
  };

  const t = (key: keyof typeof translations["zh"]) => {
    // 优先当前语言，其次中文（不显示英文，避免混合语言）
    const v = translations[locale]?.[key] || translations["zh"][key] || key;
    return typeof v === "string" ? v : String(v);
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
