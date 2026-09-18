"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, ChevronRight, Search, Phone, LogIn } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useNavTabs } from "@/lib/api/useProducts";
import { getBrandName, getBrandNameEn, getContactPhone } from "@/lib/brand";
import { type Locale } from "@/config/i18n";

// 国旗图片URL映射（使用flagcdn，解决Windows不显示国旗emoji的问题）
// 与既有主题保持同一实现，避免同一站点头部出现两套语言切换交互
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

/** 数组/字符串统一转文本：多语言字段可能是数组（如型号列表），直接渲染会报错 */
function textOr(v: any): string {
  if (Array.isArray(v)) return v.join(" ");
  return String(v || "");
}

/**
 * KITZ SCT 风 · 全局页头（干净日式工业风 / 方形直角 / 细分隔线）
 *
 * 结构：极细联系条（仅在取到电话号码时整块渲染）→ 主栏（Logo · 多级导航 · 语言切换 · 会员入口 · 搜索）
 *      → 搜索面板 → 移动端抽屉
 *
 * 取值口径（G2）：品牌名与联系方式一律走 `lib/brand` 的部署级配置，
 *   代码里不出现任何品牌名、号码或域名 —— 同一份 Base 部署到不同站点时自动各显其名。
 * 多语言口径：所有多语言字段经 `createLocalizedGetter`，不写「按语种三元取字段」那种写法。
 */
