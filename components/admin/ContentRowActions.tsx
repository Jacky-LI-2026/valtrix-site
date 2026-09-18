"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Eye } from "lucide-react";

/**
 * 内容行操作（预览/编辑/删除）· 统一入口
 * 替代各内容模块各自实现的 XxxActions 组件（News/Product/About/Career/Industry/Resource 等）
 *
 * 用法：
 * <ContentRowActions
 *   apiBase="/api/admin/news"          // DELETE 请求的 API 前缀
 *   id={item.id}
 *   editHref={`/admin/news/${item.id}/edit`}
 *   previewHref={item.slug ? `/news/${item.slug}?preview=1` : undefined}
 *   confirmMsg="确定删除该新闻？删除后不可恢复。"
 * />
 */
interface ContentRowActionsProps {
  apiBase: string;
  id: string;
  editHref: string;
  previewHref?: string;
  confirmMsg?: string;
  /** 删除成功后回调（客户端列表页用于重新 load 数据） */
  onDeleted?: () => void;
}

export default function ContentRowActions({
  apiBase,
  id,
  editHref,
  previewHref,
  confirmMsg,
  onDeleted,
}: ContentRowActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(confirmMsg || "确定删除？删除后不可恢复。")) return;
    try {
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted?.();
        router.refresh();
      } else {
        alert("删除失败");
      }
    } catch (e) {
      alert("删除失败");
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {previewHref && (
        <Link
          href={previewHref}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="预览"
        >
          <Eye size={16} />
        </Link>
      )}
      <button
        onClick={() => router.push(editHref)}
        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="编辑"
      >
        <Edit size={16} />
      </button>
      <button
        onClick={handleDelete}
        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
        title="删除"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
