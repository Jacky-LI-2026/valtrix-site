/**
 * 租户上下文（Tenant Context）
 * =====================================================
 * R1 轻量多租户基座：
 *  - 通过请求 Host 头解析当前站点（Site），站点归属租户（Tenant）。
 *  - 未配置多站点时回退「默认站点」（isDefault=true，存量数据归属 tenantId=1）。
 *  - 缓存解析结果，避免每请求查库（TTL 60s）。
 *
 * 用法（服务端）：
 *   const ctx = await getTenantContext(headers);
 *   ctx.site / ctx.tenant / ctx.isDefault
 */
import { prisma } from "@/lib/prisma";


export interface TenantSite {
  siteId: bigint | number;
  tenantId: bigint | number;
  siteName: string;
  domain: string | null;
  templateSlug: string;
  themeConfig: any;
  logo: string | null;
  locale: string;
  isDefault: boolean;
  tenantName: string;
  edition: string;
}

/** 归一化 host：去端口、去 www 前缀、小写 */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  let h = String(host).trim().toLowerCase();
  const i = h.indexOf(":");
  if (i > 0) h = h.slice(0, i);
  if (h.startsWith("www.")) h = h.slice(4);
  return h;
}

/** 内存缓存：host -> TenantSite（TTL 60s） */
const ctxCache = new Map<string, { at: number; value: TenantSite }>();
const CTX_TTL = 60_000;

/**
 * 根据请求 Host 解析当前站点上下文。
 * @param headers 请求头（headers.get 或普通对象）
 * @param force 强制刷新（跳过缓存）
 */
export async function getTenantContext(
  headers: Headers | Record<string, string | string[] | null | undefined> = {},
  force = false
): Promise<TenantSite> {
  const host = normalizeHost(
    typeof (headers as any).get === "function"
      ? (headers as Headers).get("host") || (headers as Headers).get("x-forwarded-host")
      : (headers as any).host || (headers as any)["x-forwarded-host"]
  );

  if (host && !force) {
    const cached = ctxCache.get(host);
    if (cached && Date.now() - cached.at < CTX_TTL) return cached.value;
  }

  // 1) 按域名精确匹配站点
  let site: any = null;
  if (host) {
    site = await prisma.site.findFirst({
      where: { domain: host, status: "active" },
      include: { tenant: true },
    });
    // 附加域名列表匹配
    if (!site) {
      const all = await prisma.site.findMany({
        where: { status: "active" },
        include: { tenant: true },
      });
      site = all.find((s: any) => {
        const ds: string[] = s.domains ? (Array.isArray(s.domains) ? s.domains : []) : [];
        return ds.some((d: string) => normalizeHost(d) === host);
      }) || null;
    }
  }

  // 2) 兜底：默认站点
  if (!site) {
    site = await prisma.site.findFirst({
      where: { isDefault: true, status: "active" },
      include: { tenant: true },
    });
  }
  // 3) 数据库为空时构造内存默认站点（存量单站点模式）
  if (!site) {
    const ctx: TenantSite = {
      siteId: 1,
      tenantId: 1,
      siteName: "企业官网",
      domain: null,
      templateSlug: "default",
      themeConfig: null,
      logo: null,
      locale: "zh",
      isDefault: true,
      tenantName: "默认租户",
      edition: "standard",
    };
    if (host) ctxCache.set(host, { at: Date.now(), value: ctx });
    return ctx;
  }

  const ctx: TenantSite = {
    siteId: site.id,
    tenantId: site.tenantId || 1,
    siteName: site.name,
    domain: site.domain,
    templateSlug: site.templateSlug || "default",
    themeConfig: site.themeConfig,
    logo: site.logo,
    locale: site.locale || "zh",
    isDefault: !!site.isDefault,
    tenantName: site.tenant?.name || "默认租户",
    edition: site.tenant?.edition || "standard",
  };
  if (host) ctxCache.set(host, { at: Date.now(), value: ctx });
  return ctx;
}

/** 失效某 host 的缓存（站点配置修改后调用） */
export function invalidateTenantContext(host?: string): void {
  if (host) ctxCache.delete(normalizeHost(host));
  else ctxCache.clear();
}
