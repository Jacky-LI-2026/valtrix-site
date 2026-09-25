/**
 * 动态内容类型（P3）：后台可视化定义新栏目，无需改代码即可获得通用 CRUD + 前台渲染。
 * =====================================================
 * - ContentTypeDef：类型定义（字段 Schema 存 Json）
 * - DynamicContent：条目数据（全部字段存 Json，多语言字段为 {zh,en,ja,ko,fr,ar} 对象）
 * 与静态注册类型（registry.ts）互补：动态类型走本模块，静态类型走 service.ts delegate 路径。
 */
import { prisma } from "@/lib/prisma";
import { ContentTypeConfig, ContentField, getContentType, getMultiLangKeys } from "./registry";
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

/**
 * 表单值归一：**Json 数组字段 → JSON 字符串**
 * ---------------------------------------------------------------------------
 * 为什么（owner 2026-09-20 报障「核心优势保存后再打开消失」）：
 *   `StringArrayEditor` / `JsonArrayEditor` 的 `value` 约定是 **JSON 字符串**
 *   （内部 `JSON.parse(value)` 还原数组）。而库里 `features`/`featuresEn`… 是 **Json 数组**，
 *   把数组直接塞给编辑器 → `JSON.parse(["a"])` 得到的是字符串 "a" 的解析失败 → 走 catch
 *   → **渲染成空列表**，于是"明明存过，再打开却是空的"。
 *   同时它还会**回写空数组**：保存时 `serializeJsonFields` 见到空串就写 `[]` ⇒ 二次保存真的丢数据。
 */
function toFormValue(f: ContentField, v: any): any {
  if (f.kind === "jsonArray" || f.kind === "stringArray") {
    if (v === null || v === undefined || v === "") return "";
    if (Array.isArray(v) && v.length === 0) return ""; // 空数组等同"没填"，避免编辑器里出现一无所有的骨架
    if (typeof v === "string") return v;
    try { return JSON.stringify(v, null, 2); } catch { return ""; }
  }
  return v;
}

/** fields Json（多语言对象）→ 表单后缀键（与 admin-form 约定一致） */
export function expandFieldsToForm(cfg: ContentTypeConfig, fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of cfg.fields) {
    const v = fields ? fields[f.name] : undefined;
    /**
     * 🔴 2026-09-20 修复：**数组不能被当成「多语言对象」**。
     *   动态类型的多语言字段是 `{zh,en,…}` 对象；而内置类型（Prisma 模型）里
     *   `features` 这类是**Json 数组** —— 数组也是 `typeof === "object"`，
     *   于是走下面这个分支后取 `v["zh"]` ⇒ undefined ⇒ 六个语种全变成空串，
     *   编辑器显示为空、保存回写 `[]`（owner 报障「核心优势保存后消失」的直接原因）。
     *   `Date` 同理排除（避免被逐键展开）。
     */
    const isLangObject = v !== null && v !== undefined && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
    if (f.multiLang && isLangObject) {
      for (const lang of LANGS) {
        const key = lang === "zh" ? f.name : f.name + ML_SUFFIX[LANGS.indexOf(lang)];
        out[key] = toFormValue(f, v[lang] ?? "");
      }
    } else if (f.name in fields) {
      out[f.name] = toFormValue(f, v);
      // 🔴 2026-09-18 修复：内置内容类型（Prisma 模型）的多语言是**独立扁平列**
      //   （titleEn / titleJa / titleKo / …），值是**字符串** ⇒ 上面那个 `typeof v === "object"`
      //   分支不成立，只把中文基础键带出去了 ⇒ 各语种后缀键**全部丢失**。
      //   后果（线上实测）：
      //     · 后台编辑页「其他语言」Tab 恒为空（明明库里已有译文）；
      //     · 字段级「重新翻译为X」按钮点了没反应 —— 因为 useAdminForm.handleValuesChange
      //       有 `if (fieldName in next)` 守卫，键不存在就直接丢弃；
      //     · 而顶部「一键翻译全部」有效（它走 updateFormValue，没有该守卫）——
      //       这正是用户报障「只有顶部按钮有效」的原因。
      //   ⇒ 这里把同名后缀键一并带出（仅当 payload 里确实存在该键）。
      if (f.multiLang) {
        for (const lang of LANGS) {
          if (lang === "zh") continue;
          const key = f.name + ML_SUFFIX[LANGS.indexOf(lang)];
          if (key in fields) out[key] = toFormValue(f, fields[key] ?? "");
        }
      }
    }
  }
  /**
   * 🔴 2026-09-20 修复：**SEO / GEO 字段不在 `cfg.fields` 里**（它们由 `enableSeo` 开关驱动，
   *   见 registry.ts 的 `enableSeo` 与 service.ts 的同名分支），因此上面这个循环永远带不到它们
   *   ⇒ 编辑页重新打开时「SEO 关键词 / 服务地区 / 服务城市」恒为空（owner 报障第 2 条）。
   *   这里按同一套多语言约定补齐：存在才带出，避免把模型没有的列写进提交体。
   */
  if (cfg.enableSeo) {
    for (const base of ["seoTitle", "seoDescription", "seoKeywords"]) {
      for (const key of getMultiLangKeys(base)) {
        if (key in (fields || {})) out[key] = fields[key] ?? "";
      }
    }
    for (const key of ["geoRegion", "geoCity"]) {
      if (key in (fields || {})) out[key] = fields[key] ?? "";
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
