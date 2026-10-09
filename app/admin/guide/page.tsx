import { readFileSync } from "fs";
import { join } from "path";
import GuideToc from "./GuideToc";
import CodeCopy from "./CodeCopy";
import GuideSearch from "./GuideSearch";
import { renderMarkdown, type TocItem } from "@/lib/guide-render";

/**
 * 说明书正文是**运行时**读 `docs/user-guide.md`（`readFileSync`）。
 * 不加这行会被**构建期**预渲染成静态 HTML ⇒ 之后只改 md 不重建，页面仍是旧内容。
 */
export const dynamic = "force-dynamic";

export default function GuidePage() {
  let content = "";
  try {
    const filePath = join(process.cwd(), "docs", "user-guide.md");
    content = readFileSync(filePath, "utf-8");
  } catch (e) {
    content = "# 使用文档\n\n未找到使用文档文件。";
  }

  const toc: TocItem[] = [];
  const htmlContent = renderMarkdown(content, toc);

  return (
    <div className="space-y-4">
      <CodeCopy />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">使用说明书</h1>
          <p className="text-gray-500 mt-1">后台管理系统使用指南 · {toc.length} 个章节</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/guide/download?format=md"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            title="下载 Markdown 源文件，便于二次编辑"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
            </svg>
            下载 Markdown
          </a>
          <a
            href="/api/admin/guide/download?format=html"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            title="下载排好版的 HTML 文档，可用浏览器另存为 PDF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
            </svg>
            下载 HTML
          </a>
        </div>
      </div>

      <GuideSearch />

      <div className="flex gap-6 items-start">
        <GuideToc items={toc} />

        <div id="guide-content" className="flex-1 min-w-0 bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-10">
          <div
            className="text-sm leading-relaxed text-gray-700 [&_h2]:first-child:mt-0"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
}
