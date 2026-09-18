import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * 后台页面配置API接口
 * 更新页面配置信息，包括页面标题、副标题、面包屑等
 * PUT /api/admin/page-config
 * Body: { page: "about", config: { title: "...", subtitle: "...", breadcrumb: "..." } }
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { page, config } = body;

    if (!page || !config) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const configKey = `page_${page}`;

    // 更新或创建页面配置
    const updatedConfig = await prisma.siteConfig.upsert({
      where: { configKey },
      update: {
        configValue: config,
        remark: `页面配置 - ${page}`,
      },
      create: {
        configKey,
        configValue: config,
        remark: `页面配置 - ${page}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: "页面配置更新成功",
    });
  } catch (error) {
    console.error("更新页面配置失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "更新页面配置失败",
      },
      { status: 500 }
    );
  }
}

/**
 * 获取所有页面配置
 * GET /api/admin/page-config
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
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

    return NextResponse.json({
      success: true,
      data: result,
      total: configs.length,
    });
  } catch (error) {
    console.error("获取页面配置失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取页面配置失败",
        data: {},
      },
      { status: 500 }
    );
  }
}
