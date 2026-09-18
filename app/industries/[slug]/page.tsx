import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import IndustryDetailClient from "./IndustryDetailClient";

interface Props {
  params: Record<string, string>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const slug = decodeURIComponent(props.params.slug);
    const record = await (prisma as any)["industry"].findUnique({ where: { slug: slug } });
    if (!record) {
      return { title: decodeURIComponent(props.params.slug) };
    }
    return buildSeoMetadata({
      record,
      fallbackTitle: record["nameEn"] || record["name"] || "",
      fallbackDescription: record["taglineEn"] || record["tagline"] || "",
    });
  } catch (e) {
    console.error("app/industries/[slug]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
}

export default function Page(props: Props) {
  return <IndustryDetailClient params={props.params as any} />;
}
