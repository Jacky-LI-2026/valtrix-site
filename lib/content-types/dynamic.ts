/**
 * 动态内容类型（P3）：后台可视化定义新栏目，无需改代码即可获得通用 CRUD + 前台渲染。
 * =====================================================
 * - ContentTypeDef：类型定义（字段 Schema 存 Json）
 * - DynamicContent：条目数据（全部字段存 Json，多语言字段为 {zh,en,ja,ko,fr,ar} 对象）
 * 与静态注册类型（registry.ts）互补：动态类型走本模块，静态类型走 service.ts delegate 路径。
 */
import { prisma } from "@/lib/prisma";
import { ContentTypeConfig, ContentField, getContentType } from "./registry";
import { LANGS } from "@/lib/admin-form";

// ===== 类型定义 ↔ ContentTypeConfig 转换 =====

/** 解析内容类型配置：静态注册优先，其次动态类型（DB）。服务端页面/API 统一用此入口。 */
export async function resolveContentType(name: string): Promise<ContentTypeConfig | null> {
  return getContentType(name) || (await getDynamicType(name).catch(() => null));
}

function defToConfig(def: any): ContentTypeConfig {
  const fields = (def.fields as ContentField[]) || [];
  const listColumns = (def.listColumns as { key: string; label: string; width?: string }[]) || [];
  return {
    name: def.name,
    label: def.label,
    model: "DynamicContent",
    fields,
    listColumns: listColumns.length
      ? listColumns
      : fields.map((f) => ({ key: f.name, label: f.label })),
    titleField: def.titleField || "title",
    slugField: def.slugField || undefined,
    searchFields: fields
      .filter((f) => f.kind === "text" || f.kind === "textarea" || f.kind === "richtext")
      .map((f) => f.name),
    sort: { field: "sortOrder", order: "asc" },
    enableSeo: !!def.enableSeo,
    enableStatus: !!def.enableStatus,
  };
}

/** 动态类型是否存在 */
export async function isDynamicType(name: string): Promise<boolean> {
  try {
    const def = await prisma.contentTypeDef.findFirst({ where: { name, active: true }, select: { id: true } });
    return !!def;
  } catch {
    return false;
  }
}

/** 取单个动态类型配置 */
export async function getDynamicType(name: string): Promise<ContentTypeConfig | null> {
  const def = await prisma.contentTypeDef.findFirst({ where: { name, active: true } });
  return def ? defToConfig(def) : null;
}

/** 取全部动态类型配置 */
export async function listDynamicTypes(): Promise<ContentTypeConfig[]> {
  const defs = await prisma.contentTypeDef.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return defs.map(defToConfig);
}

// ===== 字段数据转换：提交表单（后缀键）→ fields Json（多语言对象）=====

const ML_SUFFIX = ["", "En", "Ja", "Ko", "Fr", "Ar"];

export function buildFieldsJson(cfg: ContentTypeConfig, data: any): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const f of cfg.fields) {
    if (f.multiLang) {
      const obj: Record<string, any> = {};
      for (const lang of LANGS) {
        const key = lang === "zh" ? f.name : f.name + ML_SUFFIX[LANGS.indexOf(lang)];
        const v = data[key];
        obj[lang] = v === "" || v === undefined || v === null ? "" : v;
      }
      fields[f.name] = obj;
    } else {
      if (f.name in data) fields[f.name] = data[f.name];
    }
  }
  return fields;
}

/** fields Json（多语言对象）→ 表单后缀键（与 admin-form 约定一致） */
export function expandFieldsToForm(cfg: ContentTypeConfig, fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of cfg.fields) {
    const v = fields ? fields[f.name] : undefined;
    if (f.multiLang && v && typeof v === "object") {
      for (const lang of LANGS) {
        const key = lang === "zh" ? f.name : f.name + ML_SUFFIX[LANGS.indexOf(lang)];
        out[key] = v[lang] ?? "";
      }
    } else if (f.name in fields) {
      out[f.name] = v;
    }
  }
  return out;
}

