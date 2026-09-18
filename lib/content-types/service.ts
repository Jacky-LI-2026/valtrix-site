/**
 * 通用内容 CRUD 引擎（Content Service）
 * =====================================================
 * 由内容类型注册表驱动，对已注册的内容类型提供统一的数据访问：
 * list / getById / getBySlug / create / update / remove。
 *
 * 安全设计：
 *  - DELEGATE_WHITELIST 白名单：只有注册过的 Prisma delegate 可访问，
 *    杜绝通过 URL 参数访问任意模型。
 *  - sanitizeData 按注册表字段裁剪提交数据，防止多余字段写入。
 *  - BigInt id 统一序列化为 string（Next Response.json 不支持 BigInt）。
 */

import { prisma } from '@/lib/prisma';
import { getContentType, getMultiLangKeys, type ContentTypeConfig } from "./registry";
import { isDynamicType, dynamicService, listDynamicTypes, getDynamicType as getDynamicTypeFromDb } from "./dynamic";
import { LANGS, langFieldName } from "@/lib/admin-form";
import { adminListFilter, adminCreateSiteId } from "@/lib/tenant/admin-scope";


/** ⚠️ 白名单：新增内容类型时必须在注册表 + 此处同步登记 */
const DELEGATE_WHITELIST = new Set(["Faq", "Case", "Product", "News", "Service", "Industry"]);

function getDelegate(type: string): any {
  const cfg = getContentType(type);
  if (!cfg || !DELEGATE_WHITELIST.has(cfg.model)) {
    throw new Error(`Unsupported content type: ${type}`);
  }
  return (prisma as any)[cfg.model];
}

/** BigInt → string（递归序列化）；Decimal → number；Date 保留 */
export function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === "object") {
    // Prisma Decimal（含 toNumber 方法）→ number；RSC 无法序列化 Decimal（含函数）
    if (typeof (obj as any).toNumber === "function" && !(obj instanceof Date)) return (obj as any).toNumber();
    if (obj instanceof Date) return obj; // RSC 支持 Date
    const r: Record<string, any> = {};
    for (const k of Object.keys(obj)) r[k] = serialize((obj as any)[k]);
    return r;
  }
  return obj;
}

/**
 * 产品规格抽取（增强型内容类型扩展）：从提交数据提取 specs 数组，
 * 过滤「参数名与参数值都为空」的行，映射为 ProductSpec 关联表字段。
 */
function extractSpecs(data: any): any[] {
  const arr = Array.isArray(data?.specs) ? data.specs : [];
  return arr
    .filter((s: any) => s && ((s.label || "").trim() || (s.value || "").trim()))
    .map((s: any, i: number) => ({
      groupName: s.groupName?.trim() ? s.groupName.trim() : null,
      label: String(s.label || "").trim(),
      value: String(s.value || "").trim(),
      unit: s.unit?.trim() ? s.unit.trim() : null,
      labelEn: s.labelEn || null, labelJa: s.labelJa || null, labelKo: s.labelKo || null, labelFr: s.labelFr || null, labelAr: s.labelAr || null,
      valueEn: s.valueEn || null, valueJa: s.valueJa || null, valueKo: s.valueKo || null, valueFr: s.valueFr || null, valueAr: s.valueAr || null,
      sortOrder: i,
    }));
}

