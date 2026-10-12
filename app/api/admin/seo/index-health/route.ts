/**
 * 后台「收录体检」接口
 * GET /api/admin/seo/index-health → IndexHealth（robots / sitemap / 覆盖率 / 抽样可达性 / 推送历史）
 *
 * 权限：路径落在 `/api/admin/seo` 前缀内 ⇒ 由 middleware 的 API_PERMISSION 收口为 `seo:view`
 *       （与 SEO 设置页同一权限，不新增权限码）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { collectIndexHealth } from "@/lib/seo/index-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  // 采集器内部逐项 try/catch：单项失败只会在对应字段里给 error，不会整体抛错
  return NextResponse.json(await collectIndexHealth());
}
