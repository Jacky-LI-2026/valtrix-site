import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cachedJson } from "@/lib/api-cache";


/**
 * 公共页面配置API接口
 * 返回页面配置信息，包括页面标题、副标题、面包屑等
 * GET /api/public/page-config?page=about
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");

    if (!page) {
      // 返回所有页面配置
      const configs = await prisma.siteConfig.findMany({
        where: {
          configKey: {
            startsWith: "page_",
          },
        },
        orderBy: { configKey: "asc" },
      });

      const result: Record<string, any> = {};
      for (const config of configs) {
        result[config.configKey.replace("page_", "")] = config.configValue;
      }

      return cachedJson({
        success: true,
        data: result,
        total: configs.length,
      }, 'config');
    }

    // 返回单个页面配置
    const configKey = `page_${page}`;
    const config = await prisma.siteConfig.findUnique({
      where: { configKey },
    });

    return cachedJson({
      success: true,
      data: config?.configValue || null,
      page,
    }, 'config');
  } catch (error) {
    console.error("获取页面配置失败:", error);
    return cachedJson(
      {
        success: false,
        error: "获取页面配置失败",
        data: null,
      },
      'config', 500);
  }
}
