import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

/**
 * 统一版本号来源：优先 DB systemVersion（系统更新管理），无则回退 package.json 版本。
 * 侧边栏底部、部署页「当前版本」、仪表盘「系统版本」均以此为准，避免多处版本号不一致。
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  let appVersion = "1.0.0";
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    if (pkg.version) appVersion = pkg.version;
  } catch {}

  let dbVersion: string | null = null;
  let dbReleaseDate: string | null = null;
  try {
    const v = await prisma.systemVersion.findFirst({ where: { isCurrent: true } });
    if (v) {
      dbVersion = v.version;
      dbReleaseDate = v.releaseDate ? new Date(v.releaseDate).toISOString() : null;
    }
  } catch {}

  return NextResponse.json({
    version: dbVersion || appVersion,
    appVersion,
    dbVersion,
    releaseDate: dbReleaseDate,
  });
}
