// 使用说明书 Markdown 渲染公共模块
// 页面（app/admin/guide/page.tsx）与下载 API（app/api/admin/guide/download）共用

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

// 从标题文本生成稳定的锚点 id（保留中文，空格/特殊符号转 -）
export function slugify(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "");
}

// 生成全局唯一 id（处理重复标题）
function uniqueId(title: string, used: Set<string>): string {
  const base = slugify(title);
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n++;
  }
  used.add(id);
  return id;
}

// 简单的Markdown到HTML转换（支持标题锚点；Tailwind 类，用于后台页面内联渲染）
export function renderMarkdown(md: string, toc: TocItem[]): string {
  let html = md;

  // 代码块（优先处理，避免内部内容被误解析；提取语言标记为徽章）
  html = html.replace(/```(\w*)[ \t]*\n?([\s\S]*?)```/g, (match, lang, code) => {
    const badge = lang
      ? `<span class="inline-flex items-center px-2 py-0.5 bg-red-600 text-white text-[11px] font-mono font-semibold rounded">${lang}</span>`
      : "";
    return `<div class="code-block relative bg-slate-50 border border-slate-200 rounded-lg my-4 overflow-hidden shadow-sm">
      ${badge ? `<div class="px-4 pt-3 flex items-center gap-2">${badge}</div>` : ""}
      <pre class="px-4 ${badge ? "py-3" : "py-4"} overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-800"><code>${code.replace(/^\n/, "").replace(/\n\s*$/, "")}</code></pre>
    </div>`;
  });

  // 行内代码
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-red-50 px-1.5 py-0.5 rounded text-[13px] text-red-700 font-mono border border-red-100">$1</code>'
  );

  // 标题（收集目录 + 加锚点）
  const usedIds = new Set<string>();
  // 先处理 h2（章节）
  html = html.replace(/^## (.*)$/gm, (match, title) => {
    const id = uniqueId(title, usedIds);
    toc.push({ id, title: title.trim(), level: 2 });
    return `<h2 id="${id}" class="text-lg font-bold mt-8 mb-3 pb-2 border-b-2 border-gray-200 flex items-center gap-2 scroll-mt-20">
      <span class="w-1 h-4 bg-red-600 rounded-full inline-block"></span>${title.trim()}</h2>`;
  });
  // h3（小节）
  html = html.replace(/^### (.*)$/gm, (match, title) => {
    const id = uniqueId(title, usedIds);
    toc.push({ id, title: title.trim(), level: 3 });
    return `<h3 id="${id}" class="text-[15px] font-semibold mt-5 mb-2 text-gray-900 scroll-mt-20">${title.trim()}</h3>`;
  });
  // h4
  html = html.replace(/^#### (.*)$/gm, (match, title) => {
    const id = uniqueId(title, usedIds);
    return `<h4 id="${id}" class="text-sm font-semibold mt-4 mb-2 text-gray-800 scroll-mt-20">${title.trim()}</h4>`;
  });
  // h5/h6
  html = html.replace(/^##### (.*)$/gm, (match, title) => `<h5 class="text-[13px] font-semibold mt-3 mb-1.5 text-gray-700">${title.trim()}</h5>`);
  html = html.replace(/^###### (.*)$/gm, (match, title) => `<h6 class="text-[13px] font-semibold mt-3 mb-1 text-gray-600">${title.trim()}</h6>`);
  // h1
  html = html.replace(/^# (.*)$/gm, (match, title) => `<h1 class="text-xl font-bold mt-2 mb-5 text-gray-900">${title.trim()}</h1>`);

  // 粗体和斜体
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-gray-900"><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 分隔线
  html = html.replace(/^---$/gm, '<hr class="my-8 border-gray-200" />');

  // 无序列表
  html = html.replace(/^- (.*$)/gm, '<li class="ml-5 list-disc marker:text-gray-400">$1</li>');
  html = html.replace(/^\* (.*$)/gm, '<li class="ml-5 list-disc marker:text-gray-400">$1</li>');

  // 有序列表
  html = html.replace(/^\d+\. (.*$)/gm, '<li class="ml-5 list-decimal marker:text-gray-400">$1</li>');

  // 列表包裹
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>)(\n<li[^>]*>[\s\S]*?<\/li>)+/g, (match) => {
    if (match.includes("list-decimal")) {
      return `<ol class="my-2.5 space-y-1 text-sm text-gray-700 leading-relaxed">${match}</ol>`;
    }
    return `<ul class="my-2.5 space-y-1 text-sm text-gray-700 leading-relaxed">${match}</ul>`;
  });

  // 表格（增强样式）
  html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split("|").map((c: string) => c.trim());
    if (cells.every((c: string) => /^[-:]+$/.test(c))) {
      return "<!-- table-separator -->";
    }
    return `<tr>${cells.map((c: string) => `<td class="border border-gray-200 px-3 py-2.5 align-top">${c}</td>`).join("")}</tr>`;
  });
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)(\n<!-- table-separator -->)?(\n<tr>[\s\S]*?<\/tr>)*/g, (match) => {
    const rows = match.replace(/<!-- table-separator -->/g, "").split("\n").filter((r: string) => r.trim());
    if (rows.length > 0) {
      const headerRow = rows[0].replace(/<td/g, '<th class="border border-gray-200 px-3 py-2.5 bg-gray-50 font-semibold text-left whitespace-nowrap"');
      const bodyRows = rows.slice(1).join("");
      return `<div class="overflow-x-auto my-4 rounded-lg border border-gray-200"><table class="w-full border-collapse text-sm">${headerRow}${bodyRows}</table></div>`;
    }
    return match;
  });

  // 链接：内部锚点（#开头）站内跳转，外部链接新窗口
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
    if (href.startsWith("#")) {
      const id = slugify(decodeURIComponent(href.slice(1)));
      return `<a href="#${id}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">${text}</a>`;
    }
    return `<a href="${href}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // 段落
  const lines = html.split("\n");
  let result = "";
  let inParagraph = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (inParagraph) {
        result += "</p>";
        inParagraph = false;
      }
      result += "\n";
      continue;
    }
    if (
      line.startsWith("<h") || line.startsWith("<ul") || line.startsWith("<ol") ||
      line.startsWith("<li") || line.startsWith("<pre") || line.startsWith("<hr") ||
      line.startsWith("<div") || line.startsWith("<table") || line.startsWith("<tr") ||
      line.startsWith("</")
    ) {
      if (inParagraph) {
        result += "</p>";
        inParagraph = false;
      }
      result += line + "\n";
    } else {
      if (!inParagraph) {
        result += '<p class="my-2.5 text-sm text-gray-700 leading-relaxed">';
        inParagraph = true;
      }
      result += line + " ";
    }
  }
  if (inParagraph) {
    result += "</p>";
  }

  return result;
}

// 渲染为独立完整 HTML 文档（离线打开排版正常 + 打印友好，可另存 PDF）
export function renderDownloadHtml(md: string): string {
  let html = md;

  // 代码块
  html = html.replace(/```(\w*)[ \t]*\n?([\s\S]*?)```/g, (match, lang, code) => {
    const badge = lang ? `<span class="code-lang">${lang}</span>` : "";
    return `<pre class="code-block">${badge}<code>${code.replace(/^\n/, "").replace(/\n\s*$/, "")}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 标题
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // 粗体和斜体
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 分隔线
  html = html.replace(/^---$/gm, "<hr />");

  // 列表
  html = html.replace(/^- (.*$)/gm, "<li>$1</li>");
  html = html.replace(/^\* (.*$)/gm, "<li>$1</li>");
  html = html.replace(/^\d+\. (.*$)/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)+/g, (match) => {
    if (/^\d+\./.test(match.trim().split("\n")[0]) || match.includes("<ol>")) {
      return `<ol>${match}</ol>`;
    }
    return `<ul>${match}</ul>`;
  });

  // 表格
  html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split("|").map((c: string) => c.trim());
    if (cells.every((c: string) => /^[-:]+$/.test(c))) {
      return "<!-- table-separator -->";
    }
    return `<tr>${cells.map((c: string) => `<td>${c}</td>`).join("")}</tr>`;
  });
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)(\n<!-- table-separator -->)?(\n<tr>[\s\S]*?<\/tr>)*/g, (match) => {
    const rows = match.replace(/<!-- table-separator -->/g, "").split("\n").filter((r: string) => r.trim());
    if (rows.length > 0) {
      const headerRow = rows[0].replace(/<td/g, "<th");
      const bodyRows = rows.slice(1).join("");
      return `<table>${headerRow}${bodyRows}</table>`;
    }
    return match;
  });

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 段落
  const lines = html.split("\n");
  let result = "";
  let inParagraph = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (inParagraph) {
        result += "</p>";
        inParagraph = false;
      }
      result += "\n";
      continue;
    }
    if (
      line.startsWith("<h") || line.startsWith("<ul") || line.startsWith("<ol") ||
      line.startsWith("<li") || line.startsWith("<pre") || line.startsWith("<hr") ||
      line.startsWith("<table") || line.startsWith("<tr") || line.startsWith("</")
    ) {
      if (inParagraph) {
        result += "</p>";
        inParagraph = false;
      }
      result += line + "\n";
    } else {
      if (!inParagraph) {
        result += "<p>";
        inParagraph = true;
      }
      result += line + " ";
    }
  }
  if (inParagraph) {
    result += "</p>";
  }

  const css = `
  * { box-sizing: border-box; }
  body { font-family: "PingFang SC", "Microsoft YaHei", "Segoe UI", Arial, sans-serif; color: #1f2937; line-height: 1.75; margin: 0; background: #f9fafb; }
  .page { max-width: 860px; margin: 0 auto; padding: 40px 48px; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.08); }
  h1 { font-size: 26px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin: 32px 0 16px; }
  h2 { font-size: 20px; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin: 28px 0 12px; }
  h3 { font-size: 17px; font-weight: 600; margin: 22px 0 8px; }
  h4 { font-size: 15px; font-weight: 600; margin: 18px 0 6px; }
  h5, h6 { font-size: 14px; font-weight: 600; margin: 14px 0 6px; }
  p { margin: 8px 0; text-align: justify; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 1px 5px; font-family: Consolas, Monaco, monospace; font-size: 13px; color: #b91c1c; }
  pre.code-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; overflow-x: auto; margin: 12px 0; position: relative; }
  pre.code-block code { background: transparent; border: none; padding: 0; color: #1e293b; font-size: 13px; line-height: 1.6; }
  .code-lang { position: absolute; top: 8px; right: 12px; background: #dc2626; color: #fff; font-size: 11px; padding: 1px 8px; border-radius: 4px; font-family: Consolas, monospace; }
  ul, ol { margin: 8px 0 8px 24px; }
  li { margin: 3px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 600; white-space: nowrap; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; max-width: 100%; padding: 16px; }
    a { color: inherit; }
    pre.code-block, table, tr { page-break-inside: avoid; }
  }
  `;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>VALTRIX企业官网及后台管理系统 - 使用说明书</title>
<style>${css}</style>
</head>
<body>
<div class="page">${result}</div>
</body>
</html>`;
}
