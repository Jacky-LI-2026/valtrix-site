import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getDynamicType, dynamicService } from "@/lib/content-types/dynamic";
import { getContentType } from "@/lib/content-types/registry";
import { contentService } from "@/lib/content-types/service";
import { currentSiteId, buildSiteWhere } from "@/lib/tenant/scope";
import ContentListView from "@/components/content/ContentListView";

export const dynamic = "force-dynamic";

interface Props {
  params: { type: string };
}

/** 前台通用内容列表页：/content/[type]（主要服务后台动态创建的类型） */
export default async function ContentListPage({ params }: Props) {
  const isDyn = await getDynamicType(params.type).catch(() => null);
  const cfg = getContentType(params.type) || isDyn;
  if (!cfg) return notFound();

  const siteWhere = buildSiteWhere(await currentSiteId(headers()));
  let items: any[] = [];
  try {
    items = isDyn
      ? await dynamicService.list(params.type, { siteWhere })
      : await contentService.list(params.type);
  } catch {
    items = [];
  }

  return (
    <div>
      <ContentListView cfg={cfg} items={items} />
    </div>
  );
}
