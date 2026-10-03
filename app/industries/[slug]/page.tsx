import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IndustryDetailClient from "./IndustryDetailClient";

interface Props {
  params: Record<string, string>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let record: any = null;
  try {
    const slug = decodeURIComponent(props.params.slug);
    record = await (prisma as any)["industry"].findUnique({ where: { slug: slug } });
  } catch (e) {
    console.error("app/industries/[slug]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
  // 记录不存在 ⇒ 真 404（此前是 return {title: slug} = soft-404）。
  // ⚠️ notFound() 必须在 try 之外 —— 它靠抛异常工作，放在 try 里会被上面的 catch 吞掉。
  if (!record) notFound();
  return buildSeoMetadata({
    record,
    fallbackTitle: record["nameEn"] || record["name"] || "",
    fallbackDescription: record["taglineEn"] || record["tagline"] || "",
  });
}

export default async function Page(props: Props) {
  // 记录不存在（含未发布）⇒ 404；查询异常保持原有容错（不当作 404）
  let exists: any = null;
  try {
    const slug = decodeURIComponent(props.params.slug);
    exists = await (prisma as any)["industry"].findUnique({
      where: { slug: slug },
      select: { id: true, status: true },
    });
  } catch (e) {
    exists = { id: -1, status: "published" };
  }
  if (!exists || exists.status !== "published") notFound();

  return <IndustryDetailClient params={props.params as any} />;
}
