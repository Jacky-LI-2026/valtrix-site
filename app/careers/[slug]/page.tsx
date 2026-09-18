import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import JobDetailClient from "./JobDetailClient";

interface Props {
  params: Record<string, string>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const slug = decodeURIComponent(props.params.slug);
    const record = await (prisma as any)["job"].findUnique({ where: { slug: slug } });
    if (!record) {
      return { title: decodeURIComponent(props.params.slug) };
    }
    return buildSeoMetadata({
      record,
      fallbackTitle: record["titleEn"] || record["title"] || "",
      fallbackDescription: record["summaryEn"] || record["summary"] || "",
    });
  } catch (e) {
    console.error("app/careers/[slug]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
}

export default function Page(props: Props) {
  return <JobDetailClient params={props.params as any} />;
}