/** 取多语言字段的当前语种值（前台渲染用） */
export function pickLang(v: any, locale: string): any {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v[locale] || v.zh || "";
  }
  return v;
}

// ===== 动态条目 CRUD =====

function serializeItem(item: any): any {
  if (!item) return item;
  const base: any = {
    id: String(item.id),
    type: item.type,
    slug: item.slug,
    title: item.title,
    status: item.status,
    sortOrder: item.sortOrder,
    siteId: item.siteId != null ? String(item.siteId) : null,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  // 展开 fields 到顶层（含多语言对象字段）
  const fields = item.fields || {};
  for (const k of Object.keys(fields)) base[k] = fields[k];
  return base;
}

function slugify(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || `item-${Date.now()}`;
}

export interface DynamicListOptions {
  search?: string;
  status?: string;
  all?: boolean;
  /** 多租户站点过滤（后台站点视角 / 前台站点解析后传入） */
  siteWhere?: Record<string, any>;
}

export const dynamicService = {
  async list(type: string, opts: DynamicListOptions = {}) {
    const where: any = { type };
    if (!opts.all) where.status = opts.status || "published";
    else if (opts.status) where.status = opts.status;
    // 多租户站点过滤
    if (opts.siteWhere && Object.keys(opts.siteWhere).length) Object.assign(where, opts.siteWhere);
    if (opts.search) {
      where.OR = [{ title: { contains: opts.search } }, { slug: { contains: opts.search } }];
    }
    const items = await prisma.dynamicContent.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
      take: 500,
    });
    return items.map(serializeItem);
  },

  async getById(type: string, id: string) {
    const item = await prisma.dynamicContent.findFirst({ where: { id: BigInt(id), type } });
    return serializeItem(item);
  },

  async getBySlug(type: string, slug: string, siteWhere?: Record<string, any>) {
    // 详情只返回已发布内容（与 dynamicService.list 默认口径一致；status 放在最后，外部 siteWhere 不得覆盖）
    const item = await prisma.dynamicContent.findFirst({ where: { type, slug, ...(siteWhere || {}), status: "published" } });
    return serializeItem(item);
  },

  async create(type: string, data: any) {
    const cfg = await getDynamicType(type);
    if (!cfg) throw new Error(`Unsupported content type: ${type}`);
    const title = String(data[cfg.titleField] || "未命名");
    let slug = String(data[cfg.slugField || "slug"] || "");
    if (!slug) slug = slugify(title);
    const fields = buildFieldsJson(cfg, data);
    const status = data.status || (cfg.enableStatus ? "published" : "published");
    const siteId = data.siteId != null ? BigInt(String(data.siteId)) : null;
    const item = await prisma.dynamicContent.create({
      data: {
        type,
        slug,
        title,
        fields,
        status,
        sortOrder: Number(data.sortOrder) || 0,
        publishedAt: status === "published" ? new Date() : null,
        siteId,
      },
    });
    return serializeItem(item);
  },

  async update(type: string, id: string, data: any) {
    const cfg = await getDynamicType(type);
    if (!cfg) throw new Error(`Unsupported content type: ${type}`);
    const title = String(data[cfg.titleField] || "未命名");
    const slug = String(data[cfg.slugField || "slug"] || "");
    const fields = buildFieldsJson(cfg, data);
    const status = data.status || "published";
    const item = await prisma.dynamicContent.update({
      where: { id: BigInt(id) },
      data: {
        slug: slug || slugify(title),
        title,
        fields,
        status,
        sortOrder: Number(data.sortOrder) || 0,
        publishedAt: status === "published" ? new Date() : null,
      },
    });
    return serializeItem(item);
  },

  async remove(type: string, id: string) {
    await prisma.dynamicContent.deleteMany({ where: { id: BigInt(id), type } });
    return { ok: true };
  },
};
