import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteBaseUrl } from "@/lib/site-url";
import { buildLanguageAlternates } from "@/lib/seo-metadata";

/**
 * sitemap 条目：路径 + **真实更新时间**（可缺省）
 *
 * 2026-09-18 修正：此前每条都是 `lastModified: new Date()` ——
 * 等于每次抓取都告诉搜索引擎「整站刚刚更新」。这个信号恒真 ⇒ 等于噪声，
 * 会稀释真正的更新信号（搜索引擎对「总是刚更新」的站点会降低更新权重的信任）。
 * 现改为：内容型页面用数据库里真实的 `updatedAt`；静态页**不输出**该字段
 * （宁可没有，也不写一个恒为「现在」的假值）。
 */
type SitemapEntry = {
  path: string;
  lastModified?: Date;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();

  // 静态页面
  // ⚠️ 服务详情页**不写死**（owner 2026-10-01：「处理全站类似的 404 问题」）——
  //    写死会让"本站不存在的服务"也进 sitemap（本机实测 `/services/odm`、
  //    `/services/after-sales` 就是这种死链）。改为下面**按库里真实存在的服务**生成。
  const staticPages = [
    "",
    "/products",
    "/services",
    "/industries",
    "/resources",
    "/news",
    "/cases",
    "/faqs",
    "/about",
    "/about/profile",
    "/about/culture",
    "/about/history",
    "/about/honors",
    "/careers",
    "/contact",
  ];

  try {
    // 从数据库获取产品（带真实 updatedAt）
    const products = await prisma.product.findMany({
      where: { status: "published" },
      select: {
        slug: true,
        updatedAt: true,
        category: { select: { slug: true, tab: { select: { slug: true } } } },
      },
    });

    // 从数据库获取新闻
    const news = await prisma.news.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    });

    // 从数据库获取行业
    const industries = await prisma.industry.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    });

    // 从数据库获取资源分类
    const resourceCategories = await prisma.resourceCategory.findMany({
      select: { type: true },
    });

    // 从数据库获取成功案例
    const cases = await prisma.case.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    });

    // 从数据库获取招聘职位
    const jobs = await prisma.job.findMany({
      where: { status: "open" },
      select: { slug: true, updatedAt: true },
    });

    // 从数据库获取服务（**替代原先写死的 /services/xxx**，杜绝"库里没有却在 sitemap 里"）
    const services = await prisma.service.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    });

    const entries: SitemapEntry[] = [
      // 静态页：不输出 lastModified（见顶部 SitemapEntry 注释）
      ...staticPages.map((path) => ({
        path,
        priority: path === "" ? 1 : 0.8,
        changeFrequency: "weekly" as const,
      })),
      ...products.map((p) => ({
        path: `/products/${p.category?.tab?.slug || "growth"}/${p.slug}`,
        lastModified: p.updatedAt,
        priority: 0.9,
        changeFrequency: "weekly" as const,
      })),
      ...news.map((n) => ({
        path: `/news/${n.slug}`,
        lastModified: n.updatedAt,
        priority: 0.7,
        changeFrequency: "weekly" as const,
      })),
      ...industries.map((i) => ({
        path: `/industries/${i.slug}`,
        lastModified: i.updatedAt,
        priority: 0.8,
        changeFrequency: "monthly" as const,
      })),
      ...cases.map((c) => ({
        path: `/cases/${c.slug}`,
        lastModified: c.updatedAt,
        priority: 0.7,
        changeFrequency: "monthly" as const,
      })),
      ...resourceCategories.map((r) => ({
        path: `/resources/${r.type}`,
        priority: 0.6,
        changeFrequency: "monthly" as const,
      })),
      ...jobs.map((j) => ({
        path: `/careers/${j.slug}`,
        lastModified: j.updatedAt,
        priority: 0.5,
        changeFrequency: "weekly" as const,
      })),
      ...services.map((s) => ({
        path: `/services/${s.slug}`,
        lastModified: s.updatedAt,
        priority: 0.7,
        changeFrequency: "monthly" as const,
      })),
    ];

    // 去重：同一路径可能来自多个查询
    const seen = new Set<string>();
    const deduped = entries.filter((e) => {
      if (seen.has(e.path)) return false;
      seen.add(e.path);
      return true;
    });

    return deduped.map((e) => ({
      url: `${baseUrl}${e.path}`,
      // 仅在拿到真实更新时间时才输出该字段
      ...(e.lastModified ? { lastModified: e.lastModified } : {}),
      changeFrequency: e.changeFrequency,
      priority: e.priority,
      // hreflang 口径与页面内 metadata 共用同一实现（lib/seo-metadata.ts），不再另写一份
      alternates: { languages: buildLanguageAlternates(e.path) },
    }));
  } catch (error) {
    // 数据库查询失败时返回静态页面（同样不写假的 lastModified）
    console.error("Sitemap generation error:", error);
    return staticPages.map((path) => ({
      url: `${baseUrl}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: { languages: buildLanguageAlternates(path) },
    }));
  }
}
