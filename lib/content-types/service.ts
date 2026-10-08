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
import { LANGS, LANG_LABELS, langFieldName } from "@/lib/admin-form";
import { adminListFilter, adminCreateSiteId } from "@/lib/tenant/admin-scope";
import fs from "node:fs";
import path from "node:path";

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
 * 日期时间字段归一化（kind === "datetime"）
 * ---------------------------------------------------------------------------
 * 为什么必须有（2026-09-20 owner 报障「编辑产品保存报错」）：
 *   后台表单的日期字段是 `<input type="date">`，提交的是 **`YYYY-MM-DD`**；
 *   本函数之前对非 relation 字段**原样透传**给 Prisma，而 Prisma 的 DateTime 只接受
 *   ISO-8601 完整时间 ⇒ 直接抛
 *     `Invalid value for argument publishedAt: premature end of input. Expected ISO-8601 DateTime.`
 *   （空字符串 `""` 同理会被拒）。受影响的是**所有 kind=datetime 的字段**：
 *   产品/新闻 `publishedAt`、案例 `caseDate` 等。
 *
 * 口径：
 *   · `""` / null / undefined → `null`（表单允许清空；Prisma 里是可选字段）
 *   · `Date` → 原样
 *   · `YYYY-MM-DD` → 当天 UTC 00:00（`new Date("2026-09-20")` 的既有语义，不引入时区漂移）
 *   · 其他可解析字符串（ISO 等）→ 原样解析，**保留时分秒**
 *   · 解析不出来 → **抛明确错误**（接口返回 400 带中文原因），绝不静默写坏数据
 */
export function normalizeDateTime(v: any): Date | null {
  if (v === "" || v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`日期时间格式不正确：${s}（应为 YYYY-MM-DD 或 ISO-8601，例如 2026-09-20）`);
  }
  return d;
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

/**
 * 数据库 VarChar 长度上限（模型 → 列 → 上限）
 * ---------------------------------------------------------------------------
 * 为什么要有（2026-09-20 owner 报障「编辑产品保存报错」第二轮）：
 *   修好日期格式后，同一次保存又抛
 *     `The provided value for the column is too long for the column's type. Column: (not available)`
 *   —— 那条产品的**法文副标题 384 字**，而 `products.subtitleFr` 是 `VarChar(300)`
 *   （同一句中文副标题翻成法文/阿拉伯文会膨胀 3~4 倍）。Prisma 这条错误**不说是哪个字段**
 *   （Column: not available），后台只看到一句无从下手的英文。
 *
 * 口径：上限**从 `prisma/schema.prisma` 现场读**（模块级缓存）—— 不在这里再抄一份，
 *   抄一份就是第二个真源，schema 一改必然漂移。读不到该文件（个别构建产物里可能没有）
 *   就**跳过校验**，退回原行为：校验器自身出问题绝不拦下正常保存。
 */
let VARCHAR_LIMITS: Record<string, Record<string, number>> | null = null;

function loadVarcharLimits(): Record<string, Record<string, number>> {
  const maps: Record<string, Record<string, number>> = {};
  try {
    const src = fs.readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
    let cur = "";
    for (const line of src.split(/\r?\n/)) {
      const m = /^model\s+(\w+)\s*\{/.exec(line);
      if (m) { cur = m[1]; maps[cur] = {}; continue; }
      if (/^\}/.test(line)) { cur = ""; continue; }
      if (!cur) continue;
      const f = /^\s{2}(\w+)\s+String\??\s+.*@db\.VarChar\((\d+)\)/.exec(line);
      if (f) maps[cur][f[1]] = Number(f[2]);
    }
  } catch {
    return {};
  }
  return maps;
}

function modelLimits(model: string): Record<string, number> {
  if (!VARCHAR_LIMITS) VARCHAR_LIMITS = loadVarcharLimits();
  return VARCHAR_LIMITS[model] || {};
}

/**
 * 供后台表单使用：某个模型各列 VarChar 上限（`{ name:200, subtitleFr:500, … }`）。
 * 经 `/api/admin/content/[type]/meta` 下发到编辑页，用于输入框旁的「已用 x / 上限 y」提示
 * 与 `maxLength` 硬限制 —— 让用户在**输入时**就知道，而不是保存后才被拒。
 */
