/**
 * 图片站点地图（Google 图片收录增强）
 * GET /sitemap-images.xml
 * 收集产品封面、新闻封面、行业、案例等图片，输出 <image:image> 扩展。
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteBaseUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

// 域名取自部署级环境变量（勿硬编码，双 fork 合并 D1=单码多库）
const BASE = getSiteBaseUrl();

function xmlEscape(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function absUrl(u: string): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return `${BASE}${u.startsWith("/") ? u : "/" + u}`;
}

export async function GET(req: NextRequest) {
  try {
    const items: { page: string; images: { loc: string; title?: string }[] }[] = [];

    // 产品
    const products = await prisma.product.findMany({
      where: { status: "published" },
      select: {
        slug: true, coverImage: true,
        category: { select: { slug: true, tab: { select: { slug: true } } } },
      },
    });
    for (const p of products) {
      if (!p.coverImage) continue;
      items.push({
        page: `/products/${p.category?.tab?.slug || "growth"}/${p.slug}`,
        images: [{ loc: absUrl(p.coverImage) }],
      });
    }

    // 新闻
    const news = await prisma.news.findMany({
      where: { status: "published" },
      select: { slug: true, coverImage: true, title: true },
    });
    for (const n of news) {
      if (!n.coverImage) continue;
      items.push({
        page: `/news/${n.slug}`,
        images: [{ loc: absUrl(n.coverImage), title: n.title }],
      });
    }

    // 行业
    const industries = await prisma.industry.findMany({
      where: { status: "published" },
      select: { slug: true, image: true, name: true },
    });
    for (const i of industries) {
      if (!i.image) continue;
      items.push({
        page: `/industries/${i.slug}`,
        images: [{ loc: absUrl(i.image), title: i.name }],
      });
    }

    // 成功案例（通用内容模型）
    const cases = await prisma.case.findMany({
      select: { slug: true, coverImage: true, title: true },
    });
    for (const c of cases) {
      if (!c.coverImage) continue;
      items.push({
        page: `/content/case/${c.slug}`,
        images: [{ loc: absUrl(c.coverImage), title: c.title }],
      });
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${items.map((it) => `  <url>
    <loc>${BASE}${it.page}</loc>
${it.images.map((img) => `    <image:image>
      <image:loc>${xmlEscape(img.loc)}</image:loc>${img.title ? `\n      <image:title>${xmlEscape(img.title)}</image:title>` : ""}
    </image:image>`).join("\n")}
  </url>`).join("\n")}
</urlset>`;

    return new Response(body, {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e: any) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"/>\n`, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
}
