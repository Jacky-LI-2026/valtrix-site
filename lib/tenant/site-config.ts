/**
 * 站点级配置（Site-scoped Config Override）
 * =====================================================
 * 多租户站点级覆盖：优先读 site_config_override（站点维度），回退全局 site_config。
 * - 站点管理：lib/tenant/context.ts 按 Host 解析；后台按 admin_site_id cookie。
 * - 覆盖项（站点差异）：站点信息/首页配置/SEO/页头/社交等外观与营销类配置。
 */
import { prisma } from "@/lib/prisma";

function toBigInt(siteId: bigint | number | null | undefined): bigint | null {
  if (siteId === null || siteId === undefined) return null;
  return typeof siteId === "bigint" ? siteId : BigInt(siteId);
}

/**
 * 读取配置（站点级优先，回退全局）。
 * valueTransform 可选：如站点配置存 JSON 字符串，可在此统一转换。
 */
export async function getSiteConfigValue(
  key: string,
  siteId?: bigint | number | null,
  opts?: { parseJsonString?: boolean }
): Promise<any> {
  const sid = toBigInt(siteId);
  if (sid) {
    const scoped = await prisma.siteConfigOverride.findUnique({
      where: { siteId_configKey: { siteId: sid, configKey: key } },
    });
    if (scoped && scoped.configValue !== null && scoped.configValue !== undefined) {
      const v = scoped.configValue;
      return opts?.parseJsonString && typeof v === "string" ? v : v;
    }
  }
  const global = await prisma.siteConfig.findUnique({ where: { configKey: key } });
  return global?.configValue ?? null;
}

/** 写入站点级覆盖（维度不存在则创建） */
export async function setSiteConfigValue(
  key: string,
  value: any,
  siteId?: bigint | number | null
) {
  const sid = toBigInt(siteId);
  if (!sid) {
    // 无站点维度：写全局
    const exist = await prisma.siteConfig.findUnique({ where: { configKey: key } });
    if (exist) {
      return prisma.siteConfig.update({ where: { id: exist.id }, data: { configValue: value } });
    }
    return prisma.siteConfig.create({ data: { configKey: key, configValue: value } });
  }
  return prisma.siteConfigOverride.upsert({
    where: { siteId_configKey: { siteId: sid, configKey: key } },
    create: { siteId: sid, configKey: key, configValue: value },
    update: { configValue: value },
  });
}

/** 删除站点级覆盖（回退全局） */
export async function deleteSiteConfigValue(
  key: string,
  siteId?: bigint | number | null
) {
  const sid = toBigInt(siteId);
  if (!sid) return;
  await prisma.siteConfigOverride
    .delete({ where: { siteId_configKey: { siteId: sid, configKey: key } } })
    .catch(() => {});
}

/** 合并读取：站点级覆盖与全局合并（覆盖优先），返回 { scoped, global } */
export async function getSiteConfigMerged(
  keys: string[],
  siteId?: bigint | number | null
): Promise<{ scoped: Record<string, any>; global: Record<string, any> }> {
  const sid = toBigInt(siteId);
  const scoped: Record<string, any> = {};
  const global: Record<string, any> = {};
  const globals = await prisma.siteConfig.findMany({ where: { configKey: { in: keys } } });
  globals.forEach((g: any) => {
    if (g.configValue !== null && g.configValue !== undefined) global[g.configKey] = g.configValue;
  });
  if (sid) {
    const scopedRows = await prisma.siteConfigOverride.findMany({
      where: { siteId: sid, configKey: { in: keys } },
    });
    scopedRows.forEach((r: any) => {
      if (r.configValue !== null && r.configValue !== undefined) scoped[r.configKey] = r.configValue;
    });
  }
  return { scoped, global };
}
