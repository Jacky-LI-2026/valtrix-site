import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ServiceDetailClient from "./ServiceDetailClient";
import { serviceSchema, breadcrumbSchema, renderJsonLd } from "@/lib/seo/schema";
import { getSiteBaseUrl } from "@/lib/site-url";

// 域名取自部署级环境变量（勿硬编码，双 fork 合并 D1=单码多库）
const BASE_URL = getSiteBaseUrl();

interface Props {
  params: Record<string, string>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let record: any = null;
  try {
    const slug = decodeURIComponent(props.params.slug);
    record = await (prisma as any)["service"].findUnique({ where: { slug: slug } });
  } catch (e) {
    console.error("app/services/[slug]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
  // 🔴 记录不存在 ⇒ notFound()（HTTP 404）。此前是 `return { title: slug }` ⇒ HTTP 200 = soft-404。
  //    ⚠️ 必须在 try 之外：notFound() 靠抛特殊异常工作，放在 try 里会被上面的 catch 吞掉。
  if (!record) notFound();
  return buildSeoMetadata({
    record,
    fallbackTitle: record["titleEn"] || record["title"] || "",
    fallbackDescription: record["subtitleEn"] || record["subtitle"] || "",
  });
}

export default async function Page(props: Props) {
  // 记录不存在（含未发布）⇒ 404；查询异常保持原有容错（不当作 404）
  let exists: any = null;
  try {
    const slug = decodeURIComponent(props.params.slug);
    exists = await (prisma as any)["service"].findUnique({
      where: { slug: slug },
      select: { id: true, status: true },
    });
  } catch (e) {
    exists = { id: -1, status: "published" };
  }
  if (!exists || exists.status !== "published") notFound();

  let jsonLd = "";
  try {
    const slug = decodeURIComponent(props.params.slug);
    const record = await (prisma as any)["service"].findUnique({ where: { slug: slug } });
    if (record) {
      const path = `/services/${slug}`;
      const name = record["title"] || slug;
      jsonLd = renderJsonLd([
        breadcrumbSchema([
          { name: "首页", path: "/" },
          { name: "服务与方案", path: "/services" },
          { name, path },
        ]),
        serviceSchema({
          name,
          description: record["subtitle"] || record["description"] || "",
          url: `${BASE_URL}${path}`,
          provider: "VALTRIX",
        }),
      ]);
    }
  } catch (e) {
    console.error("service JSON-LD 生成失败:", (e as Error).message);
  }
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <ServiceDetailClient />
    </>
  );
}
