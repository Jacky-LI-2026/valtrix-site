import { NextRequest, NextResponse } from "next/server";
import { getContentType } from "@/lib/content-types/registry";
import { contentService } from "@/lib/content-types/service";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

/**
 * 统一前台内容 API · 详情（按 slug）
 * GET /api/public/content/[type]/[slug]
 * 注：仅注册表配置了 slugField 的类型支持详情页。
 */
export async function GET(req: NextRequest, { params }: { params: { type: string; slug: string } }) {
  const cfg = getContentType(params.type);
  if (!cfg?.slugField) return NextResponse.json({ error: "Type has no detail" }, { status: 404 });
  const ctx = await getTenantContext(req.headers);
  const siteWhere = buildSiteWhere(ctx.siteId);
  const item = await contentService.getBySlug(params.type, params.slug, siteWhere);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}
