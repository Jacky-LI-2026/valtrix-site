import { getContentType } from "@/lib/content-types/registry";
import { getDynamicType } from "@/lib/content-types/dynamic";
import ContentTypeForm from "@/components/admin/ContentTypeForm";

export const dynamic = "force-dynamic";

/**
 * 通用内容管理页 · 编辑
 * /admin/content/[type]/[id]/edit
 */
export default async function ContentTypeEditPage({ params }: { params: { type: string; id: string } }) {
  const cfg = getContentType(params.type) || (await getDynamicType(params.type).catch(() => null));
  if (!cfg) return <div className="p-8 text-red-600">未知内容类型：{params.type}</div>;
  return (
    <div className="p-6">
      <ContentTypeForm typeName={cfg.name} initialId={params.id} cfg={cfg} />
    </div>
  );
}