export function modelVarcharLimits(model: string): Record<string, number> {
  return modelLimits(model);
}

/** 把展开后的列名还原成「字段label（语种）」，例如 subtitleFr → 副标题（法文） */
const SEO_FIELD_LABELS: Record<string, string> = {
  seoTitle: "SEO 标题", seoDescription: "SEO 描述", seoKeywords: "SEO 关键词",
  geoRegion: "服务地区（GEO）", geoCity: "服务城市（GEO）",
};

function fieldLabelOf(cfg: ContentTypeConfig, key: string): string {
  for (const lang of LANGS) {
    if (lang === "zh") continue;
    const suffix = langFieldName("", lang); // "" + 语言后缀，如 "Fr"
    if (suffix && key.endsWith(suffix)) {
      const base = key.slice(0, -suffix.length);
      const f = cfg.fields.find((x) => x.name === base);
      if (f) return `${f.label}（${LANG_LABELS[lang]}）`;
      if (SEO_FIELD_LABELS[base]) return `${SEO_FIELD_LABELS[base]}（${LANG_LABELS[lang]}）`;
    }
  }
  return cfg.fields.find((x) => x.name === key)?.label || SEO_FIELD_LABELS[key] || key;
}

/**
 * 长度校验：超限就抛**可读的中文**错误（接口原样返回给后台页面）。
 * 只校验字符串；`Text`/`Json` 列不在上限表里，天然跳过。
 */
function assertFieldLengths(cfg: ContentTypeConfig, out: Record<string, any>): void {
  const limits = modelLimits(cfg.model);
  const over: string[] = [];
  for (const [k, v] of Object.entries(out)) {
    const max = limits[k];
    if (!max || typeof v !== "string") continue;
    if (v.length > max) over.push(`「${fieldLabelOf(cfg, k)}」${v.length} 字，上限 ${max} 字`);
  }
  if (over.length) {
    throw new Error(`以下字段超出数据库长度上限，请精简后保存：${over.join("；")}`);
  }
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
    } else if (f.kind === "datetime") {
      // 日期时间字段：表单给的是 YYYY-MM-DD，Prisma 要 ISO-8601 DateTime ⇒ 归一化
      // （见 normalizeDateTime 顶部注释；空值清空为 null）
      if (f.name in data) out[f.name] = normalizeDateTime(data[f.name]);
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
  assertFieldLengths(cfg, out);
  return out;
}

/** 「空值」判定：undefined / null / 空串（数字 0、false、空数组都算**有值**） */
function isEmptyFieldValue(v: any): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

/**
 * 必填字段校验（**服务端兜底**，返回可读中文提示）
 * ==========================================================================
 * 背景（owner 2026-10-08 报障）：新建产品的表单只把"用户碰过的"非多语言字段写进提交体，
 *   而 `products.model` 是 `String @db.VarChar(100)`（NOT NULL、无默认值）⇒ 空着不填时
 *   字段**整个键都不出现**，Prisma 直接抛
 *   `Invalid prisma.product.create() invocation: { … } Argument 'model' is missing`
 *   —— 后台界面上只能看到这一串英文。
 *
 * 口径：
 *   · **create**：所有 `required` 字段必须齐（缺一个就拦，并列出字段中文名）；
 *   · **update**：只在"显式提交了空值"时拦 —— 提交体里没有该键视为"不改动"，
 *     避免编辑历史脏数据（早期可能存过空值）时被卡死。
 */
function assertRequiredFields(type: string, clean: Record<string, any>, mode: "create" | "update") {
  const cfg = getContentType(type);
  if (!cfg) return;
  const miss: string[] = [];
  for (const f of cfg.fields) {
    if (!f.required) continue;
    if (mode === "update" && !(f.name in clean)) continue;
    if (isEmptyFieldValue(clean[f.name])) miss.push(f.label);
  }
  if (miss.length) throw new Error(`请填写必填项：${miss.join("、")}`);
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
    // 必填校验：**在碰 Prisma 之前**拦下空值（否则抛的是英文 Prisma 报错）
    assertRequiredFields(type, clean, "create");
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
    // 必填校验（update 只在"显式提交空值"时拦，不改动历史脏数据）
    assertRequiredFields(type, clean, "update");
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
