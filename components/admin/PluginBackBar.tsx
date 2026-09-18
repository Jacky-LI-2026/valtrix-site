"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Puzzle } from "lucide-react";
import { BUILTIN_PLUGINS } from "@/lib/plugins/registry";

/** 插件管理入口路由表：href -> 插件名（从插件注册表动态生成） */
const ENTRY_MAP: { href: string; name: string }[] = [];
BUILTIN_PLUGINS.forEach((p) => {
  if (p.adminUrl) ENTRY_MAP.push({ href: p.adminUrl, name: p.name });
  (p.adminUrls || []).forEach((a) => ENTRY_MAP.push({ href: a.href, name: p.name }));
  (p.sections || []).forEach((s) => ENTRY_MAP.push({ href: s.href, name: "通用内容模型" }));
});
// 精确匹配优先，其次前缀匹配（子孙页如 /admin/products/new）
ENTRY_MAP.sort((a, b) => b.href.length - a.href.length);

export default function PluginBackBar() {
  const pathname = usePathname();
  if (!pathname || pathname === "/admin/plugins") return null;

  let hit: { href: string; name: string } | null = null;
  for (const e of ENTRY_MAP) {
    if (pathname === e.href || pathname.startsWith(e.href + "/")) {
      hit = e;
      break;
    }
  }
  if (!hit) return null;

  return (
    <div className="mb-4 flex items-center gap-2">
      <Link
        href="/admin/plugins"
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      >
        <ArrowLeft size={13} /> 返回能力市场
      </Link>
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <Puzzle size={12} /> {hit.name}插件
      </span>
    </div>
  );
}
