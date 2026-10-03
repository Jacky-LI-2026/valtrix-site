import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AboutSectionClient from "./AboutSectionClient";
import UnilokAboutSectionPage from "@/components/theme-unilok/AboutSectionPage";
import KitzAboutSectionPage from "@/components/theme-kitzsct/AboutSectionPage";
import { getActiveTemplateSlug, UNILOK_INDUSTRIAL_SLUG, KITZ_CLEAN_SLUG } from "@/lib/templates/get-active-template";
import { getAboutSection } from "@/lib/about";

// 模板判定依赖请求头（Host / ?__template=），静态预渲染会拿不到 → 必须逐请求渲染
export const dynamic = "force-dynamic";

interface Props {
  params: Record<string, string>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let record: any = null;
  try {
    const slug = decodeURIComponent(props.params.section);
    record = await (prisma as any)["aboutSection"].findUnique({ where: { slug: slug } });
  } catch (e) {
    console.error("app/about/[section]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
  // 记录不存在 ⇒ 真 404（此前是 return {title: slug} = soft-404）。
  // ⚠️ notFound() 必须在 try 之外 —— 它靠抛异常工作，放在 try 里会被上面的 catch 吞掉。
  // 但：**站点自带的静态栏目（lib/about.ts）里有这个 slug 时不算 404** —— 客户端组件本来就会
  // 回退到那份静态数据渲染（owner 2026-10-01：「处理全站类似的 404 问题」：
  //   阀门站菜单/sitemap 里的 `/about/culture` 就是"库里没这行、静态数据里有"⇒ 之前直接 404）。
  if (!record) {
    const fallback = getAboutSection(decodeURIComponent(props.params.section));
    if (!fallback) notFound();
    return { title: fallback.title } as Metadata;
  }
  return buildSeoMetadata({
    record,
    fallbackTitle: record["titleEn"] || record["title"] || "",
    fallbackDescription: record["descriptionEn"] || record["description"] || "",
  });
}

export default async function Page(props: Props) {
  // 模板派发：UNILOK → Unilok 版；其余（含默认）→ 现有客户端组件
  const templateSlug = await getActiveTemplateSlug();

  // 记录不存在（含未发布）⇒ 404；查询异常保持原有容错（不当作 404）
  let exists: any = null;
  try {
    const slug = decodeURIComponent(props.params.section);
    exists = await (prisma as any)["aboutSection"].findUnique({
      where: { slug: slug },
      select: { id: true, status: true },
    });
  } catch (e) {
    exists = { id: -1, status: "published" };
  }
  if (!exists || exists.status !== "published") {
    // 同上：库内无记录（或未发布）时，静态栏目里有的照常渲染，两者都没有才 404
    if (!getAboutSection(decodeURIComponent(props.params.section))) notFound();
  }

  return templateSlug === KITZ_CLEAN_SLUG ? (
    <KitzAboutSectionPage params={props.params as any} />
  ) : templateSlug === UNILOK_INDUSTRIAL_SLUG ? (
    <UnilokAboutSectionPage params={props.params as any} />
  ) : (
    <AboutSectionClient params={props.params as any} />
  );
}
