"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import EmailSubscribe from "@/components/EmailSubscribe";
import { getContactEmail, getContactPhone } from "@/lib/brand";

// 二维码占位组件 - 用SVG生成模拟二维码图案
function QRCodePlaceholder({ seed, label }: { seed: number; label: string }) {
  // 基于seed生成伪随机二维码图案
  const size = 21;
  const cells: boolean[] = [];
  let s = seed;
  for (let i = 0; i < size * size; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    cells.push(s % 3 === 0);
  }
  // 三个定位角
  const isFinder = (r: number, c: number) => {
    const inTopLeft = r < 7 && c < 7;
    const inTopRight = r < 7 && c >= size - 7;
    const inBottomLeft = r >= size - 7 && c < 7;
    return inTopLeft || inTopRight || inBottomLeft;
  };
  const finderPattern = (r: number, c: number) => {
    const lr = r < 7 ? r : r - (size - 7);
    const lc = c < 7 ? c : c - (size - 7);
    const onBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6;
    const inner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
    return onBorder || inner;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="tpl-card bg-white p-1.5 rounded border border-gray-200">
        <svg width="100" height="100" viewBox={`0 0 ${size} ${size}`} className="block">
          <rect width={size} height={size} fill="white" />
          {cells.map((filled, i) => {
            const r = Math.floor(i / size);
            const c = i % size;
            if (isFinder(r, c)) {
              return finderPattern(r, c) ? (
                <rect key={i} x={c} y={r} width="1" height="1" fill="#1a1a1a" />
              ) : null;
            }
            return filled ? (
              <rect key={i} x={c} y={r} width="1" height="1" fill="#1a1a1a" />
            ) : null;
          })}
        </svg>
      </div>
      <span className="text-xs font-medium text-gray-700 tracking-wide">{label}</span>
    </div>
  );
}

