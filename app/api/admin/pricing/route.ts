import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // 当前价格显示策略
  const cfg = await prisma.siteConfig.findUnique({ where: { configKey: "pricing_config" } });
  const value = (cfg?.configValue && typeof cfg.configValue === "object" ? cfg.configValue : {}) as Record<string, unknown>;
  // 客户分类列表（供折扣配置）
  const customerTypes = await prisma.customerType.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  // 会员等级列表（供折扣配置）
  const levels = await prisma.memberLevel.findMany({ orderBy: [{ threshold: "asc" }, { id: "asc" }] });
  return NextResponse.json({
    mode: String(value.mode || "hidden"),
    updatedAt: value.updatedAt || null,
    customerTypes: customerTypes.map((t) => ({
      key: t.key, name: t.name, discount: t.discount, seePartsPrice: t.seePartsPrice,
    })),
    levels: levels.map((l) => ({ key: l.key, name: l.name, discount: l.discount })),
  });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mode = String(body.mode || "hidden");
  const valid = ["hidden", "public", "byCustomerType", "emailVerify", "emailQuote"];
  if (!valid.includes(mode)) return NextResponse.json({ error: "无效的价格显示模式" }, { status: 400 });
  const now = new Date().toISOString();
  await prisma.siteConfig.upsert({
    where: { configKey: "pricing_config" },
    update: { configValue: { mode, updatedAt: now } },
    create: { configKey: "pricing_config", configValue: { mode, updatedAt: now }, remark: "价格显示策略（hidden/public/byCustomerType/emailVerify/emailQuote）" },
  });
  return NextResponse.json({ ok: true, mode, updatedAt: now });
}
