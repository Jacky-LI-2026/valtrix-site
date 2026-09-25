import { NextRequest, NextResponse } from "next/server";
import { getContentType } from "@/lib/content-types/registry";
import { resolveContentType } from "@/lib/content-types/dynamic";
import { contentService, modelVarcharLimits } from "@/lib/content-types/service";
import { auth } from "@/auth";

/**
 * 统一后台内容元数据 API
 * GET /api/admin/content/[type]/meta → { relations: { [field]: [{value,label}] }, limits: { column: maxLen } }
 * 供通用表单的关联下拉（kind=relation）动态加载选项；
 * `limits` 走 `prisma/schema.prisma` 里的 VarChar 上限（2026-09-20 起）：
 *   编辑页据此在输入框旁显示「已用 384 / 上限 500」并给输入框加 maxLength。
 */
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const cfg = (await resolveContentType(params.type)) || getContentType(params.type);
  if (!cfg) return NextResponse.json({ error: "Unknown content type" }, { status: 404 });
  try {
    const relations = await contentService.getRelations(params.type);
    return NextResponse.json({ relations, limits: modelVarcharLimits(cfg.model) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Meta failed" }, { status: 500 });
  }
}