/** 按注册表字段裁剪提交数据 */
export function sanitizeData(type: string, data: any): Record<string, any> {
  const cfg = getContentType(type);
  const out: Record<string, any> = {};
  if (!cfg) return out;
  for (const f of cfg.fields) {
    if (f.multiLang) {
      // 多语言字段：展开六语种键，只取提交中存在的
      for (const lk of getMultiLangKeys(f.name)) {
        if (lk in data) out[lk] = data[lk] === "" ? null : data[lk];
      }
    } else if (f.kind === "relation") {
      // 关联字段：字符串 id → BigInt（空值清空为 null）
      if (f.name in data) {
        const v = data[f.name];
        out[f.name] = v === "" || v == null ? null : BigInt(String(v));
      }
    } else {
      if (f.name in data) out[f.name] = data[f.name];
    }
  }
  // SEO/GEO 字段（enableSeo 时）：seoTitle/seoDescription/seoKeywords 多语言 + geoRegion/geoCity 单值
  if (cfg.enableSeo) {
    for (const base of ["seoTitle", "seoDescription", "seoKeywords"]) {
      for (const lk of getMultiLangKeys(base)) {
        if (lk in data) out[lk] = data[lk] === "" ? null : data[lk];
      }
    }
    for (const k of ["geoRegion", "geoCity"]) {
      if (k in data) out[k] = data[k] === "" ? null : data[k];
    }
  }
  return out;
}

function slugify(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || `item-${Date.now()}`;
}

export interface ListOptions {
  search?: string;
  status?: string;
  /** true = 不过滤状态（后台用）；默认前台仅 published */
  all?: boolean;
  /** 多租户站点过滤（前台站点解析传入；后台默认读站点视角） */
  siteWhere?: Record<string, any>;
}

