import { NextRequest, NextResponse } from "next/server";
import { getContentType } from "@/lib/content-types/registry";
import { contentService } from "@/lib/content-types/service";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

/**
 * 统一前台内容 API · 列表（仅已发布）
 * GET /api/public/content/[type]?search=
 * 注：不接受外部传入 status —— 公开接口恒为已发布，避免 ?status=draft 直读未发布内容。
 */
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const cfg = getContentType(params.type);
  if (!cfg) return NextResponse.json({ error: "Unknown content type" }, { status: 404 });
  const sp = req.nextUrl.searchParams;
  const ctx = await getTenantContext(req.headers);
  const siteWhere = buildSiteWhere(ctx.siteId);
  const items = await contentService.list(params.type, {
    search: sp.get("search") || undefined,
    siteWhere,
  });
  return NextResponse.json(items);
}
