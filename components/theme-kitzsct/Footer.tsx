"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, ArrowRight, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useNavTabs } from "@/lib/api/useProducts";
import { getBrandName, getBrandNameEn, getContactEmail, getContactPhone } from "@/lib/brand";
import { type Locale } from "@/config/i18n";

/**
 * 集团 / 关联站点 banner 的配置来源。
 *
 * **地址一律不写死在代码里**（G2：站点差异走配置）：
 *   1. `/api/public/site-config?key=<键>`（支持站点级覆盖，后台可视化维护）——首选
 *   2. `NEXT_PUBLIC_KITZ_GROUP_SITES`（环境变量，部署级兜底）
 * 两个键依次尝试：主键未配置时回退通用键，避免站位块的键名约定与这里不一致时整块不显示。
 * **未配置 ⇒ 整块不渲染**（宁可不显示，也不给出一条指向别处的链接）。
 */
const GROUP_SITES_CONFIG_KEYS = ["kitz_group_sites", "group_sites"];

/** 解析后的集团站点条目：url 一定是 http(s) 外链或站内绝对路径 */
type GroupSite = { label: any; url: string };

/** 只接受 http(s) 外链与站内绝对路径：挡住 javascript: 之类的协议注入，也挡住把原文当链接 */
function isSafeUrl(u: string): boolean {
  return /^https?:\/\//i.test(u) || (u.startsWith("/") && !u.startsWith("//"));
}

/**
 * 解析集团站点配置，兼容后台可能保存的三种形态：
 *   - JSON 数组：`[{ name, url }]`（name 可为多语言字段对象）
 *   - 对象映射：`{ "站点名": "https://..." }`（也接受 `{ items: [...] }` 包装）
 *   - 纯文本：每行 `名称|URL`（只给 URL 时用其显示名兜底）
 */
function parseGroupSites(raw: unknown): GroupSite[] {
  const out: GroupSite[] = [];
  const push = (name: any, url: any) => {
    const u = String(url || "").trim();
    if (!isSafeUrl(u)) return;
    out.push({ label: name == null ? "" : name, url: u });
  };

  // 纯文本行：名称|URL
  if (typeof raw === "string") {
    raw
      .split(/[\r\n;]+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const idx = line.indexOf("|");
        if (idx >= 0) push(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
        else push("", line);
      });
    return out;
  }

  // 数组形态
  if (Array.isArray(raw)) {
    raw.forEach((item: any) => {
      if (typeof item === "string") {
        const idx = item.indexOf("|");
        if (idx >= 0) push(item.slice(0, idx).trim(), item.slice(idx + 1).trim());
        else push("", item);
        return;
      }
      if (item && typeof item === "object") {
        if (item.enabled === false) return; // 后台可单条停用
        push(item.name ?? item.label ?? item.title ?? "", item.url ?? item.href ?? item.link ?? "");
      }
    });
    return out;
  }

  // 对象形态：{items:[...]} 或 {名称:URL}
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, any>;
    const list = obj.items ?? obj.sites ?? obj.list;
    if (Array.isArray(list)) return parseGroupSites(list);
    Object.keys(obj).forEach((k) => {
      const v = obj[k];
      if (typeof v === "string") push(k, v);
      else if (v && typeof v === "object") push(v.name ?? k, v.url ?? v.href ?? "");
    });
  }
  return out;
}

/**
 * KITZ SCT 风 · 全局页脚（浅灰底 / 方形直角 / 细分隔线）
 *
 * 口径（与既有主题一致，逐条对齐）：
 *   - 品牌名：后台 OEM 配置优先，兜底部署级 `lib/brand` —— 不出现任何硬编码品牌名
 *   - 联系方式：DB `contact_info` 优先，兜底部署级环境变量；**空则不渲染该行**（不留空 tel:/mailto:）
 *   - 版权行：`oemData.frontendCopyright` 优先；`showLegal === false` 时**整块隐藏**（版权 + ICP 一起）
 *   - ICP：需 `showLegal !== false` **且非英文站** 且有值
 */
