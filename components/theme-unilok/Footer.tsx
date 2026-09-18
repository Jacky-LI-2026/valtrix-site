"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useNavTabs } from "@/lib/api/useProducts";
import { getContactEmail, getContactPhone, getBrandNameEn } from "@/lib/brand";

/** 地址统一转字符串（兼容字符串 / {zh,en,...} 对象 / 多语言后缀字段） */
function addrText(a: any, locale: string): string {
  if (!a) return "";
  if (typeof a === "string") return a;
  if (typeof a === "object") {
    return String(a[locale] || a.zh || a.en || "");
  }
  return String(a);
}

export default function UnilokFooter() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const { productTabs } = useNavTabs();

  const [contactData, setContactData] = useState<any>(null);
  const [menuData, setMenuData] = useState<any[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [oemData, setOemData] = useState<{ frontendBrandEn?: string; frontendCopyright?: string; icp?: string; showLegal?: boolean } | null>(null);

  // 白标 OEM：前台品牌名 / 页脚版权
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

  // Logo（联系方式里可能带 logo，兜底单独拉取）
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

  // 联系信息（phone/email/addresses）
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

  // 菜单数据（快速链接列）
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

  // 快速链接：菜单 API 顶层项优先，失败回退静态导航
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

  // 地址列表
  const addresses = useMemo(() => {
    const addrs = loc.getArray(contactData, "addresses");
    if (addrs.length > 0) return addrs.map((a: any) => addrText(a, locale)).filter(Boolean);
    const single = loc.get(contactData, "address");
    return single ? [single] : [];
  }, [contactData, loc, locale]);

  // 联系方式：DB contact_info 优先，兜底取部署级 env；两者皆空时不渲染该项（不留 tel:/mailto: 空链接）
  const phone = String(contactData?.phone || getContactPhone()).trim();
  const email = String(contactData?.email || getContactEmail()).trim();
  // 品牌名：后台 OEM 配置优先，兜底取部署级 env（G2：不得硬编码为别家公司品牌）
  const brand = oemData?.frontendBrandEn || getBrandNameEn();

  return (
    <footer
      className="text-white"
      style={{ backgroundColor: "var(--color-primary, #0F3460)" }}
    >
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
                <span className="text-xl font-black tracking-tight text-white">{brand}</span>
              )}
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              {t("footerDesc")}
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-2 border border-white/40 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white hover:text-primary"
            >
              {t("contact")}
              <ArrowRight className="h-3.5 w-3.5 rtl-flip" />
            </Link>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/90">
              {t("supportFooter")}
            </h3>
            <ul className="mt-5 space-y-2.5">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 产品分类 */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/90">
              {t("productCenterFooter")}
            </h3>
            <ul className="mt-5 space-y-2.5">
              {productLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 联系方式 */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/90">
              {t("contact")}
            </h3>
            <ul className="mt-5 space-y-3.5">
              {phone && (
                <li>
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-2.5 text-sm text-white/70 transition-colors hover:text-white"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-white/50" />
                    <bdi dir="ltr">{phone}</bdi>
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2.5 text-sm text-white/70 transition-colors hover:text-white"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-white/50" />
                    <bdi dir="ltr">{email}</bdi>
                  </a>
                </li>
              )}
              {addresses.map((addr, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
                  <span>{addr}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 版权栏 */}
      <div className="border-t border-white/15">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
          {oemData?.showLegal !== false && (
            <p className="text-xs text-white/60">
              {oemData?.frontendCopyright ||
                `© ${new Date().getFullYear()} ${brand} Co., Ltd. ${t("allRightsReserved")}`}
            </p>
          )}
          {oemData?.showLegal !== false && oemData?.icp && (
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/60 transition-colors hover:text-white"
            >
              {oemData.icp}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
