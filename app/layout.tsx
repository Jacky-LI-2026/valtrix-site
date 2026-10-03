import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LayoutWrapper from "@/components/LayoutWrapper";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import BackToTop from "@/components/ui/BackToTop";
import { I18nProvider } from "@/lib/i18n";
import { defaultLocale, locales, type Locale } from "@/config/i18n";
import { prisma } from "@/lib/prisma";
import { initScheduler } from "@/lib/scheduler";
import { getSEOConfig, seoTitleForLocale, seoDescForLocale, seoKeywordsForLocale } from "@/lib/seo";
import { getLocaleFromCookies, buildCurrentPageAlternates } from "@/lib/seo-metadata";
import { organizationSchema, websiteSchema, renderJsonLd } from "@/lib/seo/schema";
import { getTemplatePreset, DEFAULT_TEMPLATE_SLUG } from "@/lib/templates/presets";

// 初始化定时任务（仅服务器端，仅执行一次）
if (typeof window === "undefined") {
  try {
    initScheduler();
  } catch (e) {
    console.error("定时任务初始化失败:", e);
  }
}

// 动态生成metadata，从数据库获取SEO配置（多租户：按 Host 站点差异化 siteName）
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSEOConfig(headers())
  // 站点默认标题/描述/关键词按**当前语种**取（页面级 SEO 多语言，owner 2026-09-21）：
  //   库内该语种 → 部署级 env 该语种（标题）→ 库内中文 → env 中文，见 lib/seo.ts 的
  //   seoTitleForLocale / seoDescForLocale / seoKeywordsForLocale。
  const locale = getLocaleFromCookies()
  const title = seoTitleForLocale(seo, locale)
  const description = seoDescForLocale(seo, locale)
  const keywords = seoKeywordsForLocale(seo, locale)
  // canonical + hreflang 由**服务端**输出（此前靠客户端 JS 注入 ⇒ 不执行 JS 的爬虫看不到，
  // 2026-09-18 线上实测确认 HTML 中为 0 个）。根布局兜底，使每个前台页面都有正确的
  // canonical；页面/子布局若自带 alternates 会覆盖这里的值（Next metadata 逐字段合并）。
  // 路径来自 middleware 注入的 `x-pathname`：拿不到就不输出（后台/接口不会产生指向后台的 canonical）。
  const alternates = buildCurrentPageAlternates()
  return {
    title,
    description,
    keywords,
    /**
     * 搜索引擎站长平台「站点归属验证」标签（Baidu 站长平台 · HTML 标签验证，owner 2026-09-29）
     * 值走**服务端环境变量** `BAIDU_SITE_VERIFICATION`（不是 NEXT_PUBLIC_*，因此**不需要重新构建**也能改）：
     *   · 只在左文站的 `.env` 里配置 ⇒ 阀门站首页不会带上左文站的验证码（双站隔离）；
     *   · 未配置时不输出该 meta，行为与之前完全一致。
     */
    ...(process.env.BAIDU_SITE_VERIFICATION
      ? { other: { "baidu-site-verification": process.env.BAIDU_SITE_VERIFICATION } }
      : {}),
    ...(alternates ? { alternates } : {}),
    openGraph: {
      title,
      description,
      type: "website",
      siteName: seo.siteName,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

// 默认主题色值（与 tailwind.config.ts 保持一致）
const DEFAULT_THEME = {
  primary: "#CC0000",
  primaryLight: "#E53935",
  primaryDark: "#990000",
  accent: "#C0C0C0",
  dark: "#111111",
};

async function getTheme() {
  // R4：站点级主题覆盖（多租户）——优先读当前 Host 站点的 themeConfig + 模板风格
  try {
    const { getTenantContext } = await import("@/lib/tenant/context");
    const ctx = await getTenantContext();
    if (ctx?.themeConfig && typeof ctx.themeConfig === "object") {
      const tc: any = ctx.themeConfig;
      if (tc.primary || tc.primaryLight || tc.accent) {
        return {
          primary: tc.primary || DEFAULT_THEME.primary,
          primaryLight: tc.primaryLight || DEFAULT_THEME.primaryLight,
          primaryDark: tc.primaryDark || DEFAULT_THEME.primaryDark,
          accent: tc.accent || DEFAULT_THEME.accent,
          dark: tc.dark || DEFAULT_THEME.dark,
          templateSlug: ctx.templateSlug || "default",
        };
      }
    }
  } catch (error) {
    // 站点上下文不可用时回退全局
  }
  try {
    const config = await prisma.themeConfig.findFirst({
      orderBy: { id: "asc" },
    });
    if (config) {
      return {
        primary: config.primary || DEFAULT_THEME.primary,
        primaryLight: config.primaryLight || DEFAULT_THEME.primaryLight,
        primaryDark: config.primaryDark || DEFAULT_THEME.primaryDark,
        accent: config.accent || DEFAULT_THEME.accent,
        dark: config.dark || DEFAULT_THEME.dark,
        templateSlug: config.templateSlug || DEFAULT_TEMPLATE_SLUG,
      };
    }
  } catch (error) {
    // 数据库不可用时使用默认值
  }
  return { ...DEFAULT_THEME, templateSlug: DEFAULT_TEMPLATE_SLUG };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await getTheme();
  let tune: Record<string, string> = {};

  // 语种优先级（后者覆盖前者）：
  //   代码默认 → 后台 language 表 isDefault → cookie（用户手动选择）
  //   → **URL 显式指定 ?lang=（middleware 转成 x-locale）**
  // ⚠️ ?lang= 必须最高：它是站点地图 hreflang 采用的入口，点开 ?lang=ja 链接就应当看到日文。
  let htmlLang: string = defaultLocale;
  try {
    const langRow = await prisma.language.findFirst({
      where: { isDefault: true },
      select: { code: true },
    });
    if (langRow && (locales as readonly string[]).includes(langRow.code)) {
      htmlLang = langRow.code;
    }
  } catch (e) {
    /* 查默认语种失败用代码默认值 */
  }
  try {
    const cookieLocale = cookies().get("locale")?.value as Locale | undefined;
    if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
      htmlLang = cookieLocale;
    }
  } catch (e) {
    /* 读 cookie 失败用默认 */
  }
  try {
    const xLocale = headers().get("x-locale") as Locale | undefined;
    if (xLocale && (locales as readonly string[]).includes(xLocale)) {
      htmlLang = xLocale;
    }
  } catch (e) {
    /* 读请求头失败则沿用 cookie/默认 */
  }

  // 前台模板预览：middleware 将 ?__template=xxx 转发为 x-preview-template header，
  // 存在时以预览模板覆盖（模板风格 + 模板主色，仅本次请求生效，不落库）
  try {
    const { headers } = await import("next/headers");
    const previewTpl = headers().get("x-preview-template");
    if (previewTpl) {
      const previewPreset = getTemplatePreset(previewTpl);
      theme.templateSlug = previewTpl;
      theme.primary = previewPreset.theme.primary;
      theme.primaryLight = previewPreset.theme.primaryLight;
      theme.primaryDark = previewPreset.theme.primaryDark;
      theme.accent = previewPreset.theme.accent;
      theme.dark = previewPreset.theme.dark;
    }
    // 模板微调参数（?__primary=xxx&__radius=18 等，来自 Demo 页微调面板）
    const tuneRaw = headers().get("x-preview-tune");
    if (tuneRaw) {
      try { tune = JSON.parse(tuneRaw); } catch (e) {}
    }
    if (tune.primary) theme.primary = tune.primary;
    if (tune.accent) theme.accent = tune.accent;
    if (tune.dark) theme.dark = tune.dark;
  } catch (e) {}

  let seo = null;
  try {
    seo = await getSEOConfig();
  } catch (e) {}

  // 前台模板风格引擎（R4 深化）：读取当前模板的 style 偏好，注入 CSS 变量驱动差异化渲染
  const preset = getTemplatePreset(theme.templateSlug || DEFAULT_TEMPLATE_SLUG);
  const radiusMap: Record<string, string> = { sharp: "4px", medium: "10px", round: "18px" };
  const padMap: Record<string, string> = { compact: "56px", normal: "88px", spacious: "112px" };
  const scaleMap: Record<string, number> = { small: 0.94, normal: 1, large: 1.08 };
  const shadowMap: Record<string, string> = {
    none: "none",
    soft: "0 4px 16px rgba(0,0,0,0.06)",
    medium: "0 8px 24px rgba(0,0,0,0.10)",
    hard: "0 12px 32px rgba(0,0,0,0.18)",
  };

  // 微调覆盖后的最终样式值
  const presetRadiusCss = (preset.style as any).radiusCss || "";
  const tunedRadius = tune && tune.radius ? (String(tune.radius).endsWith('px') ? tune.radius : tune.radius + 'px') : presetRadiusCss || radiusMap[preset.style.radius] || "10px";
  const presetSpacingCss = (preset.style as any).spacingCss || "";
  const tunedPad = tune && tune.spacing ? (String(tune.spacing).endsWith('px') ? tune.spacing : tune.spacing + 'px') : presetSpacingCss || padMap[preset.style.spacing] || "88px";
  const presetScaleVal = (preset.style as any).fontScaleValue || 0;
  const tunedScale = tune && tune.fontScale ? Number(tune.fontScale) : presetScaleVal || scaleMap[preset.style.fontScale] || 1;
  const presetShadowCss = (preset.style as any).shadowCss || "";
  const tunedShadow = tune && tune.shadow ? tune.shadow : presetShadowCss || shadowMap[preset.style.shadow] || "0 8px 24px rgba(0,0,0,0.10)";

  const themeVars = {
    "--color-primary": theme.primary,
    "--color-primary-light": theme.primaryLight,
    "--color-primary-dark": theme.primaryDark,
    "--color-accent": theme.accent,
    "--color-dark": theme.dark,
    "--radius": tunedRadius,
    "--section-pad": tunedPad,
    "--font-scale": String(tunedScale),
    "--tpl-shadow": tunedShadow,
    "--tpl-font-family": preset.theme.fontFamily,
  } as React.CSSProperties;

  const jsonLd = seo
    ? renderJsonLd([organizationSchema(seo), websiteSchema(seo)])
    : "";

  return (
    <html
      lang={htmlLang}
      dir={htmlLang === "ar" ? "rtl" : "ltr"}
      style={themeVars}
      data-template={preset.slug}
      data-header-style={preset.style.header}
      data-card-style={preset.style.card}
      data-cta-style={preset.style.cta}
      data-hero-style={preset.style.hero}
      data-title-weight={preset.style.titleWeight || "normal"}
    >
      <body className="min-h-screen flex flex-col">
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLd }}
          />
        )}
        <I18nProvider initialLocale={htmlLang as Locale}>
          <AnalyticsTracker />
          <LayoutWrapper>{children}</LayoutWrapper>
        </I18nProvider>
            <BackToTop />
</body>
    </html>
  );
}