export default function Footer() {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const loc = createLocalizedGetter(locale);
  const [contactData, setContactData] = useState<any>(null);
  const [menuData, setMenuData] = useState<any[]>([]);
  const [oemData, setOemData] = useState<{ frontendBrand?: string; frontendBrandEn?: string; frontendCopyright?: string; icp?: string; showLegal?: boolean } | null>(null);
  // 插件启用状态（关闭的插件前台隐藏对应链接）
  const [pluginState, setPluginState] = useState<Record<string, boolean>>({});

  // 拉取插件启用状态
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
  const pluginOn = (key: string) => pluginState[key] !== false;

  // 白标 OEM：前台品牌名 / 页脚版权
  useEffect(() => {
    fetch("/api/public/oem", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d?.ok && d.data) setOemData(d.data) })
      .catch(() => {})
  }, [])

  // 从API获取联系信息
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=contact_info", { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) {
          setContactData(data.data);
        }
      })
      .catch((err) => {
        console.warn("获取联系信息失败，使用默认数据:", err);
      });
    return () => { cancelled = true; };
  }, []);

  // 从API获取菜单数据
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/menus?locale=${locale}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setMenuData(data.data);
        }
      })
      .catch((err) => {
        console.warn("获取菜单数据失败，使用默认菜单:", err);
      });
    return () => { cancelled = true; };
  }, [locale]);

  // 从菜单数据中提取子菜单
  const getMenuChildren = (parentLabel: string, parentLabelEn: string) => {
    const parent = menuData.find((m: any) =>
      m.name === parentLabel || m.name === parentLabelEn || m.nameEn === parentLabelEn || m.nameZh === parentLabel
    );
    if (parent && parent.children && parent.children.length > 0) {
      return parent.children.map((child: any) => ({
        label: child.name || child.label,
        href: child.url || child.href,
      }));
    }
    return null;
  };

  const footerLinks = {
    products: getMenuChildren("产品中心", "Products") || [
      { label: t("vcrFittings"), href: "/products?tab=vcr-fittings" },
      { label: t("diaphragmValves"), href: "/products?tab=diaphragm-valves" },
      { label: t("checkValves"), href: "/products?tab=check-valves" },
      { label: t("gasFilters"), href: "/products?tab=filters" },
    ],
    industries: getMenuChildren("应用领域", "Industries") || [
      { label: t("semiconductor"), href: "/industries/semiconductor" },
      { label: t("biopharmaceutical"), href: "/industries/biopharmaceutical" },
      { label: t("ledDisplay"), href: "/industries/led-display" },
      { label: t("solar"), href: "/industries/solar-photovoltaic" },
      { label: t("hydrogen"), href: "/industries/hydrogen-energy" },
      { label: t("researchLabs"), href: "/industries/research-labs" },
    ],
    support: getMenuChildren("服务支持", "Services") || [
      { label: t("technicalSupport"), href: "/services/technical-support" },
      { label: t("odmService"), href: "/services/custom-manufacturing" },
      { label: t("valtrixService"), href: "/services/maintenance-service" },
      { label: t("afterSales"), href: "/services/training-consulting" },
      { label: t("catalogs"), href: "/resources/manual" },
      { label: t("drawings"), href: "/resources/drawing" },
    ],
    company: (() => {
      const menu = getMenuChildren("关于我们", "About");
      const extra = [
        { label: t("news"), href: "/news" },
        { label: t("cases"), href: "/cases" },
        { label: t("faq"), href: "/faqs" },
        { label: t("careers"), href: "/careers" },
        { label: t("contact"), href: "/contact" },
        ...(pluginOn("visit-booking") ? [{ label: t("visitBooking"), href: "/visit-booking" }] : []),
      ];
      const base = menu && menu.length ? menu : [
        { label: t("companyProfile"), href: "/about/profile" },
        { label: t("ourHonors"), href: "/about/honors" },
        { label: t("ourHistory"), href: "/about/history" },
      ];
      const seen = new Set(base.map((x: any) => x.href));
      return base.concat(extra.filter((x: any) => !seen.has(x.href)));
    })(),
  };

  // 联系方式：DB contact_info 优先，兜底取部署级 env；两者皆空时不渲染该项（不留 tel:/mailto: 空链接）
  const phone = String(contactData?.phone || getContactPhone()).trim();
  const email = String(contactData?.email || getContactEmail()).trim();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="container py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="inline-block">
              <Image src={contactData?.logo || "/images/logo.png"} alt={oemData?.frontendBrandEn || "VALTRIX"} width={280} height={56} className="h-11 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-gray-600 leading-relaxed">{t("footerDesc")}</p>
            <div className="mt-6 space-y-3">
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 text-primary" />
                  <bdi dir="ltr">{phone}</bdi>
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-primary" />
                  <bdi dir="ltr">{email}</bdi>
                </a>
              )}
              {/* 多个地址遍历展示，第一行为主地址 */}
              {(() => {
                const addrs = loc.getArray(contactData, "addresses");
                if (addrs.length > 0) return addrs;
                const single = loc.get(contactData, "address");
                return single ? [single] : [];
              })().map((addr, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {typeof addr === "string" ? addr : (addr?.[locale] || addr?.zh || "")}
                </div>
              ))}
            </div>


            {/* 邮件订阅 */}
            <div className="mt-8">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {t("footerSubscribe")}
              </p>
              <EmailSubscribe />
            </div>

            {/* Social QR Codes */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                {t("footerFollowUs")}
              </p>
              <div className="flex gap-5 flex-wrap">
                {(() => {
                  // 自定义社交媒体（后台 socials，最多 7 个，多语言名称）
                  const cfg = Array.isArray(contactData?.socials) && contactData.socials.length > 0
                    ? contactData.socials.filter((x: any) => x && x.enabled !== false)
                    : [];
                  const items = cfg.length > 0
                    ? cfg.map((x: any, i: number) => ({
                        seed: 12345 + i * 1111,
                        name: x.name || "",
                        qr: x.qrCode || "",
                        url: x.url || "",
                      }))
                    : // 未配置时回退默认三项占位
                      [
                        { seed: 12345, name: "LinkedIn", qr: "", url: "" },
                        { seed: 67890, name: "YouTube", qr: "", url: "" },
                        { seed: 24680, name: "X (Twitter)", qr: "", url: "" },
                      ];
                  return items.map((item: any, idx: number) => {
                    const nm = item.name && typeof item.name === "object"
                      ? String(item.name[locale] || item.name.zh || "")
                      : String(item.name || "");
                    if (item.qr) {
                      return (
                        <div key={idx} className="flex flex-col items-center gap-2">
                          <div className="tpl-card bg-white p-1.5 rounded border border-gray-200 transition-all duration-200 hover:border-primary/40 hover:shadow-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.qr} alt={nm} width={100} height={100} className="block rounded" />
                          </div>
                          {nm && <span className="text-xs font-medium text-gray-700 tracking-wide">{nm}</span>}
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <QRCodePlaceholder seed={item.seed} label={nm} />
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t("productCenterFooter")}</h3>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.products.map((item: any) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-primary transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Industries */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t("industryFooter")}</h3>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.industries.map((item: any) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-primary transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support + Company */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t("supportFooter")}</h3>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.support.map((item: any) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-primary transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-sm font-semibold text-gray-900">{t("aboutFooter")}</h3>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.company.map((item: any) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-primary transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200 bg-white">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
          {oemData?.showLegal !== false && (
            <p className="text-xs text-gray-500">{oemData?.frontendCopyright || `© ${new Date().getFullYear()} VALTRIX Co., Ltd. ${t("allRightsReserved")}`}</p>
          )}
          {oemData?.showLegal !== false && !isEn && oemData?.icp && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{oemData.icp}</a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
