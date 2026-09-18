import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMarketManifest } from "@/lib/plugins/registry";
import { parseExpiry, signPluginCode } from "@/lib/plugins/market";

export const dynamic = "force-dynamic";

const ADMIN_PERMS = ["plugin:view", "system:admin"];

/**
 * POST /api/admin/plugin-market/generate-code
 * 管理员生成付费插件兑换码（仅 admin：检查 session 权限 plugin:view 或 system:admin）。
 * body: { key: string, exp?: '30d'|'permanent'|'YYYY-MM-DD', cid?: string }
 * 返回兑换码（base64url(payload).base64url(signature)），payload 含 { pluginKey, exp, issuedAt, cid }。
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  // 仅管理员可生成兑换码
  const user = session.user as any;
  const perms: string[] = user?.permissions || [];
  const roles: string[] = user?.roles || [];
  const isAdmin = roles.includes("admin") || perms.some((p) => ADMIN_PERMS.includes(p));
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "无权限：仅管理员可生成兑换码" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { key, exp, cid } = body || {};
    if (!key || typeof key !== "string") {
      return NextResponse.json({ ok: false, error: "缺少插件 key" }, { status: 400 });
    }
    const manifest = getMarketManifest(key.trim());
    if (!manifest) {
      return NextResponse.json({ ok: false, error: "市场目录中不存在该插件" }, { status: 404 });
    }
    if (!manifest.paid) {
      return NextResponse.json({ ok: false, error: "免费插件无需生成兑换码" }, { status: 400 });
    }
    const { iso } = parseExpiry(typeof exp === "string" ? exp : undefined);
    const code = signPluginCode({
      pluginKey: key.trim(),
      exp: iso,
      issuedAt: new Date().toISOString(),
      cid: typeof cid === "string" && cid.trim() ? cid.trim() : undefined,
    });
    return NextResponse.json({ ok: true, code, pluginKey: key.trim(), exp: iso || null });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "生成失败" }, { status: 500 });
  }
}
