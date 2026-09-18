import { getContentType } from "@/lib/content-types/registry";
import { getDynamicType } from "@/lib/content-types/dynamic";
import ContentTypeForm from "@/components/admin/ContentTypeForm";

export const dynamic = "force-dynamic";

/**
 * 通用内容管理页 · 新建
 * /admin/content/[type]/new
 * 支持：静态注册类型（registry）+ 后台动态创建类型（ContentTypeDef）
 */
export default async function ContentTypeNewPage({ params }: { params: { type: string } }) {
  const cfg = getContentType(params.type) || (await getDynamicType(params.type).catch(() => null));
  if (!cfg) return <div className="p-8 text-red-600">未知内容类型：{params.type}</div>;
  return (
    <div className="p-6">
      <ContentTypeForm typeName={cfg.name} cfg={cfg} />
    </div>
  );
}
