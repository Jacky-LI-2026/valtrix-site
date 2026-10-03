import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JobDetailClient from "./JobDetailClient";

interface Props {
  params: Record<string, string>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let record: any = null;
  try {
    const slug = decodeURIComponent(props.params.slug);
    record = await (prisma as any)["job"].findUnique({ where: { slug: slug } });
  } catch (e) {
    console.error("app/careers/[slug]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
  // 记录不存在 ⇒ 真 404（此前是 return {title: slug} = soft-404）。
  // ⚠️ notFound() 必须在 try 之外 —— 它靠抛异常工作，放在 try 里会被上面的 catch 吞掉。
  if (!record) notFound();
  return buildSeoMetadata({
    record,
    fallbackTitle: record["titleEn"] || record["title"] || "",
    fallbackDescription: record["summaryEn"] || record["summary"] || "",
  });
}

export default async function Page(props: Props) {
  // 记录不存在 ⇒ 404（与上方 generateMetadata 同口径：只按"库里有没有"判断，
  // 不按 status 判断 —— 已关闭的职位仍可访问，保持既有行为）
  let exists: any = null;
  try {
    const slug = decodeURIComponent(props.params.slug);
    exists = await (prisma as any)["job"].findUnique({
      where: { slug: slug },
      select: { id: true },
    });
  } catch (e) {
    exists = { id: -1 };
  }
  if (!exists) notFound();

  return <JobDetailClient params={props.params as any} />;
}
