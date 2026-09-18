import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getDynamicType, dynamicService, pickLang } from "@/lib/content-types/dynamic";
import { getContentType } from "@/lib/content-types/registry";
import { contentService } from "@/lib/content-types/service";
import { currentSiteId } from "@/lib/tenant/scope";
import { buildSiteWhere } from "@/lib/tenant/scope";
import ContentDetailView from "@/components/content/ContentDetailView";

export const dynamic = "force-dynamic";

interface Props {
  params: { type: string; slug: string };
}

/** 前台通用内容详情页：/content/[type]/[slug] */
export default async function ContentDetailPage({ params }: Props) {
  const isDyn = await getDynamicType(params.type).catch(() => null);
  const cfg = getContentType(params.type) || isDyn;
  if (!cfg?.slugField) return notFound();

  const siteWhere = buildSiteWhere(await currentSiteId(headers()));
  let item: any = null;
  try {
    item = isDyn
      ? await dynamicService.getBySlug(params.type, params.slug, siteWhere)
      : await contentService.getBySlug(params.type, params.slug, siteWhere);
  } catch {
    item = null;
  }
  if (!item) return notFound();

  return (
    <div>
      <ContentDetailView cfg={cfg} item={item} />
    </div>
  );
}
