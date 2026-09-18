import { readFileSync } from "fs";
import { getBrandName } from '@/lib/brand';
import { join } from "path";
import { NextResponse } from "next/server";
import { renderDownloadHtml } from "@/lib/guide-render";
import { auth } from "@/auth";

// 使用说明书下载（Markdown 源文件 / 独立 HTML 文档）
// 鉴权由全局 auth 拦截（/admin 路径已受保护）
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "html";

  let content = "";
  try {
    const filePath = join(process.cwd(), "docs", "user-guide.md");
    content = readFileSync(filePath, "utf-8");
  } catch (e) {
    return NextResponse.json({ error: "使用说明书文档不存在" }, { status: 404 });
  }

  if (format === "md") {
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        // RFC 5987：文件名用 ASCII + URL 编码（HTTP 头不允许非 ASCII 字符）
        "Content-Disposition": `attachment; filename="user-guide.md"; filename*=UTF-8''${encodeURIComponent(`${getBrandName()}网站使用说明书.md`)}`,
        "Cache-Control": "no-store",
      },
    });
  }

  const html = renderDownloadHtml(content);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="user-guide.html"; filename*=UTF-8''${encodeURIComponent(`${getBrandName()}网站使用说明书.html`)}`,
      "Cache-Control": "no-store",
    },
  });
}
