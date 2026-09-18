import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { translations, defaultLocale, locales } from "@/config/i18n";
import { getSiteBaseUrl } from "@/lib/site-url";
import { getBrandName } from "@/lib/brand";

/**
 * 详情页 SEO metadata 统一构建
 * - 语种来源优先级：**`x-locale` 请求头（middleware 由 `?lang=` 解析）** → cookie `locale` → 默认语种
 *   ⚠️ x-locale 必须优先：`?lang=` 是站点地图 hreflang 采用的**可分享/可索引**入口，
 *      而 cookie 是"用户上次选择"的持久偏好；点开 `?lang=ja` 链接时应看到日文。
 * - 字段：按语种取 seoTitle / seoDescription / seoKeywords（后缀 En/Ja/Ko/Fr/Ar），空则回退中文
 */

const LOCALES = locales as readonly string[];
const SUFFIX: Record<string, string> = { zh: "", en: "En", ja: "Ja", ko: "Ko", fr: "Fr", ar: "Ar" };

/**
 * 六语种 ↔ hreflang 值映射（口径**必须**与 `app/sitemap.ts` 一致）。
 * 站点 URL 无语言前缀，非中文语种用 `?lang=xx` 区分（middleware 解析为 x-locale）。
 */
const HREFLANG_LOCALES: readonly { code: string; hreflang: string }[] = [
  { code: "zh", hreflang: "zh-Hans" },
  { code: "en", hreflang: "en" },
  { code: "ja", hreflang: "ja" },
  { code: "ko", hreflang: "ko" },
  { code: "fr", hreflang: "fr" },
  { code: "ar", hreflang: "ar" },
];

/** 规范化页面路径：首页 → ""，其余以 `/` 开头且无尾斜杠（忽略查询串与 hash） */
export function normalizePagePath(path?: string | null): string {
  if (!path) return "";
  const p = String(path).split("?")[0].split("#")[0].trim();
  if (!p || p === "/") return "";
  const trimmed = p.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * 某语种对应的**可索引** URL：中文无参数，其余 `?lang=xx`。
 * 域名取自部署级环境变量（`lib/site-url.ts`），不硬编码（G2）。
 */
export function localizedPageUrl(path: string | null | undefined, locale: string): string {
  const base = getSiteBaseUrl();
  const p = normalizePagePath(path);
  // 「无参数」形式对应**本站默认语种**，而不是硬编码 zh ——
  // 各部署默认语种不同（基地=zh、阀门站=en，见 config/i18n.ts 的 defaultLocale），
  // 硬编码 zh 会让英文默认站点的 canonical 指向一个"其实返回英文"的 ?lang 参数地址。
  if (!locale || locale === defaultLocale) return `${base}${p}`;
  return `${base}${p}?lang=${locale}`;
}

/** 全语种 hreflang 映射（含 x-default），与 sitemap 使用同一口径 */
export function buildLanguageAlternates(path: string | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const l of HREFLANG_LOCALES) map[l.hreflang] = localizedPageUrl(path, l.code);
  map["x-default"] = localizedPageUrl(path, defaultLocale);
  return map;
}

/**
 * 页面级 alternates（**服务端输出**）
 * =====================================================
 * canonical 指向**当前语种自身**（非中文带 `?lang=xx`），而不是永远指向无参数版本。
 *
 * 为什么：hreflang 的语义是「这 6 个 URL 互为同一页面的语言版本」。若每个语言版本的
 * canonical 都指向无参数版本，等于告诉搜索引擎「除中文外的 5 个版本都是重复内容」
 * ⇒ hreflang 相互打架、语言版本不被收录。
 *
 * ⚠️ 此前 canonical/hreflang 由客户端组件 `components/seo/SeoAlternates.tsx` 用 JS 注入
 * ⇒ 不执行 JS 的爬虫在 HTML 里看不到。2026-09-18 线上实测（阀门站 `/`、`/products`、
 * `/news`、`/cases`）：HTML 中 `rel="canonical"` 与 `hreflang` **均为 0 个**。
 * 现改为服务端输出；SeoAlternates 退化为「服务端没输出时才兜底」。
 */
