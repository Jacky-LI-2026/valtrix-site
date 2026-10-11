/**
 * 后台「系统自检」接口
 * GET /api/admin/system-health → SystemHealth（数据库往返、应用服务、版本、授权状态）
 *
 * 权限：**仅要求登录**（middleware 的 isOpenAdminApi 白名单 —— 仪表盘是所有后台角色都看的页面，
 *      且本接口只返回健康状态，不含密钥、不含授权客户编号与绑定域名）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { collectSystemHealth } from "@/lib/system-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  // 采集器内部已逐项 try/catch，不会把异常抛给调用方
  return NextResponse.json(await collectSystemHealth());
}
