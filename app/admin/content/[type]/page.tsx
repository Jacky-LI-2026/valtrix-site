import { getContentType } from "@/lib/content-types/registry";
import { getDynamicType } from "@/lib/content-types/dynamic";
import { contentService } from "@/lib/content-types/service";
import ContentTypeList from "@/components/admin/ContentTypeList";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// 旧模块兼容：已存在独立后台管理页的内容类型，新路由下直接跳转旧管理入口
const LEGACY_REDIRECTS: Record<string, string> = {
  about: "/admin/about",
  careers: "/admin/careers",
  resources: "/admin/resources",
  menus: "/admin/menus",
};

/**
 * 通用内容管理页 · 列表
 * /admin/content/[type]
 * 支持：静态注册类型（registry）+ 后台动态创建类型（ContentTypeDef）
 */
export default async function ContentTypeAdminPage({ params }: { params: { type: string } }) {
  const legacy = LEGACY_REDIRECTS[params.type];
  if (legacy) redirect(legacy);
  const cfg = getContentType(params.type) || (await getDynamicType(params.type).catch(() => null));
  if (!cfg) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-600">未知内容类型：{params.type}</h1>
        <p className="text-gray-500 mt-2">请在 lib/content-types/registry.ts 中注册，或到「内容类型管理」创建该类型。</p>
      </div>
    );
  }

  let items: any[] = [];
  try {
    items = await contentService.list(params.type, { all: true });
  } catch (e: any) {
    items = [];
  }

  return (
    <div className="py-5">
      <ContentTypeList
        typeName={cfg.name}
        label={cfg.label}
        columns={cfg.listColumns}
        titleField={cfg.titleField}
        initialItems={items}
      />
    </div>
  );
}
