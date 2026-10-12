import Link from "next/link";
import { ArrowRight, Settings2, ListChecks, Link2, FileText } from "lucide-react";
import IndexHealthPanel from "@/components/admin/IndexHealthPanel";

export const dynamic = "force-dynamic";

/**
 * 「SEO 与收录」中心（owner 2026-10-12：方案 B —— 把散落的 SEO 入口收拢到单一中心）
 * ==========================================================================
 * 收拢前：SEO 相关入口散在四处 —— 站点设置 →「SEO 优化」、站点设置 →「SEO 批量补全」、
 * 插件动态注入的「外链台账 / 软文营销」，以及每个内容编辑页里的 SEO 区块；
 * 且菜单权限（config:site）与页面/接口权限（seo:view）**不是同一个源**。
 * 收拢后：统一从本页进，权限统一 `seo:view`；旧路径全部保留为**永久重定向**，书签不会失效。
 */

const ENTRIES = [
  {
    href: "/admin/seo/settings",
    title: "SEO / GEO 设置",
    desc: "站点级默认标题·描述·关键词（6 语种，可一键翻译）· 页面级 SEO · 地理位置",
    icon: Settings2,
  },
  {
    href: "/admin/seo/audit",
    title: "内容 SEO 补全",
    desc: "按内容类型列出缺 SEO 元数据的条目，可批量 AI 生成标题/描述/关键词",
    icon: ListChecks,
  },
  {
    href: "/admin/seo/backlinks",
    title: "外链台账",
    desc: "第三方平台外链记录与回链追踪（外链建设是收录的助推器）",
    icon: Link2,
  },
  {
    href: "/admin/seo/backlinks/posts",
    title: "软文营销",
    desc: "AI 生成第三方平台软文，发布后回填链接形成外链",
    icon: FileText,
  },
];

export default function SeoHubPage() {
  return (
    <div className="space-y-5 py-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">SEO 与收录</h1>
        <p className="mt-1 text-xs text-gray-400">
          站点 SEO、内容 SEO、收录推送与外链 —— 统一从这里进（旧路径已保留重定向，书签不会失效）
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ENTRIES.map((e) => {
          const Icon = e.icon;
          return (
            <Link
              key={e.href}
              href={e.href}
              className="group rounded border border-gray-200 bg-white p-4 transition-all hover:border-[#CC0000]/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-gray-300 transition-colors group-hover:text-[#CC0000]">
                  <Icon size={18} />
                </span>
                <span className="text-[13px] font-medium">{e.title}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">{e.desc}</p>
              <div className="mt-2 flex items-center gap-0.5 text-[10px] text-gray-300 transition-colors group-hover:text-[#CC0000]">
                进入 <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* 收录体检（robots / sitemap / 覆盖率 / 抽样可达性 / 推送历史）—— 中心页直接放这里 */}
      <IndexHealthPanel />
    </div>
  );
}