export default function KitzFooter() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const { productTabs } = useNavTabs();

  // 新增文案集中取值：缺 i18n key 时类型报错只出现在这里，便于站位块一次性补齐
  const footerDesc = t("kitzFooterDesc");
  const groupSitesTitle = t("kitzGroupSitesTitle");
  const groupSitesVisit = t("kitzGroupSitesVisit");

  const isEn = locale === "en";

  const [contactData, setContactData] = useState<any>(null);
  const [menuData, setMenuData] = useState<any[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [oemData, setOemData] = useState<{
    frontendBrandEn?: string;
    frontendCopyright?: string;
    icp?: string;
    showLegal?: boolean;
  } | null>(null);
  // 环境变量兜底值先入状态，DB 配置一旦取到就覆盖（配置优先级：DB > env）
  const [groupSites, setGroupSites] = useState<GroupSite[]>(() =>
    parseGroupSites(process.env.NEXT_PUBLIC_KITZ_GROUP_SITES)
  );

  // 白标 OEM：前台品牌名 / 页脚版权 / ICP / 版权块开关
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/oem", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok && d.data) setOemData(d.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Logo（未配置时用文字字标，不写死任何图片路径）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=logo", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) setLogoUrl(String(data.data));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 联系信息（phone / email / addresses）：DB 优先，兜底部署级环境变量
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

  // 集团 / 关联站点：依次尝试配置键，第一个解析出条目的即采用；都为空则保持 env 兜底（可能也是空 ⇒ 整块不渲染）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const key of GROUP_SITES_CONFIG_KEYS) {
        try {
          const res = await fetch(`/api/public/site-config?key=${key}`, { cache: "no-store" });
          const data = await res.json();
          const parsed = parseGroupSites(data?.data);
          if (parsed.length > 0) {
            if (!cancelled) setGroupSites(parsed);
            return;
          }
        } catch {
          /* 单个键读取失败不阻断后续键 */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 多列导航：与主导航同源（菜单 API）
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/menus?locale=${locale}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setMenuData(data.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // 快速链接：菜单 API 顶层项优先，失败回退静态导航（文案全部走既有 i18n 键）
  const quickLinks = useMemo(() => {
    const fromApi = menuData
      .filter((m: any) => m.url && m.url !== "#")
      .slice(0, 8)
      .map((m: any) => ({ label: m.name, href: m.url }));
    if (fromApi.length > 0) return fromApi;
    return [
      { label: t("home"), href: "/" },
      { label: t("industries"), href: "/industries" },
      { label: t("services"), href: "/services" },
      { label: t("resources"), href: "/resources" },
      { label: t("news"), href: "/news" },
      { label: t("about"), href: "/about" },
      { label: t("careers"), href: "/careers" },
      { label: t("contact"), href: "/contact" },
    ];
  }, [menuData, t]);

  // 产品分类列：来自 useNavTabs（轻量接口 /api/public/nav）实时数据
  const productLinks = useMemo(
    () =>
      productTabs.map((tab: any) => ({
        label: loc.get(tab, "name"),
        href: `/products?tab=${tab.id}`,
      })),
    [productTabs, loc]
  );

  // 地址列表：多语言取值一律走 lib/localized 口径
  const addresses = useMemo(() => {
    const list = loc.getArray(contactData, "addresses");
    if (list.length > 0) return list.map((a: any) => addrText(a, loc)).filter(Boolean);
    const single = loc.get(contactData, "address");
    return single ? [single] : [];
  }, [contactData, loc]);

  const phone = String(contactData?.phone || getContactPhone()).trim();
  const email = String(contactData?.email || getContactEmail()).trim();
  // 品牌名：后台 OEM 配置优先 → 部署级英文品牌名 → 部署级品牌名（三级兜底，全为配置来源）
  const brand = oemData?.frontendBrandEn || getBrandNameEn() || getBrandName();

  // 版权块开关：showLegal 显式为 false 时，版权行与 ICP 行**一起**隐藏（整块不渲染）
  const showLegal = oemData?.showLegal !== false;
  const showIcp = showLegal && !isEn && !!oemData?.icp;

  return (
    <footer className="border-t border-gray-200 bg-dark-50 text-dark">
      <div className="container py-14 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* 公司简介 */}
          <div>
            <Link href="/" className="inline-flex items-center" aria-label={brand}>
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={brand}
                  width={200}
                  height={44}
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <span className="text-xl font-black tracking-tight text-dark">{brand}</span>
              )}
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-600">{footerDesc}</p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-2 border border-primary px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
            >
              {t("contact")}
              <ArrowRight className="rtl-flip h-3.5 w-3.5" />
            </Link>
          </div>

          {/* 快速链接（与主导航同源） */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900">
              {t("supportFooter")}
            </h3>
            <ul className="mt-5 space-y-2.5">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 产品分类 */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900">
              {t("productCenterFooter")}
            </h3>
            <ul className="mt-5 space-y-2.5">
              {productLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 联系方式：每一项独立判空，为空则整行不渲染 */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900">
              {t("contact")}
            </h3>
            <ul className="mt-5 space-y-3.5">
              {phone && (
                <li>
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-2.5 text-sm text-gray-600 transition-colors hover:text-primary"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    <bdi dir="ltr">{phone}</bdi>
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2.5 text-sm text-gray-600 transition-colors hover:text-primary"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <bdi dir="ltr">{email}</bdi>
                  </a>
                </li>
              )}
              {addresses.map((addr, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{addr}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 集团 / 关联站点 banner：地址来自配置，未配置则整块不渲染 */}
      {groupSites.length > 0 && (
        <div className="border-t border-gray-200 bg-white">
          <div className="container flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="h-4 w-1 bg-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900">
                {groupSitesTitle}
              </h3>
            </div>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {groupSites.map((site) => {
                const label = groupSiteLabel(site, loc, locale);
                const external = /^https?:\/\//i.test(site.url);
                return (
                  <li key={site.url}>
                    {external ? (
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={groupSitesVisit}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-primary"
                      >
                        <span>{label}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      </a>
                    ) : (
                      <Link
                        href={site.url}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-primary"
                      >
                        <span>{label}</span>
                        <ArrowRight className="rtl-flip h-3.5 w-3.5 shrink-0 opacity-60" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* 版权栏：showLegal === false 时整块隐藏（版权 + ICP 一起） */}
      {showLegal && (
        <div className="border-t border-gray-200 bg-white">
          <div className="container flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
            <p className="text-xs text-gray-500">
              {oemData?.frontendCopyright ||
                `© ${new Date().getFullYear()} ${brand} ${t("allRightsReserved")}`}
            </p>
            {showIcp && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 transition-colors hover:text-primary"
              >
                {oemData?.icp}
              </a>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}

/**
 * 地址项转文本：兼容「纯字符串」与「多语言字段对象」两种后台存法。
 * 只走 lib/localized 的取值口径（不手写「按语种三元取字段」那种写法）。
 */
function addrText(a: any, loc: ReturnType<typeof createLocalizedGetter>): string {
  if (a === null || a === undefined) return "";
  if (typeof a === "string") return a;
  return loc.getText(a, "text") || loc.getText(a, "address") || loc.getText(a, "value");
}

/**
 * 集团站点显示名：兼容「纯字符串」与「多语言对象」。
 * 对象取不到 text/name 字段时，把语种键本身当字段名交给同一套取值口径
 * （`loc.get(raw, locale)` / `loc.get(raw, "zh")`），从而支持 {zh, en, ...} 逐语种映射，
 * 而不是在组件里写语种三元表达式。
 */
function groupSiteLabel(
  site: GroupSite,
  loc: ReturnType<typeof createLocalizedGetter>,
  locale: Locale
): string {
  const raw = site.label;
  if (typeof raw === "string" && raw) return raw;
  if (raw && typeof raw === "object") {
    const label =
      loc.get(raw, "text") ||
      loc.get(raw, "name") ||
      loc.get(raw, "label") ||
      loc.get(raw, locale) ||
      loc.get(raw, "zh");
    if (label) return label;
  }
  // 名称缺失时退化为 URL 主体，至少有可读文本
  return site.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
