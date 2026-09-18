import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cachedJson } from "@/lib/api-cache";

export const dynamic = "force-dynamic";


/**
 * 公共首页配置API接口
 * 返回首页配置信息，包括轮播图、统计数据、CTA等
 * GET /api/public/home-config
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前启用的首页配置
    const config = await prisma.homeConfig.findFirst({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });

    if (!config) {
      return cachedJson({
        success: true,
        data: null,
        message: "未配置首页数据",
      }, 'config');
    }

    return cachedJson({
      success: true,
      data: {
        id: Number(config.id),
        name: config.name,
        banners: config.banners || [],
        features: config.features || [],
        stats: config.stats || [],
        featuredProducts: config.featuredProducts || [],
        featuredCategories: config.featuredCategories || [],
        showNews: config.showNews,
        showIndustries: config.showIndustries,
        showServices: config.showServices,
        ctaTitle: config.ctaTitle,
        ctaSubtitle: config.ctaSubtitle,
        ctaButtonText: config.ctaButtonText,
        ctaButtonLink: config.ctaButtonLink,
        seoTitle: config.seoTitle,
        seoDesc: config.seoDesc,
        seoKeywords: config.seoKeywords,
      },
    }, 'config');
  } catch (error) {
    console.error("获取首页配置失败:", error);
    return cachedJson(
      {
        success: false,
        error: "获取首页配置失败",
        data: null,
      },
      'config', 500);
  }
}
