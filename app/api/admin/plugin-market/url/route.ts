import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MARKET_URL_KEY = "plugin_market_url";

/**
 * 远程市场 URL 配置（site_config.plugin_market_url，可选）。
 * GET：读取当前配置；POST：保存远程市场目录 JSON URL（空串 = 清除，回退内置目录）。
 *
 * 来源：自阀门站（VALTRIX）回流至通用基地（2026-09-12，双 fork 合并 D2）。
 * 权限：middleware 的 API_PERMISSION 已将其收口到 config:site。
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: MARKET_URL_KEY } });
    const v = row?.configValue as unknown;
    return NextResponse.json({ ok: true, url: typeof v === "string" ? v : "" });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "读取失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { url } = body || {};
    const value = typeof url === "string" ? url.trim() : "";
    if (value && !/^https?:\/\//.test(value)) {
      return NextResponse.json({ ok: false, error: "远程市场 URL 需以 http:// 或 https:// 开头" }, { status: 400 });
    }
    await prisma.siteConfig.upsert({
      where: { configKey: MARKET_URL_KEY },
      create: { configKey: MARKET_URL_KEY, configValue: value },
      update: { configValue: value },
    });
    return NextResponse.json({ ok: true, url: value });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "保存失败" }, { status: 500 });
  }
}
