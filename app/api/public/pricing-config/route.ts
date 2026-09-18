import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePricingConfig } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/** 前台读取价格显示策略（含客户分类列表） */
export async function GET() {
  const cfg = await prisma.siteConfig.findUnique({ where: { configKey: "pricing_config" } });
  const { mode } = parsePricingConfig(cfg?.configValue);
  const customerTypes = await prisma.customerType.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { key: true, name: true, seePartsPrice: true },
  });
  return NextResponse.json({
    mode,
    needVerify: mode === "emailVerify" || mode === "emailQuote",
    sendQuoteToEmail: mode === "emailQuote",
    customerTypes: customerTypes.map((t) => ({ key: t.key, name: t.name, seePartsPrice: t.seePartsPrice })),
  });
}
