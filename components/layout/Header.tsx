"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown, ChevronRight, Search, Phone, Globe, ArrowRight, CalendarCheck, ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { locales, type Locale } from "@/config/i18n";

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
import { useNavTabs } from "@/lib/api/useProducts";
import { industries as staticIndustries } from "@/lib/industries";
import MemberEntry, { MobileMemberEntry } from "./MemberEntry";
import { PortalEntry, MobilePortalEntry } from "./PortalEntry";

// 热门搜索词（使用真实实体 slug，动态解析；找不到的项自动跳过，保证不死链）
const HOT_SEARCH_KEYS: { slug: string; type: "product" | "industry" }[] = [
  { slug: "vcr-gn-fmr4", type: "product" },
  { slug: "dv12a-fmr4-hp", type: "product" },
  { slug: "pre1-mr4", type: "product" },
  { slug: "ft4-mr4-s15", type: "product" },
  { slug: "semiconductor", type: "industry" },
  { slug: "hydrogen-energy", type: "industry" },
];

// 富文本/HTML → 纯文本摘要（用于内容级搜索 desc）
function stripHtml(html: any): string {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

// 数组或字符串统一转文本（兼容 Json 数组/字符串字段）
function textOrJoin(v: any): string {
  if (Array.isArray(v)) return v.join("、");
  return String(v || "");
}

export default function Header() {
  const { t, locale, setLocale, localeNames, localeFlags, activeLocales } = useI18n();
  const { productTabs } = useNavTabs();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [apiNavItems, setApiNavItems] = useState<any[]>([]);
  const [navLoading, setNavLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const [siteBrand, setSiteBrand] = useState({ zh: "", en: "VALTRIX" });
  // 插件启用状态（关闭的插件前台隐藏对应入口）
  const [pluginState, setPluginState] = useState<Record<string, boolean>>({});
  // 行业数据（全语种，从公共 API 拉取，失败回退静态数据）
  const [allIndustries, setAllIndustries] = useState<any[]>(staticIndustries);
  // 内容级搜索数据源（新闻/资源/职位）
  const [allNews, setAllNews] = useState<any[]>([]);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);

  const loc = createLocalizedGetter(locale);

  // 页头滚动状态（2026-09-15 新增）：滚动超过 8px 视为「已滚动」。
  //   用途：header=transparent 的皮肤靠 `.is-scrolled` 把页头从「透明压深色 Hero」
  //   切回「实色白底 + 深色文字」—— 否则深灰导航字会一直压在深色 Hero 图上读不清。
  //   硬约束：其它皮肤（solid / glass）的 CSS 不引用 `.is-scrolled`，行为零变化。
  //   passive: true（不阻塞滚动）；卸载时移除监听，避免路由切换后泄漏。
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // 首次挂载同步一次（刷新时可能已带滚动位置）
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 拉取插件启用状态（前台入口联动：关闭 → 隐藏考察预约/购物车等入口）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/plugins", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && data.ok && data.state) setPluginState(data.state);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  // 插件是否启用（默认视为启用，兼容状态拉取失败）
  const pluginOn = (key: string) => pluginState[key] !== false;

  // 从后台API获取Logo（站点配置里上传/设置的Logo）+ 站点品牌名（多租户站点差异化）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=logo", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) {
          setLogoUrl(data.data);
        }
      })
      .catch((err) => {
        console.warn("获取Logo失败，使用默认Logo:", err);
      });
    fetch("/api/public/site-config?key=siteName", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !data.data) return;
        const zh = String(data.data || "");
        // 品牌全英文：en 只接受纯字母站点名，其余情况保持默认 VALTRIX
        setSiteBrand((prev) => {
          const en = /^[a-zA-Z]{2,}$/.test(zh) ? zh.toUpperCase() : prev.en;
          return { ...prev, en };
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 从后台API获取导航菜单数据（支持后台菜单管理联动）
  useEffect(() => {
    let cancelled = false;
    // locale 变化时立即清空旧语种菜单并进入加载态，避免旧语种菜单残留显示（修复刷新/切语种时"先显示中文菜单再跳转"）
    setApiNavItems([]);
    setNavLoading(true);
    // 递归映射：透传 description（desc）供导航悬浮展示；空 url 兜底 '#'（避免 Link href="" 崩溃）
    const mapMenu = (m: any): any => ({
      label: m.name,
      href: m.url || '#',
      desc: m.description || '',
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

  // 从后台API获取行业数据（全语种，搜索/热门搜索使用）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/industries", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setAllIndustries(data);
        }
      })
      .catch((err) => {
        console.warn("获取行业数据失败，使用静态数据:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 内容级搜索数据（新闻/资源/职位，全语种）
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [newsRes, resRes, jobRes] = await Promise.all([
          fetch("/api/public/news", { cache: "no-store" }),
          fetch("/api/public/resources", { cache: "no-store" }),
          fetch("/api/public/careers", { cache: "no-store" }),
        ]);
        const news = await newsRes.json();
        const resources = await resRes.json();
        const jobs = await jobRes.json();
        if (!cancelled) {
          if (Array.isArray(news)) setAllNews(news);
          if (Array.isArray(resources)) setAllResources(resources);
          if (Array.isArray(jobs)) setAllJobs(jobs);
        }
      } catch (err) {
        console.warn("获取搜索内容数据失败:", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 搜索数据源（产品型号级 + 产品分类 + 行业 + 服务，全语种）
  const searchData = useMemo(() => {
    const items: { title: string; desc: string; href: string; category: string; categoryEn: string }[] = [];
    // 产品型号级（链接到产品详情页）
    productTabs.forEach((tab: any) => {
      tab.categories.forEach((cat: any) => {
        (cat.models || []).forEach((m: any) => {
          items.push({
            title: loc.get(m, "name"),
            desc:
              stripHtml(loc.get(m, "description")) ||
              loc.get(m, "model") ||
              loc.get(cat, "name"),
            href: `/products/${tab.id}/${m.id}`,
            category: t("searchCategoryProduct"),
            categoryEn: "Product",
          });
        });
      });
    });
    // 产品分类 tab 级
    productTabs.forEach((tab: any) => {
      items.push({
        title: loc.get(tab, "name"),
        desc: tab.categories.map((c: any) => loc.get(c, "name")).join("、"),
        href: `/products?tab=${tab.id}`,
        category: t("searchCategoryProduct"),
        categoryEn: "Product",
      });
    });
    // 行业
    allIndustries.forEach((i: any) => {
      items.push({
        title: loc.get(i, "name"),
        desc: loc.get(i, "tagline") || stripHtml(loc.get(i, "description")),
        href: `/industries/${i.slug}`,
        category: t("searchCategoryIndustry"),
        categoryEn: "Industry",
      });
    });
    // 新闻（标题 + 摘要/正文）
    allNews.forEach((n: any) => {
      items.push({
        title: loc.get(n, "title"),
        desc: stripHtml(loc.get(n, "summary")) || stripHtml(loc.get(n, "content")),
        href: `/news/${n.slug}`,
        category: t("searchCategoryNews"),
        categoryEn: "News",
      });
    });
    // 资源（标题 + 描述）
    allResources.forEach((cat: any) => {
      (cat.items || []).forEach((r: any) => {
        items.push({
          title: loc.get(r, "title"),
          desc: stripHtml(loc.get(r, "description")),
          href: `/resources/${cat.type || r.category?.type || ""}`,
          category: t("searchCategoryResource"),
          categoryEn: "Resource",
        });
      });
    });
    // 职位（标题 + 职责）
    allJobs.forEach((j: any) => {
      items.push({
        title: loc.get(j, "title"),
        desc:
          stripHtml(textOrJoin(loc.getArray(j, "responsibilities"))) ||
          stripHtml(textOrJoin(loc.getArray(j, "description"))),
        href: `/careers/${j.slug}`,
        category: t("searchCategoryCareer"),
        categoryEn: "Career",
      });
    });
    // 服务页面
    const services = [
      { title: t("searchServiceOdm"), desc: t("searchServiceOdmDesc"), href: "/services/custom-manufacturing" },
      { title: t("searchServiceUhp"), desc: t("searchServiceUhpDesc"), href: "/services/technical-support" },
    ];
    services.forEach((s) => {
      items.push({ ...s, category: t("searchCategoryService"), categoryEn: "Service" });
    });
    return items;
  }, [locale, productTabs, allIndustries, allNews, allResources, allJobs, loc, t]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchData
      .filter((item) => item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, searchData]);

  // 热门搜索（动态解析真实实体，多语言，自动过滤失效项避免死链接）
  const hotSearchItems = useMemo(() => {
    const items: { key: string; label: string; href: string }[] = [];
    for (const { slug, type } of HOT_SEARCH_KEYS) {
      if (type === "product") {
        let found = false;
        for (const tab of productTabs as any[]) {
          for (const cat of tab.categories || []) {
            const m = (cat.models || []).find((x: any) => x.id === slug);
            if (m) {
              items.push({ key: slug, label: loc.get(m, "name"), href: `/products/${tab.id}/${m.id}` });
              found = true;
              break;
            }
          }
          if (found) break;
        }
      } else if (type === "industry") {
        const ind = allIndustries.find((i: any) => i.slug === slug);
        if (ind) {
          items.push({ key: slug, label: loc.get(ind, "name"), href: `/industries/${ind.slug}` });
        }
      }
    }
    return items;
  }, [productTabs, allIndustries, loc]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  // ESC 关闭搜索
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const navItems = [
    { label: t("home"), href: "/" },
    {
      label: t("products"),
      href: "/products",
      children: [
        { label: t("vcrFittings"), href: "/products?tab=vcr-fittings", desc: t("navDescVcrFittings") },
        { label: t("weldedFittings"), href: "/products?tab=welded-fittings", desc: t("navDescWeldedFittings") },
        { label: t("diaphragmValves"), href: "/products?tab=diaphragm-valves", desc: t("navDescDiaphragmValves") },
        { label: t("pressureReducers"), href: "/products?tab=pressure-reducers", desc: t("navDescPressureReducers") },
        { label: t("checkValves"), href: "/products?tab=check-valves", desc: t("navDescCheckValves") },
        { label: t("gasFilters"), href: "/products?tab=filters", desc: t("navDescGasFilters") },
      ],
    },
    {
      label: t("industries"),
      href: "/industries",
      children: [
        { label: t("semiconductor"), href: "/industries/semiconductor", desc: t("navDescSemiconductor") },
        { label: t("biopharmaceutical"), href: "/industries/biopharmaceutical", desc: t("navDescBiopharma") },
        { label: t("ledDisplay"), href: "/industries/led-display", desc: t("navDescLed") },
        { label: t("solar"), href: "/industries/solar-photovoltaic", desc: t("navDescSolar") },
        { label: t("hydrogen"), href: "/industries/hydrogen-energy", desc: t("navDescHydrogen") },
        { label: t("researchLabs"), href: "/industries/research-labs", desc: t("navDescResearch") },
      ],
    },
    {
      label: t("services"),
      href: "/services",
      children: [
        { label: t("technicalSupport"), href: "/services/technical-support", desc: t("menuTechDesc") },
        { label: t("odmService"), href: "/services/custom-manufacturing", desc: t("menuOdmDesc") },
        { label: t("valtrixService"), href: "/services/maintenance-service", desc: t("menuMaintDesc") },
        { label: t("afterSales"), href: "/services/training-consulting", desc: t("menuTrainDesc") },
      ],
    },
    {
      label: t("resources"),
      href: "/resources",
      children: [
        { label: t("catalogs"), href: "/resources/manual", desc: t("menuCatDesc") },
        { label: t("certificates"), href: "/resources/certificate", desc: t("menuCertDesc") },
        { label: t("drawings"), href: "/resources/drawing", desc: t("menuDrawDesc") },
      ],
    },
    { label: t("news"), href: "/news" },
    {
      label: t("about"),
      href: "/about",
      children: [
        { label: t("companyProfile"), href: "/about/profile", desc: t("menuProfileDesc") },
        { label: t("ourHonors"), href: "/about/honors", desc: t("menuHonorsDesc") },
        { label: t("ourHistory"), href: "/about/history", desc: t("menuHistoryDesc") },
      ],
    },
    { label: t("careers"), href: "/careers" },
  ];

  // 优先使用后台API获取的菜单数据，支持后台菜单管理联动
  // 优先使用后台API获取的菜单数据；加载中渲染空（不 fallback 静态全量菜单，避免显示后台隐藏/停用的菜单项），加载失败才回退静态菜单
  const finalNavItems = apiNavItems.length > 0 ? apiNavItems : (navLoading ? [] : navItems);

  return (
    <header className={`tpl-header sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80${scrolled ? " is-scrolled" : ""}`}>
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src={logoUrl || "/images/logo.png"}
            alt={siteBrand.en || "VALTRIX"}
            width={250}
            height={50}
            className="h-9 w-auto"
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 min-w-0 flex-1 justify-end">
          {navLoading && apiNavItems.length === 0 ? (
            <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
          ) : (
          finalNavItems.map((item) => (
            <div
              key={item.label || item.name}
              className="relative min-w-0 shrink"
              onMouseEnter={() => item.children && item.children.length > 0 && setActiveDropdown(item.label || item.name)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                href={item.href || item.url}
                title={item.label || item.name}
                className="flex min-w-0 max-w-[130px] items-center gap-1 whitespace-nowrap px-2 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
              >
                <span className="truncate">{item.label || item.name}</span>
                {item.children && item.children.length > 0 && (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                )}
              </Link>

              {item.children && item.children.length > 0 && activeDropdown === (item.label || item.name) && (
                <div className="absolute start-0 top-full pt-2 min-w-[220px] z-50">
                  <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                    {item.desc && (
                      <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100 mb-1 max-w-[240px]">{item.desc}</div>
                    )}
                    {item.children.map((child: any) => (
                      <div key={child.href || child.url} className="relative group">
                        <Link
                          href={child.href || child.url}
                          title={child.label || child.name}
                          className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="font-medium whitespace-nowrap">{child.label || child.name}</div>
                            {child.desc && (
                              <div className="text-xs text-gray-500 mt-0.5 max-w-[200px]">{child.desc}</div>
                            )}
                          </div>
                          {child.children && child.children.length > 0 && (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          )}
                        </Link>
                        {child.children && child.children.length > 0 && (
                          <div className="absolute left-full top-0 hidden group-hover:block pl-1 z-50">
                            <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg min-w-[200px]">
                              {child.children.map((grand: any) => (
                                <Link
                                  key={grand.href || grand.url}
                                  href={grand.href || grand.url}
                                  title={grand.label || grand.name}
                                  className="block rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors whitespace-nowrap"
                                >
                                  {grand.label || grand.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button
            className="hidden sm:flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label={t("search")}
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">{t("search")}</span>
          </button>

          {/* Language Switcher */}
          <div className="relative">
            <button
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
              onClick={() => setLangOpen(!langOpen)}
              aria-label="Language"
            >
              <Globe className="h-4 w-4" />
              <span className="font-medium">{localeCodes[locale]}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute end-0 top-full mt-1 w-32 rounded-md border border-gray-200 bg-white py-1 shadow-lg z-50">
                {activeLocales.map((loc) => (
                  <button
                    key={loc}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-start text-sm hover:bg-gray-50 ${
                      locale === loc ? "text-primary font-medium" : "text-gray-700"
                    }`}
                    onClick={() => {
                      setLocale(loc as Locale);
                      setLangOpen(false);
                    }}
                  >
                    <span className="font-medium w-8">{localeCodes[loc]}</span>
                    <span>{localeNames[loc]}</span></button>
                ))}
              </div>
            )}
          </div>

          <PortalEntry />

          <MemberEntry />

          {pluginOn("visit-booking") && (
            <Link
              href="/visit-booking"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-colors"
            >
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden xl:inline">{t("visitBooking")}</span>
            </Link>
          )}
          {/* 在线商城：购物车图标入口（电话旁），带购物车数量角标 */}
          {pluginOn("mall") && <CartEntry />}

          <Link
            href="/contact"
            aria-label={t("contact")}
            title={t("contact")}
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white hover:bg-primary-dark transition-colors"
          >
            <Phone className="h-4 w-4" />
          </Link>

          <button
            className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label={t("search")}
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {searchOpen && (
        <div className="border-t border-gray-200 bg-white shadow-lg">
          <div className="container py-4">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="tpl-input w-full ps-12 pe-12 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchQuery.trim() && (
              <div className="max-w-2xl mx-auto mt-3">
                {searchResults.length > 0 ? (
                  <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                    {searchResults.map((result, i) => (
                      <Link
                        key={result.href}
                        href={result.href}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors ${i !== searchResults.length - 1 ? "border-b border-gray-100" : ""}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Search className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{result.title}</span>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded shrink-0">{result.category}</span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{result.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("searchNoResults")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Links when no query */}
            {!searchQuery.trim() && (
              <div className="max-w-2xl mx-auto mt-3">
                <p className="text-xs text-gray-400 mb-2">{t("searchPopularSearches")}</p>
                <div className="flex flex-wrap gap-2">
                  {hotSearchItems.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setSearchOpen(false)}
                      className="text-sm text-gray-600 hover:text-primary px-3 py-1.5 bg-gray-50 hover:bg-primary/5 rounded-md transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white max-h-[80vh] overflow-y-auto">
          <nav className="container py-4 space-y-1">
            {finalNavItems.map((item) => (
              <MobileNavItem key={item.label} item={item} onClose={() => setMobileOpen(false)} />
            ))}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-400 px-3 mb-2">{t("language")}</div>
              <div className="flex gap-2 px-3">
                {activeLocales.map((loc) => (
                  <button
                    key={loc}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                      locale === loc ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setLocale(loc as Locale)}
                  >
                    <span className="font-medium w-8">{localeCodes[loc]}</span>
                    <span>{localeNames[loc]}</span></button>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <MobilePortalEntry />
              <MobileMemberEntry />
            </div>
            <div className="mt-2 flex gap-2">
              {pluginOn("visit-booking") && (
                <Link
                  href="/visit-booking"
                  className="flex-1 flex items-center justify-center gap-2 rounded-md border border-primary bg-white px-4 py-2.5 text-sm font-medium text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  <CalendarCheck className="h-4 w-4" />
                  {t("visitBooking")}
                </Link>
              )}
              <Link
                href="/contact"
                aria-label={t("contact")}
                title={t("contact")}
                className="flex-1 flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-white"
                onClick={() => setMobileOpen(false)}
              >
                <Phone className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/** 在线商城入口：购物车图标（电话旁），徽标显示购物车商品总件数 */
function CartEntry() {
  const { t } = useI18n();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("shop_cart");
        const arr = raw ? JSON.parse(raw) : [];
        setCartCount(Array.isArray(arr) ? arr.reduce((s: number, x: any) => s + (Number(x.qty) || 1), 0) : 0);
      } catch {
        setCartCount(0);
      }
    };
    read();
    window.addEventListener("shop-cart-updated", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("shop-cart-updated", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return (
    <Link
      href="/shop"
      aria-label={t("shopTitle")}
      title={t("shopTitle")}
      className="hidden sm:inline-flex relative h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
    >
      <ShoppingBag className="h-5 w-5" />
      {cartCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold leading-none">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({ item, onClose }: { item: any; onClose: () => void }) {
  const [open, setOpen] = useState(false);

  if (!item.children) {
    return (
      <Link
        href={item.href || item.url}
        className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
        onClick={onClose}
        title={item.desc || item.label}
      >
        {item.label}
        {item.desc && <div className="text-xs font-normal text-gray-400 mt-0.5">{item.desc}</div>}
      </Link>
    );
  }

  return (
    <div>
      <button
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <span className="min-w-0 text-start">
          {item.label}
          {item.desc && <div className="text-xs font-normal text-gray-400 mt-0.5">{item.desc}</div>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="ms-4 mt-1 space-y-1 border-s border-gray-200 ps-3">
          {item.children.map((child: any) => (
            child.children && child.children.length > 0 ? (
              <MobileGrandChild key={child.href || child.url} child={child} onClose={onClose} />
            ) : (
              <Link
                key={child.href || child.url}
                href={child.href || child.url}
                className="block rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary"
                onClick={onClose}
                title={child.desc || child.label || child.name}
              >
                {child.label || child.name}
                {child.desc && <div className="text-xs text-gray-400 mt-0.5">{child.desc}</div>}
              </Link>
            )
          ))}
        </div>
      )}
    </div>
  );
}

/** 移动端三级子菜单（可折叠展开） */
function MobileGrandChild({ child, onClose }: { child: any; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <span className="min-w-0 text-start">
          {child.label || child.name}
          {child.desc && <div className="text-xs text-gray-400 mt-0.5">{child.desc}</div>}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="ms-3 mt-1 space-y-1 border-s border-gray-200 ps-2">
          {(child.children || []).map((g: any) => (
            <Link
              key={g.href || g.url}
              href={g.href || g.url}
              className="block rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-primary"
              onClick={onClose}
            >
              {g.label || g.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
