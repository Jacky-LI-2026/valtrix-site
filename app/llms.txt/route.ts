import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSEOConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * llms.txt — 面向 LLM/AI 搜索引擎的站点文本索引（AEO）
 * 遵循 https://llmstxt.org/ 格式：Markdown 风格纯文本
 */
export async function GET() {
  const seo = await getSEOConfig();
  const siteName = seo.siteName || "VALTRIX";
  const siteNameEn = seo.siteNameEn || "VALTRIXNOLOGY";
  const desc = seo.defaultDesc || "";
  // 双 fork 合并去硬编码时一并删除；若将来要输出绝对 URL，请用 lib/site-url.ts 的 siteUrl()。

  const lines: string[] = [];
  lines.push(`# ${siteName} ${siteNameEn}`);
  lines.push("");
  lines.push(`> ${desc}`);
  lines.push("");

  // 核心栏目
  lines.push("## 核心栏目");
  lines.push(`- [首页](/) 企业官网首页，公司概况与核心优势`);
  lines.push(`- [产品中心](/products) 闸阀、球阀、蝶阀、止回阀、安全阀、调节阀等产品型号与参数`);
  lines.push(`- [应用领域](/industries) 石油化工、水处理、天然气、电力、冶金矿业、船舶海工等行业解决方案`);
  lines.push(`- [服务与方案](/services) 技术服务、定制开发、售后保障等解决方案`);
  lines.push(`- [新闻动态](/news) 公司新闻与行业资讯`);
  lines.push(`- [关于我们](/about) 公司简介、企业文化、发展历程、荣誉资质`);
  lines.push(`- [资源下载](/resources) 产品手册与资料下载`);
  lines.push(`- [招聘](/careers) 加入我们，在招职位`);
  lines.push(`- [联系我们](/contact) 联系方式、地址与在线留言`);
  lines.push("");

  // 产品索引
  try {
    const products = await prisma.product.findMany({
      where: { status: "published" },
      orderBy: { sortOrder: "asc" },
      take: 50,
    });
    if (products.length) {
      lines.push("## 产品型号");
      for (const p of products) {
        const name = (p as any).name || p.model;
        const desc2 = (p as any).subtitle || (p as any).summary || "";
        const slug = p.slug;
        lines.push(`- [${name}（${p.model}）](/products/growth/${slug}) ${desc2}`);
      }
      lines.push("");
    }
  } catch (e) {}

  // 应用领域索引
  try {
    const industries = await prisma.industry.findMany({
      orderBy: { sortOrder: "asc" },
      take: 30,
    });
    if (industries.length) {
      lines.push("## 应用领域");
      for (const ind of industries) {
        const name = (ind as any).name || ind.slug;
        lines.push(`- [${name}](/industries/${ind.slug}) ${(ind as any).summary || ""}`);
      }
      lines.push("");
    }
  } catch (e) {}

  // 新闻索引
  try {
    const news = await prisma.news.findMany({
      orderBy: { publishedAt: "desc" },
      take: 20,
    });
    if (news.length) {
      lines.push("## 新闻动态");
      for (const n of news) {
        const title = (n as any).title || n.slug;
        const date = n.publishedAt ? new Date(n.publishedAt).toISOString().slice(0, 10) : "";
        lines.push(`- [${title}](/news/${n.slug}) ${date} ${(n as any).summary || ""}`);
      }
      lines.push("");
    }
  } catch (e) {}

  lines.push(`## 语言`);
  lines.push(`- 简体中文（zh） · English（en） · 日本語（ja） · 한국어（ko） · Français（fr） · العربية（ar）`);
  lines.push("");
  lines.push("## 联系方式");
  if (seo.email) lines.push(`- 邮箱：${seo.email}`);
  if (seo.phone) lines.push(`- 电话：${seo.phone}`);
  if (seo.companyAddress) lines.push(`- 地址：${seo.companyAddress}`);
  lines.push("");

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
