import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import ServiceDetailClient from "./ServiceDetailClient";
import { serviceSchema, breadcrumbSchema, renderJsonLd } from "@/lib/seo/schema";
import { getSiteBaseUrl } from "@/lib/site-url";

// 域名取自部署级环境变量（勿硬编码，双 fork 合并 D1=单码多库）
const BASE_URL = getSiteBaseUrl();

interface Props {
  params: Record<string, string>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const slug = decodeURIComponent(props.params.slug);
    const record = await (prisma as any)["service"].findUnique({ where: { slug: slug } });
    if (!record) {
      return { title: decodeURIComponent(props.params.slug) };
    }
    return buildSeoMetadata({
      record,
      fallbackTitle: record["titleEn"] || record["title"] || "",
      fallbackDescription: record["subtitleEn"] || record["subtitle"] || "",
    });
  } catch (e) {
    console.error("app/services/[slug]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
}

export default async function Page(props: Props) {
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
