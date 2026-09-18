import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";


/**
 * 公共站点配置API接口
 * 返回站点配置信息，包括联系信息、公司信息等（多租户：站点级覆盖优先）
 * GET /api/public/site-config?key=xxx  / 无参返回全部
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    // 多租户：按 Host 解析当前站点
    let siteId: bigint | null = null;
    try {
      const ctx = await getTenantContext(request.headers);
      siteId = typeof ctx.siteId === "bigint" ? ctx.siteId : BigInt(ctx.siteId);
    } catch (e) {
      siteId = null;
    }

    if (key) {
      // 返回单个配置（站点覆盖优先，回退全局）
      let value: any = null;
      if (siteId) {
        const scoped = await prisma.siteConfigOverride.findUnique({
          where: { siteId_configKey: { siteId, configKey: key } },
        });
        if (scoped && scoped.configValue !== null && scoped.configValue !== undefined) {
          value = scoped.configValue;
        }
      }
      if (value === null) {
        const config = await prisma.siteConfig.findUnique({ where: { configKey: key } });
        value = config?.configValue ?? null;
      }
      return cachedJson({ success: true, data: value }, 'config');
    }

    // 返回所有配置（站点覆盖合并）
    const configs = await prisma.siteConfig.findMany({ orderBy: { configKey: "asc" } });
    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.configKey] = config.configValue;
    }
    if (siteId) {
      const overrides = await prisma.siteConfigOverride.findMany({ where: { siteId } });
      for (const o of overrides) {
        if (o.configValue !== null && o.configValue !== undefined) {
          result[o.configKey] = o.configValue;
        }
      }
    }

    return cachedJson({ success: true, data: result, total: Object.keys(result).length }, 'config');
  } catch (error) {
    console.error("获取站点配置失败:", error);
    return cachedJson(
      { success: false, error: "获取站点配置失败", data: {} },
      'config', 500);
  }
}