export const contentService = {
  /** 列表 */
  async list(type: string, opts: ListOptions = {}) {
    // 多租户：前台传 siteWhere（站点解析），后台未传时读站点视角 cookie（全局视角 = 不过滤）
    const siteWhere = opts.siteWhere ?? adminListFilter();
    if (await isDynamicType(type)) return dynamicService.list(type, { ...opts, siteWhere });
    const cfg = getContentType(type);
    const d = getDelegate(type);
    const where: any = {};
    if (!opts.all && cfg?.enableStatus) {
      where.status = opts.status || "published";
    } else if (opts.status) {
      where.status = opts.status;
    }
    if (Object.keys(siteWhere).length) Object.assign(where, siteWhere);
    if (opts.search && cfg?.searchFields?.length) {
      where.OR = cfg.searchFields.map((f) => ({ [f]: { contains: opts.search } }));
    }
    const orderBy = cfg?.sort ? { [cfg.sort.field]: cfg.sort.order } : { id: "desc" as const };
    const items = await d.findMany({
      where,
      orderBy,
      take: 500,
      include: type === "products" ? { tab: true } : undefined,
    });
    const list = serialize(items);
    // 产品类型：补充产品分类名（categoryId 无 relation，二次查询映射）
    if (type === "products" && Array.isArray(list) && list.length) {
      const catIds = list.map((x: any) => x.categoryId).filter(Boolean);
      if (catIds.length) {
        const cats = await prisma.productCategory.findMany({ where: { id: { in: catIds.map(BigInt) } } });
        const catMap = new Map(cats.map((c) => [String(c.id), c.name]));
        list.forEach((x: any) => { if (x.categoryId) x.categoryName = catMap.get(String(x.categoryId)) || null; });
      }
      list.forEach((x: any) => { if (x.tab) x.tabName = x.tab.name; delete x.tab; });
    }
    return list;
  },

  /** 按 id 取详情（产品类型附带 specs 规格） */
  async getById(type: string, id: string) {
    if (await isDynamicType(type)) return dynamicService.getById(type, id);
    const d = getDelegate(type);
    const include = type === "products" ? { productSpecs: { orderBy: { sortOrder: "asc" as const } } } : undefined;
    const item = await d.findUnique({ where: { id: BigInt(id) }, include });
    return item ? serialize(item) : null;
  },

  /** 按 slug 取详情（该类型配置了 slugField 时；siteWhere 为多租户站点过滤） */
  async getBySlug(type: string, slug: string, siteWhere?: Record<string, any>) {
    if (await isDynamicType(type)) return dynamicService.getBySlug(type, slug, siteWhere);
    const cfg = getContentType(type);
    if (!cfg?.slugField) return null;
    const d = getDelegate(type);
    // 详情同样只返回已发布内容（与 list 同一口径：cfg.enableStatus 为真时按 published 过滤）
    const where: any = { [cfg.slugField]: slug, ...(siteWhere || {}) };
    if (cfg.enableStatus) where.status = "published";
    const item = await d.findFirst({ where });
    return item ? serialize(item) : null;
  },

  /** 创建 */
  async create(type: string, data: any) {
    // 多租户：新建内容归属当前后台站点视角（全局视角 = null 全局共享）
    const viewSiteId = data?.siteId != null ? BigInt(String(data.siteId)) : adminCreateSiteId();
    const siteData = viewSiteId ? { ...data, siteId: viewSiteId } : data;
    if (await isDynamicType(type)) return dynamicService.create(type, siteData);
    const cfg = getContentType(type);
    const d = getDelegate(type);
    const clean = sanitizeData(type, siteData);
    if (viewSiteId) clean.siteId = viewSiteId;
    // 自动生成 slug（未提供时用标题）
    if (cfg?.slugField && !clean[cfg.slugField]) {
      const base = clean[cfg.titleField] || clean[langFieldName(cfg.titleField, "en" as (typeof LANGS)[number])] || "";
      clean[cfg.slugField] = slugify(base);
    }
    // 默认状态
    if (cfg?.enableStatus && !("status" in clean)) clean.status = "published";
    // 产品类型：事务内同步创建 specs 关联表
    if (type === "products" && Array.isArray(data?.specs)) {
      const specs = extractSpecs(data);
      const item = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({ data: clean as any });
        if (specs.length) {
          await tx.productSpec.createMany({ data: specs.map((s) => ({ ...s, productId: created.id })) });
        }
        return created;
      });
      return serialize(item);
    }
    const item = await d.create({ data: clean });
    return serialize(item);
  },

  /** 更新（产品类型事务内同步重写 specs） */
  async update(type: string, id: string, data: any) {
    if (await isDynamicType(type)) return dynamicService.update(type, id, data);
    const d = getDelegate(type);
    const clean = sanitizeData(type, data);
    if (type === "products" && Array.isArray(data?.specs)) {
      const specs = extractSpecs(data);
      const item = await prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({ where: { id: BigInt(id) }, data: clean as any });
        await tx.productSpec.deleteMany({ where: { productId: BigInt(id) } });
        if (specs.length) {
          await tx.productSpec.createMany({ data: specs.map((s) => ({ ...s, productId: BigInt(id) })) });
        }
        return updated;
      });
      return serialize(item);
    }
    const item = await d.update({ where: { id: BigInt(id) }, data: clean });
    return serialize(item);
  },

  /** 删除 */
  async remove(type: string, id: string) {
    if (await isDynamicType(type)) return dynamicService.remove(type, id);
    const d = getDelegate(type);
    await d.delete({ where: { id: BigInt(id) } });
    return { ok: true };
  },

  /** 关联字段选项（kind=relation）：供表单动态下拉 / 列表展示用 */
  async getRelations(type: string): Promise<Record<string, { value: string; label: string }[]>> {
    const cfg = getContentType(type) || (await getDynamicTypeFromDb(type));
    if (!cfg) return {};
    const relFields = cfg.fields.filter((f) => f.kind === "relation" && f.relationModel);
    const out: Record<string, { value: string; label: string }[]> = {};
    for (const f of relFields) {
      const d = (prisma as any)[f.relationModel as string];
      if (!d) continue;
      const labelField = f.relationLabelField || "name";
      try {
        const rows = await d.findMany({ select: { id: true, [labelField]: true }, take: 300, orderBy: { id: "asc" as const } });
        out[f.name] = rows.map((r: any) => ({ value: String(r.id), label: String(r[labelField] ?? r.id) }));
      } catch {
        out[f.name] = [];
      }
    }
    return out;
  },

  /** 是否为动态类型（前台渲染/后台类型管理用） */
  async isDynamic(type: string): Promise<boolean> {
    return isDynamicType(type);
  },

  /** 全部动态类型配置 */
  async dynamicTypes(): Promise<ContentTypeConfig[]> {
    return listDynamicTypes();
  },
};