export function buildPageAlternates(
  path: string | null | undefined,
  locale?: string
): Metadata["alternates"] {
  const loc = locale || getLocaleFromCookies();
  return {
    canonical: localizedPageUrl(path, loc),
    languages: buildLanguageAlternates(path),
  };
}

/**
 * 解析「当前页面的真实路径」
 * =====================================================
 * 优先级：显式传入 → middleware 注入的 `x-pathname` 请求头 → **返回 null（不输出）**。
 *
 * 为什么用请求头而不是在每个 layout 里写死 `path: "/products"`：
 *   layout 的 metadata 会被**子路由继承**。若 `/products/layout.tsx` 写死
 *   `path:"/products"`，那么 `/products/<tab>/<id>` 也会继承到 canonical=`/products`
 *   ⇒ 把产品详情页声明成"列表页的重复内容"。同类问题还有 `/about/[section]`、
 *   `/resources/[type]`、`/cases/[slug]` 等。
 *   用真实请求路径则**每个层级自动正确**，且新增路由无需再接线。
 *
 * ⚠️ 拿不到路径时**返回 null 并放弃输出** alternates —— canonical 指错比没有更糟。
 */
function resolvePagePath(explicit?: string | null): string | null {
  if (explicit) return normalizePagePath(explicit);
  try {
    const x = headers().get("x-pathname");
    if (x !== null && x !== undefined) return normalizePagePath(x);
  } catch (e) {
    /* headers 不可用（如静态生成阶段）→ 放弃输出 */
  }
  return null;
}

/**
 * 供**根布局**使用：按当前请求路径产出 alternates。
 * 根布局兜底 ⇒ 即使某个页面自己没有 generateMetadata（如 `/shop`、`/content/*`），
 * 也能拿到正确的 canonical + hreflang。
 *
 * ⚠️ 拿不到 `x-pathname` 时返回 undefined（**不输出**）。
 *    middleware 只给前台页面注入该头，故 `/admin/**`、`/api/**` 不会出现
 *    指向后台的 canonical —— 这是刻意的。
 */
export function buildCurrentPageAlternates(): Metadata["alternates"] | undefined {
  const p = resolvePagePath();
  return p === null ? undefined : buildPageAlternates(p);
}

export function getLocaleFromCookies(): string {
  // 1) URL 显式指定语种（middleware 由 ?lang= 解析后写入 x-locale）
  try {
    const x = headers().get("x-locale");
    if (x && LOCALES.includes(x)) return x;
  } catch (e) {
    /* headers 不可用时继续走 cookie */
  }
  // 2) 用户持久偏好
  try {
    const c = cookies();
    const v = c.get("locale")?.value;
    if (v && LOCALES.includes(v)) return v;
  } catch (e) {
    /* cookie 不可用则回退默认语种 */
  }
  return defaultLocale;
}

/** 按语种取字段，空则回退中文 */
export function pickField(record: any, base: string, locale: string): string {
  if (!record) return "";
  const key = base + SUFFIX[locale] || base;
  const v = record[key];
  if (v && String(v).trim()) return String(v).trim();
  const zh = record[base];
  if (zh && String(zh).trim()) return String(zh).trim();
  return "";
}

export function buildSeoMetadata(opts: {
  record: any;
  locale?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  /** 页面路径（如 `/news/xxx`）—— 传入即输出 canonical + hreflang（见 buildPageAlternates） */
  path?: string;
}): Metadata {
  const locale = opts.locale || getLocaleFromCookies();
  // 回退顺序：seoTitle<语种> → 传入的 fallbackTitle（英文名优先） → seoTitle 中文兜底
  const title = pickField(opts.record, "seoTitle", locale) || opts.fallbackTitle || pickField(opts.record, "seoTitle", "zh") || "";
  const description = pickField(opts.record, "seoDescription", locale) || opts.fallbackDescription || pickField(opts.record, "seoDescription", "zh") || undefined;
  const keywords = pickField(opts.record, "seoKeywords", locale) || undefined;
  const path = resolvePagePath(opts.path);
  return {
    title: title || undefined,
    description,
    keywords,
    openGraph: {
      title: title || undefined,
      description,
      locale,
    },
    ...(path === null ? {} : { alternates: buildPageAlternates(path, locale) }),
  };
}