export default function KitzHeader() {
  const { t, locale, setLocale, localeNames, activeLocales } = useI18n();
  const { productTabs } = useNavTabs();
  const loc = createLocalizedGetter(locale);
  const pathname = usePathname();

  // 新增文案先落到局部常量：本主题新增的 i18n key 由另一块补齐，
  // 集中取值可让「缺 key」的类型报错只在一处暴露，而不是散落多处。
  const loginLabel = t("kitzLogin");
  const registerLabel = t("kitzRegister");

  // 品牌名兜底链：英文品牌名优先；未单独配置时回退中文品牌名（两者都来自环境变量，非硬编码）
  const brand = getBrandNameEn() || getBrandName();

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
  const [contactData, setContactData] = useState<any>(null);

  // 滚动时给主栏加一道极淡的阴影（KITZ 风的分隔靠细线，不靠大投影）
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 从后台 API 获取 Logo；未配置时回退为纯文字字标（不写死任何图片路径）
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

  // 联系信息：顶部联系条用。DB（后台维护）优先，兜底部署级环境变量
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=contact_info", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) setContactData(data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 从后台 API 获取导航菜单（locale 变化时清空旧菜单并进入加载态，避免残留上一语种文案）
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

  // 产品中心下拉：来自 useNavTabs（轻量接口 /api/public/nav）实时产品分类（后台改了分类，导航立即跟随）
  const productsChildren = useMemo(
    () =>
      productTabs.map((tab: any) => ({
        label: loc.get(tab, "name"),
        href: `/products?tab=${tab.id}`,
        desc: "",
      })),
    [productTabs, loc]
  );

  // 静态兜底导航：仅当菜单 API 不可用时使用（文案全部走既有 i18n 键）
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

  // 轻量站内搜索：本地检索产品系列 / 分类 / 型号（不新增后端接口）
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const items: { title: string; desc: string; href: string }[] = [];
    productTabs.forEach((tab: any) => {
      items.push({ title: loc.get(tab, "name"), desc: "", href: `/products?tab=${tab.id}` });
      (tab.categories || []).forEach((cat: any) => {
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

  // 路由变化时关闭所有弹层（否则跳转后下拉/抽屉会停在打开态）
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

  // 顶部联系条：电话号码（DB 优先，兜底部署级配置）。取不到号码则**整块不渲染** ——
  // 宁可不显示，也不能退化成无效的 `href="tel:"`（见 lib/brand.ts 的调用方契约）。
  const phone = String(contactData?.phone || getContactPhone()).trim();

  return (
    <header className="sticky top-0 z-50 w-full bg-white">
      {/* 顶部极细联系条：仅在取到电话号码时渲染 */}
      {phone && (
        <div className="bg-primary text-white">
          <div className="container flex h-8 items-center justify-between gap-4 text-[11px] tracking-wide">
            <a
              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
            >
              <Phone className="h-3 w-3 shrink-0" />
              <bdi dir="ltr">{phone}</bdi>
            </a>
            <Link
              href="/contact"
              className="hidden text-white/80 transition-colors hover:text-white sm:inline"
            >
              {t("contact")}
            </Link>
          </div>
        </div>
      )}

      {/* 主栏 */}
      <div
        className={`border-b border-gray-200 transition-shadow duration-200 ${
          scrolled ? "shadow-[0_1px_3px_rgba(0,0,0,0.06)]" : "shadow-none"
        }`}
      >
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Logo：后台配置优先；未配置则用部署级品牌名做文字字标（不写死图片路径/品牌名） */}
          <Link href="/" className="flex shrink-0 items-center" aria-label={brand}>
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={brand}
                width={200}
                height={44}
                className="h-9 w-auto object-contain"
                priority
              />
            ) : (
              <span className="text-xl font-black tracking-tight text-dark">{brand}</span>
            )}
          </Link>

          {/* 桌面端导航（多级下拉，三级见 DropdownChild） */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {navLoading && apiNavItems.length === 0 ? (
              <span className="animate-pulse px-2 text-xs text-gray-400">{t("loading")}</span>
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
                          className={`h-3.5 w-3.5 opacity-60 transition-transform ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </Link>

                    {hasChildren && open && (
                      <div className="absolute start-0 top-full z-50 pt-1">
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

          {/* 右侧动作区 */}
          <div className="flex items-center gap-1">
            {/* 搜索 */}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label={t("search")}
            >
              <Search className="h-4 w-4" />
            </button>

            {/* 语言切换 */}
            <div className="relative">
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 px-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary"
                onClick={() => setLangOpen(!langOpen)}
                aria-label={t("language")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flagImages[locale]}
                  alt={localeCodes[locale]}
                  width={18}
                  height={12}
                  className="object-cover ring-1 ring-gray-200"
                />
                <span className="font-medium">{localeCodes[locale]}</span>
                <ChevronDown
                  className={`h-3 w-3 opacity-60 transition-transform ${langOpen ? "rotate-180" : ""}`}
                />
              </button>
              {langOpen && (
                <div className="absolute end-0 top-full z-50 mt-1 w-44 border border-gray-200 bg-white py-1.5 shadow-md">
                  {activeLocales.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-start text-sm transition-colors ${
                        locale === l
                          ? "bg-gray-50 font-medium text-primary"
                          : "text-gray-700 hover:bg-gray-50"
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
                        className="object-cover ring-1 ring-gray-200"
                      />
                      <span className="w-8 font-medium">{localeCodes[l]}</span>
                      <span>{localeNames[l]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 会员入口：桌面端显示（移动端在抽屉底部） */}
            <div className="hidden items-center gap-1 border-s border-gray-200 ps-2 lg:flex">
              <Link
                href="/member/login"
                className="inline-flex h-9 items-center gap-1.5 px-2.5 text-sm font-medium text-gray-700 transition-colors hover:text-primary"
              >
                <LogIn className="h-3.5 w-3.5" />
                {loginLabel}
              </Link>
              <Link
                href="/member/register"
                className="inline-flex h-9 items-center border border-primary px-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
              >
                {registerLabel}
              </Link>
            </div>

            {/* 移动端汉堡 */}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 搜索面板 */}
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
                  className="w-full border border-gray-300 py-2.5 pe-10 ps-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                    <p className="py-4 text-center text-sm text-gray-400">{t("searchNoResults")}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 移动端抽屉 */}
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
                    alt={brand}
                    width={160}
                    height={36}
                    className="h-8 w-auto object-contain"
                  />
                ) : (
                  <span className="text-lg font-black tracking-tight text-dark">{brand}</span>
                )}
              </Link>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100"
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

            {/* 会员入口（移动端） */}
            <div className="shrink-0 border-t border-gray-200 px-5 py-4">
              <div className="grid grid-cols-2 gap-1.5">
                <Link
                  href="/member/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-1.5 border border-gray-300 px-2.5 py-2 text-sm font-medium text-gray-700"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {loginLabel}
                </Link>
                <Link
                  href="/member/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center border border-primary px-2.5 py-2 text-sm font-medium text-primary"
                >
                  {registerLabel}
                </Link>
              </div>
            </div>

            {/* 语言切换（移动端） */}
            <div className="shrink-0 border-t border-gray-200 px-5 py-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-gray-400">{t("language")}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {activeLocales.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`flex items-center gap-2 px-2.5 py-2 text-sm transition-colors ${
                      locale === l
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setLocale(l)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={flagImages[l]}
                      alt={localeCodes[l]}
                      width={18}
                      height={12}
                      className="object-cover ring-1 ring-gray-200"
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

/** 桌面端子菜单项（支持三级：二级项 hover 时向侧边展开三级） */
function DropdownChild({ child }: { child: any }) {
  const hasChildren = child.children && child.children.length > 0;
  return (
    <div className="group relative">
      <Link
        href={child.href || child.url}
        title={child.desc || child.label || child.name}
        className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary"
      >
        <span className="whitespace-nowrap">{child.label || child.name}</span>
        {hasChildren && <ChevronRight className="rtl-flip h-3.5 w-3.5 shrink-0 opacity-50" />}
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

/** 移动端子菜单项（递归折叠展开，层级不设上限） */
function MobileNavItem({
  item,
  onClose,
  depth = 0,
}: {
  item: any;
  onClose: () => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <Link
        href={item.href || item.url}
        onClick={onClose}
        title={item.desc || item.label}
        className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary"
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
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
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
