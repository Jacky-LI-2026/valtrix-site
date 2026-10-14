import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import { productSchema, breadcrumbSchema, renderJsonLd } from "@/lib/seo/schema";
import { getBrandInfo } from "@/lib/server/brand";
import { getSiteBaseUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * 商城商品页 SEO / GEO（owner 2026-10-14：「商品页同时也要增加 SEO 和 GEO 功能」）
 * ==========================================================================
 * 为什么写在 layout 里：`app/shop/[slug]/page.tsx` 是**客户端组件**（useI18n / useParams），
 * 客户端组件不能导出 `metadata` ⇒ 用同级的**服务端 layout** 兜住 metadata，
 * 商品页主体一行都不用改（零视觉改动，也避免把 15KB 页面改成 server/client 两层）。
 *
 * 口径**与产品详情页对齐**（`app/products/[tab]/[id]/page.tsx`）：
 *   ① 标题/描述/关键词走 `buildSeoMetadata` ⇒ **按语种**取 `seoTitleEn/Ja/Ko/Fr/Ar`，
 *      缺失回退中文；输出 canonical + hreflang（六语种 + x-default）。
 *   ② 商品不存在 / 未上架 ⇒ **真 404**（此前返回 200 + 客户端「未找到商品」= soft-404，
 *      会被搜索引擎当有效页收录、白耗抓取配额 —— 与产品详情页修复前是同一个坑）。
 *   ③ 输出 Product / BreadcrumbList JSON-LD（富媒体结果 + GEO 结构化数据）。
 */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = safeDecode(params?.slug);
  if (!slug) return {};

  let p: any = null;
  try {
    p = await prisma.shopProduct.findUnique({ where: { slug } });
  } catch (e) {
    // 数据库异常不阻断页面渲染（返回空 metadata，沿用站点默认）
    return {};
  }
  // 记录不存在 ⇒ 404；未上架（草稿）同样 404（与公开 API `status: "published"` 同口径）
  // ⚠️ 必须在 try **之外**：notFound() 靠抛特殊异常工作，放在 try 里会被 catch 吞掉。
  if (!p || p.status !== "published") notFound();

  const base = getSiteBaseUrl();
  const path = `/shop/${p.slug || slug}`;
  const canonical = `${base}${path}`;
  // 语种取值 + canonical/hreflang 全由统一入口产出（回退链：seo<语种> → 名称/简介英文优先中文）
  const meta = buildSeoMetadata({
    record: p,
    fallbackTitle: p.nameEn || p.name || slug,
    fallbackDescription: p.summaryEn || p.summary || "",
    path,
  });

  return {
    ...meta,
    openGraph: {
      ...(meta.openGraph || {}),
      url: canonical,
      type: "website",
      images: ogImages(p, base),
    },
  };
}

/** URL 解码：参数本身可能已被 Next.js 解码过，二次解码遇到裸 `%` 会抛错 ⇒ 失败即用原值 */
function safeDecode(v?: string): string {
  const raw = String(v || "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** og:image 用绝对地址（站内 /uploads/... 补站点域名），最多 4 张：封面 + 多图 */
function ogImages(p: any, base: string): { url: string }[] | undefined {
  const list: string[] = [];
  if (p?.coverImage) list.push(String(p.coverImage));
  if (Array.isArray(p?.images)) {
    for (const x of p.images) {
      const u = typeof x === "string" ? x : x?.url;
      if (u) list.push(String(u));
    }
  }
  const uniq = Array.from(new Set(list.filter(Boolean))).slice(0, 4);
  if (uniq.length === 0) return undefined;
  return uniq.map((u) => ({ url: u.startsWith("http") ? u : `${base}${u.startsWith("/") ? "" : "/"}${u}` }));
}

export default async function ShopProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  // Product / BreadcrumbList JSON-LD：商城商品此前完全没有结构化数据（产品详情页已有）
  let jsonLd = "";
  try {
    const slug = safeDecode(params?.slug);
    const p = slug ? await prisma.shopProduct.findUnique({ where: { slug } }) : null;
    if (p && p.status === "published") {
      const base = getSiteBaseUrl();
      const path = `/shop/${p.slug || slug}`;
      const name = p.name || p.nameEn || p.slug || slug;
      const brand = await getBrandInfo().then((b) => b.name || undefined).catch(() => undefined);
      jsonLd = renderJsonLd([
        breadcrumbSchema([
          { name: "首页", path: "/" },
          { name: "在线商城", path: "/shop" },
          { name, path },
        ]),
        productSchema({
          name,
          description: p.summary || p.summaryEn || "",
          image: p.coverImage || null,
          url: `${base}${path}`,
          sku: p.slug || slug,
          brand,
          priceMin: p.price != null ? Number(p.price) : null,
          priceMax: p.price != null ? Number(p.price) : null,
          priceUnit: p.unit || null,
        }),
      ]);
    }
  } catch (e) {
    console.error("shop JSON-LD 生成失败:", (e as Error).message);
  }
  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      )}
      {children}
    </>
  );
}