/**
 * 列表页 SEO metadata 统一构建（供各列表页目录的 server layout.tsx 调用）
 * - 语种来源：cookie `locale`（与详情页一致），缺省回退 zh
 * - title 用 i18n 导航 key（如 products），description 用 xxxPageSubtitle key
 * - 需配合 server layout.tsx 使用（client page 无法导出 generateMetadata）
 *
 * 2026-09-18 修正三处（线上实测驱动，见 `会话记录/`）：
 *   ① **title 补品牌后缀** —— 此前直接输出 i18n 裸值，线上阀门站
 *      `/products` = `<title>Products</title>`、`/news` = `<title>News</title>`，
 *      既无品牌也无关键词，是站点最主要的 SEO 短板；
 *   ② **输出 canonical + hreflang**（传 `path` 时）—— 见 `buildPageAlternates` 注释；
 *   ③ **输出 openGraph.url / siteName** —— 社交分享卡片此前没有站点信息。
 *
 * ⚠️ 调用点必须传 `path`，否则 ①②③ 不生效（保持向后兼容，故为可选参数）。
 */
/**
 * 取列表页标题用的品牌名：**env 优先，未配置时回退 DB**。
 *
 * 为什么需要 DB 回退：品牌名在部署环境中来自 `NEXT_PUBLIC_BRAND_NAME`，但该变量
 *   是**构建期内联**的，未配置的部署（实测：阀门站 .env 没有这一项）拿不到值
 *   ⇒ 列表页标题只能是裸标题 `<title>Products</title>`，品牌与关键词全丢。
 *   `lib/server/brand.ts` 是本项目约定的**服务端品牌真源**（DB 优先、env 兜底），
 *   故此处用它兜底。env 已配置时不查库，零额外开销。
 */
async function resolveBrandName(): Promise<string> {
  const fromEnv = getBrandName();
  if (fromEnv) return fromEnv;
  try {
    const { getBrandInfo } = await import("@/lib/server/brand");
    return (await getBrandInfo()).name || "";
  } catch (e) {
    return "";
  }
}

export async function buildListPageMetadata(opts: {
  titleKey: string;
  subtitleKey?: string;
  /** 该列表页路径（如 `/products`）；传入即输出 canonical / hreflang / og:url */
  path?: string;
  locale?: string;
}): Promise<Metadata> {
  const locale = opts.locale || getLocaleFromCookies();
  const dict = (translations as Record<string, any>)[locale] || translations.zh;
  const brand = await resolveBrandName();
  const pageName = dict?.[opts.titleKey] || "";
  // 品牌后缀：`产品中心 - 左文科技`。品牌名为空时退回裸标题（宁可不加，也不显示别家品牌，G2）
  const title = pageName && brand ? `${pageName} - ${brand}` : pageName || brand || "";
  const description = opts.subtitleKey ? dict?.[opts.subtitleKey] || "" : "";
  // 路径优先取显式传参，否则取 middleware 注入的真实请求路径（见 resolvePagePath）
  const path = resolvePagePath(opts.path);
  return {
    title: title || undefined,
    description: description || undefined,
    openGraph: {
      title: title || undefined,
      description: description || undefined,
      locale,
      type: "website",
      siteName: brand || undefined,
      url: path === null ? undefined : localizedPageUrl(path, locale),
    },
    ...(path === null ? {} : { alternates: buildPageAlternates(path, locale) }),
  };
}
