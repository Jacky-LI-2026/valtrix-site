"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useProductTabs } from "@/lib/api/useProducts";
import { type Locale } from "@/config/i18n";

// 国旗图片URL映射（使用flagcdn，解决Windows不显示国旗emoji的问题）
const flagImages: Record<Locale, string> = {
  zh: "https://flagcdn.com/w40/cn.png",
  en: "https://flagcdn.com/w40/us.png",
  ja: "https://flagcdn.com/w40/jp.png",
  ko: "https://flagcdn.com/w40/kr.png",
  fr: "https://flagcdn.com/w40/fr.png",
  ar: "https://flagcdn.com/w40/sa.png",
};

// 语言代码标识（如 CN、EN、JP 等）
const localeCodes: Record<Locale, string> = {
  zh: "CN",
  en: "EN",
  ja: "JP",
  ko: "KR",
  fr: "FR",
  ar: "SA",
};

/** 数组/字符串统一转文本 */
function textOr(v: any): string {
  if (Array.isArray(v)) return v.join(" ");
  return String(v || "");
}

export default function UnilokHeader() {
  const { t, locale, setLocale, localeNames, activeLocales } = useI18n();
  const { productTabs } = useProductTabs();
  const loc = createLocalizedGetter(locale);
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [apiNavItems, setApiNavItems] = useState<any[]>([]);
  const [navLoading, setNavLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");

  // 滚动时添加轻微阴影
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 从后台API获取Logo（失败时显示文字 VALTRIX）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=logo", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) {
          setLogoUrl(String(data.data));
        }
      })
      .catch((err) => {
        console.warn("获取Logo失败，使用文字Logo:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 从后台API获取导航菜单数据（locale 变化时清空旧菜单并进入加载态）
  useEffect(() => {
    let cancelled = false;
    setApiNavItems([]);
    setNavLoading(true);
    // 递归映射：透传 description；空 url 兜底 '#'（避免 Link href="" 崩溃）
    const mapMenu = (m: any): any => ({
      label: m.name,
      href: m.url || "#",
      desc: m.description || "",
      children: (m.children || []).map(mapMenu),
    });
    fetch(`/api/public/menus?locale=${locale}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setApiNavItems(data.data.map(mapMenu));
        }
      })
      .catch((err) => {
        console.warn("获取菜单数据失败，使用默认菜单:", err);
      })
      .finally(() => {
        if (!cancelled) setNavLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // 产品中心下拉：来自 useProductTabs 实时产品分类
  const productsChildren = useMemo(
    () =>
      productTabs.map((tab: any) => ({
        label: loc.get(tab, "name"),
        href: `/products?tab=${tab.id}`,
        desc: "",
      })),
    [productTabs, loc]
  );

  // 静态兜底导航（API 失败时使用）
  const fallbackNav = useMemo(
    () => [
      { label: t("home"), href: "/" },
      { label: t("products"), href: "/products", children: productsChildren },
      { label: t("industries"), href: "/industries" },
      { label: t("services"), href: "/services" },
      { label: t("resources"), href: "/resources" },
      { label: t("news"), href: "/news" },
      { label: t("about"), href: "/about" },
      { label: t("careers"), href: "/careers" },
    ],
    [t, productsChildren]
  );

  // 最终导航：API 菜单优先；"产品中心"项的下拉统一替换为实时产品分类
  const finalNavItems = useMemo(() => {
    const base = apiNavItems.length > 0 ? apiNavItems : navLoading ? [] : fallbackNav;
    return base.map((item: any) => {
      const isProducts =
        item.href === "/products" ||
        item.label === t("products") ||
        String(item.href || "").startsWith("/products");
      if (isProducts) return { ...item, children: productsChildren };
      return item;
    });
  }, [apiNavItems, navLoading, fallbackNav, productsChildren, t]);

  // 轻量站内搜索：本地检索产品分类/型号
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const items: { title: string; desc: string; href: string }[] = [];
    productTabs.forEach((tab: any) => {
      items.push({ title: loc.get(tab, "name"), desc: "", href: `/products?tab=${tab.id}` });
      tab.categories.forEach((cat: any) => {
        items.push({
          title: loc.get(cat, "name"),
          desc: loc.get(tab, "name"),
          href: `/products?tab=${tab.id}`,
        });
        (cat.models || []).forEach((m: any) => {
          items.push({
            title: loc.get(m, "name"),
            desc: textOr(loc.get(m, "model")),
            href: `/products/${tab.id}/${m.id}`,
          });
        });
      });
    });
    return items.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 6);
  }, [searchQuery, productTabs, loc]);

  useEffect(() => {
    if (searchOpen) {
      const id = window.setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
  }, [searchOpen]);

  // 路由变化时关闭所有弹层
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setLangOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  // ESC 关闭弹层
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setLangOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const navKey = (item: any) => item.label || item.name || item.href || "nav";

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-gray-200 bg-white transition-shadow duration-200 ${
        scrolled ? "shadow-md shadow-gray-200/70" : "shadow-none"
      }`}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo：后台 Logo 失败时显示文字 VALTRIX */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="VALTRIX">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="VALTRIX"
              width={200}
              height={44}
              className="h-9 w-auto object-contain"
              priority
            />
          ) : (
            <span className="text-xl font-black tracking-tight text-primary">
              VALTRIX
            </span>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {navLoading && apiNavItems.length === 0 ? (
            <span className="px-2 text-xs text-gray-400 animate-pulse">Loading…</span>
          ) : (
            finalNavItems.map((item: any) => {
              const hasChildren = item.children && item.children.length > 0;
              const open = activeDropdown === navKey(item);
              return (
                <div
                  key={navKey(item)}
                  className="relative"
                  onMouseEnter={() => hasChildren && setActiveDropdown(navKey(item))}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href={item.href || item.url}
                    title={item.desc || item.label}
                    className={`flex items-center gap-1 whitespace-nowrap px-3 py-2 text-sm font-medium tracking-wide transition-colors ${
                      open ? "text-primary" : "text-gray-700 hover:text-primary"
                    }`}
                  >
                    <span>{item.label || item.name}</span>
                    {hasChildren && (
                      <ChevronDown
                        className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    )}
                  </Link>

                  {hasChildren && open && (
                    <div className="absolute start-0 top-full pt-1 z-50">
                      <div className="min-w-[220px] border border-gray-200 bg-white py-1.5 shadow-md">
                        {item.desc && (
                          <div className="border-b border-gray-100 px-4 py-1.5 text-xs text-gray-500">
                            {item.desc}
                          </div>
                        )}
                        {item.children.map((child: any) => (
                          <DropdownChild key={child.href || child.url} child={child} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label={t("search")}
          >
            <Search className="h-4.5 w-4.5" />
          </button>

          {/* Language Switcher */}
          <div className="relative">
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded px-2.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors"
              onClick={() => setLangOpen(!langOpen)}
              aria-label={t("language")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={flagImages[locale]}
                alt={localeCodes[locale]}
                width={18}
                height={12}
                className="rounded-[2px] object-cover"
              />
              <span className="font-medium">{localeCodes[locale]}</span>
              <ChevronDown
                className={`h-3 w-3 opacity-60 transition-transform ${langOpen ? "rotate-180" : ""}`}
              />
            </button>
            {langOpen && (
              <div className="absolute end-0 top-full mt-1 w-44 border border-gray-200 bg-white py-1.5 shadow-md z-50">
                {activeLocales.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-start text-sm transition-colors ${
                      locale === l ? "bg-gray-50 text-primary font-medium" : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setLocale(l);
                      setLangOpen(false);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={flagImages[l]}
                      alt={localeCodes[l]}
                      width={18}
                      height={12}
                      className="rounded-[2px] object-cover"
                    />
                    <span className="font-medium w-8">{localeCodes[l]}</span>
                    <span>{localeNames[l]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded text-gray-600 hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {searchOpen && (
        <div className="border-t border-gray-200 bg-white">
          <div className="container py-4">
            <div className="relative mx-auto max-w-2xl">
              <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search")}
                className="w-full rounded border border-gray-300 py-2.5 ps-11 pe-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div className="mx-auto mt-3 max-w-2xl">
                {searchResults.length > 0 ? (
                  <div className="border border-gray-100 bg-white shadow-sm">
                    {searchResults.map((r, i) => (
                      <Link
                        key={r.href + r.title}
                        href={r.href}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                          i !== searchResults.length - 1 ? "border-b border-gray-100" : ""
                        }`}
                      >
                        <span className="truncate font-medium text-gray-900">{r.title}</span>
                        {r.desc && <span className="shrink-0 text-xs text-gray-400">{r.desc}</span>}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-400">
                    {t("searchNoResults")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 end-0 z-[70] flex w-[86%] max-w-sm flex-col bg-white shadow-xl lg:hidden">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-5">
              <Link href="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="VALTRIX"
                    width={160}
                    height={36}
                    className="h-8 w-auto object-contain"
                  />
                ) : (
                  <span className="text-lg font-black tracking-tight text-primary">VALTRIX</span>
                )}
              </Link>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded text-gray-600 hover:bg-gray-100"
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4">
              {finalNavItems.map((item: any) => (
                <MobileNavItem key={navKey(item)} item={item} onClose={() => setMobileOpen(false)} />
              ))}
            </nav>

            {/* Mobile language */}
            <div className="shrink-0 border-t border-gray-200 px-5 py-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-gray-400">
                {t("language")}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {activeLocales.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`flex items-center gap-2 rounded px-2.5 py-2 text-sm transition-colors ${
                      locale === l ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setLocale(l)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={flagImages[l]}
                      alt={localeCodes[l]}
                      width={18}
                      height={12}
                      className="rounded-[2px] object-cover"
                    />
                    <span className="font-medium">{localeCodes[l]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

/** 桌面端子菜单项（支持三级） */
function DropdownChild({ child }: { child: any }) {
  const hasChildren = child.children && child.children.length > 0;
  return (
    <div className="relative group">
      <Link
        href={child.href || child.url}
        title={child.desc || child.label || child.name}
        className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
      >
        <span className="whitespace-nowrap">{child.label || child.name}</span>
        {hasChildren && (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50 rtl-flip" />
        )}
      </Link>
      {child.desc && !hasChildren && (
        <div className="px-4 pb-1.5 text-xs text-gray-400">{child.desc}</div>
      )}
      {hasChildren && (
        <div className="absolute start-full top-0 hidden ps-1 group-hover:block">
          <div className="min-w-[200px] border border-gray-200 bg-white py-1.5 shadow-md">
            {(child.children || []).map((g: any) => (
              <Link
                key={g.href || g.url}
                href={g.href || g.url}
                title={g.desc || g.label || g.name}
                className="block whitespace-nowrap px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
              >
                {g.label || g.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 移动端子菜单项（递归折叠展开） */
function MobileNavItem({ item, onClose, depth = 0 }: { item: any; onClose: () => void; depth?: number }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <Link
        href={item.href || item.url}
        onClick={onClose}
        title={item.desc || item.label}
        className="block rounded px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary"
      >
        {item.label || item.name}
        {item.desc && <span className="mt-0.5 block text-xs font-normal text-gray-400">{item.desc}</span>}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary"
        onClick={() => setOpen(!open)}
      >
        <span className="text-start">
          {item.label || item.name}
          {item.desc && <span className="mt-0.5 block text-xs font-normal text-gray-400">{item.desc}</span>}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="ms-3 mt-0.5 space-y-0.5 border-s border-gray-200 ps-2">
          {item.children.map((child: any) => (
            <MobileNavItem key={child.href || child.url} item={child} onClose={onClose} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
