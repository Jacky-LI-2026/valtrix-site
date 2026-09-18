/**
 * 公开白标 OEM 配置（前台页脚/品牌展示读取）
 * 未配置时返回默认值，前端可自行回退默认文案。
 */
import { NextResponse } from "next/server";
import { getBrandName } from '@/lib/brand';
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await prisma.siteConfig
    .findUnique({ where: { configKey: "oem_config" } })
    .catch(() => null);
  const oem = (row?.configValue && typeof row.configValue === "object" ? row.configValue : {}) as any;
  return NextResponse.json({
    ok: true,
    data: {
      brandName: oem.brandName || getBrandName(),
      frontendBrand: oem.frontendBrand || "",
      frontendCopyright: oem.frontendCopyright || "",
      icp: oem.icp || "",
      loginLogo: oem.loginLogo || "",
      showLegal: oem.showLegal !== false,
    },
  });
}
