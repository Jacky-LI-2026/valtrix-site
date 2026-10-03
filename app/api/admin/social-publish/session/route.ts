/**
 * 「当前访问者能不能发布到社媒」探针（给**前台详情页**用）
 * ==========================================================================
 * 前台详情页只有登录且具备发布权限的人才显示「发布到社媒」按钮 ——
 * 否则会把后台入口暴露给所有访客。
 *
 * 权限：本路径被 middleware 的 `/api/admin/social-publish` 前缀规则覆盖
 *   → 需 `social-publish:config`；未登录/无权限一律 401/403，前端据此隐藏按钮。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, user: session.user.name || "" });
}
