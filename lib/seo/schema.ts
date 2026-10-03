/**
 * JSON-LD 结构化数据生成器（Schema.org）
 * 用于 AEO / SEO 优化：Organization / WebSite / Product / Article / Service / BreadcrumbList
 */

import { getSiteBaseUrl } from "@/lib/site-url";
import { getBrandName, getBrandNameEn } from '@/lib/brand';

// 站点域名一律取自部署级环境变量（NEXT_PUBLIC_SITE_URL），不得硬编码
// （双 fork 合并 D1 = 单码多库：同一份代码服务多个独立域名站点）
const BASE_URL = getSiteBaseUrl();

/** 站点机构（Organization + LocalBusiness 可选地址） */
export function organizationSchema(seo: any): object {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: seo?.siteName || getBrandName(),
    alternateName: seo?.siteNameEn || getBrandNameEn(),
    url: BASE_URL,
    logo: `${BASE_URL}/images/logo.png`,
    foundingDate: "2018",
    description: seo?.defaultDesc || "",
    sameAs: [],
  };
  if (seo?.email) schema.email = seo.email;
  if (seo?.phone) schema.telephone = seo.phone;
  if (seo?.companyAddress) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: seo.companyAddress,
      addressCountry: "CN",
    };
  }
  if (seo?.geoRegion) schema.areaServed = seo.geoRegion;
  return schema;
}

/** 网站（WebSite + SearchAction） */
export function websiteSchema(seo: any): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: seo?.siteName || getBrandName(),
    alternateName: seo?.siteNameEn || getBrandNameEn(),
    url: BASE_URL,
    publisher: { "@id": `${BASE_URL}/#organization` },
    inLanguage: ["zh-CN", "en", "ja", "ko", "fr", "ar"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** 面包屑 */
export function breadcrumbSchema(items: { name: string; path: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.path.startsWith("http") ? it.path : `${BASE_URL}${it.path}`,
    })),
  };
}

/** 产品（含参考价与品牌） */
export function productSchema(p: {
  name: string;
  description?: string;
  image?: string | null;
  url?: string;
  sku?: string;
  brand?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  priceUnit?: string | null;
}): object {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    brand: { "@type": "Brand", name: p.brand || getBrandNameEn() },
    description: p.description || "",
    url: p.url || BASE_URL,
  };
  if (p.image) schema.image = p.image;
  if (p.sku) schema.sku = p.sku;
  if (p.priceMin != null && p.priceMax != null) {
    schema.offers = {
      "@type": "Offer",
      priceCurrency: "CNY",
      price: String(p.priceMin),
      highPrice: String(p.priceMax),
      lowPrice: String(p.priceMin),
      priceSpecification: {
        "@type": "PriceSpecification",
        price: String(p.priceMin),
        priceCurrency: "CNY",
        valueAddedTaxIncluded: false,
      },
      availability: "https://schema.org/InStock",
      url: p.url || BASE_URL,
    };
  }
  return schema;
}

/** 新闻文章 */
export function articleSchema(a: {
  title: string;
  description?: string;
  image?: string | null;
  url?: string;
  datePublished?: Date | string | null;
  dateModified?: Date | string | null;
  author?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description || "",
    image: a.image || undefined,
    author: { "@type": "Organization", name: a.author || getBrandName() },
    publisher: { "@id": `${BASE_URL}/#organization` },
    datePublished: a.datePublished ? new Date(a.datePublished).toISOString() : undefined,
    dateModified: a.dateModified ? new Date(a.dateModified).toISOString() : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": a.url || BASE_URL },
  };
}

/** 服务 */
export function serviceSchema(s: {
  name: string;
  description?: string;
  url?: string;
  provider?: string;
  areaServed?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    serviceType: s.name,
    description: s.description || "",
    url: s.url || BASE_URL,
    provider: { "@type": "Organization", name: s.provider || getBrandName() },
    areaServed: s.areaServed || "Global",
  };
}

/** 渲染 JSON-LD script 标签内容 */
export function renderJsonLd(data: object | object[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
