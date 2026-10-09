/**
 * 通用内容架构 · 内容类型注册表（Content Type Registry）
 * =====================================================
 * 统一入口：新增内容栏目只需在这里注册一段 Schema，即可获得
 * 通用 CRUD API、后台动态管理页（列表/表单/翻译/SEO）、前台数据 API，
 * 多语言 / 图片压缩 / 权限 / SEO 等基础能力自动继承，无需各页面重复实现。
 *
 * 架构分层（见 docs 通用内容架构）：
 *   L1 本注册表（声明式 Schema）
 *   L2 lib/content-types/service.ts 通用 CRUD 引擎 + app/api(admin|public)/content/[type] 统一 API
 *   L3 app/admin/content/[type] 后台动态管理页
 *   L4 前台模板渲染（复杂类型走自定义扩展点）
 *
 * ⚠️ 约定：
 *  - model 必须是 Prisma delegate 名，且须同步加入 service.ts 的 DELEGATE_WHITELIST（安全白名单）。
 *  - 多语言字段（multiLang:true）自动展开 base/baseEn/baseJa/baseKo/baseFr/baseAr 六语种键。
 *  - 字段命名遵循 lib/admin-form.ts 的 LANGS 约定。
 */

import { MultiLangFieldConfig } from "@/lib/admin-form";

// ===== 字段类型（多语言字段复用 MultiLangFieldConfig，另扩单语类型）=====
export type ContentFieldKind =
  | MultiLangFieldConfig["kind"]
  | "image" // 图片上传（UrlUploadInput）
  | "video" // 视频 URL / 上传（UrlUploadInput accept=video/*）
  | "file" // 任意文件（PDF 等）URL / 上传（UrlUploadInput accept=application/pdf）
  | "gallery" // 图集（单语数组，多图 URL）
  | "frames360" // 360° 环拍（单语 JSON 对象 {template,totalFrames,startIndex}，走 ThreeSixtyUpload）
  | "boolean" // 开关
  | "number" // 数字
  | "select" // 下拉（静态 options）
  | "relation" // 关联下拉（动态选项，来自 relationModel 表，如 ProductTab/NewsCategory）
  | "datetime"; // 日期时间

export interface ContentField extends Omit<MultiLangFieldConfig, "kind"> {
  name: string;
  label: string;
  kind: ContentFieldKind;
  /** 是否多语言（true → 展开六语种键并由 MultiLangFormField 渲染） */
  multiLang?: boolean;
  /** 下拉选项（kind=select） */
  options?: { label: string; value: string }[];
  /** 关联字段（kind=relation）：目标 Prisma delegate 名，如 ProductTab / NewsCategory */
  relationModel?: string;
  /** 关联字段显示字段（如 name / nameEn），用于选项 label */
  relationLabelField?: string;
}

export interface ContentTypeConfig {
  /** 类型标识（URL 段，如 faq / case） */
  name: string;
  /** 中文名称 */
  label: string;
  /** Prisma delegate 名（必须加入 service.ts 白名单） */
  model: string;
  /** 字段配置（唯一 Schema 源） */
  fields: ContentField[];
  /** 列表页列定义 */
  listColumns: { key: string; label: string; width?: string }[];
  /** 主标题字段（列表主显示 / slug 生成来源） */
  titleField: string;
  /** 详情 slug 字段（无则该类型仅列表展示） */
  slugField?: string;
  /** 搜索字段 */
  searchFields?: string[];
  /** 默认排序 */
  sort?: { field: string; order: "asc" | "desc" };
  /** 是否有 SEO/GEO 配置区（SeoGeoConfig） */
  enableSeo?: boolean;
  /** 是否有 status 发布/草稿字段（列表默认过滤已发布） */
  enableStatus?: boolean;
}

// ===== 注册表存储 =====
const CONTENT_TYPES: Record<string, ContentTypeConfig> = {};

export function registerContentType(cfg: ContentTypeConfig) {
  CONTENT_TYPES[cfg.name] = cfg;
}

export function getContentType(name: string): ContentTypeConfig | undefined {
  return CONTENT_TYPES[name];
}

export function getAllContentTypes(): ContentTypeConfig[] {
  return Object.values(CONTENT_TYPES);
}

/** 多语言字段的完整键集合（含 zh 基础名） */
export function getMultiLangKeys(base: string): string[] {
  return ["", "En", "Ja", "Ko", "Fr", "Ar"].map((s) => base + s);
}

// ============================================================
// 内容类型注册
// ============================================================

// ---- 常见问题 FAQ（简单类型：无 slug / 无图片 / 无 SEO）----
registerContentType({
  name: "faq",
  label: "常见问题",
  model: "Faq",
  titleField: "question",
  fields: [
    { name: "question", label: "问题", kind: "text", multiLang: true, required: true, capitalize: true, placeholder: "常见问题标题", placeholderEn: "FAQ Question" },
    { name: "answer", label: "答案", kind: "richtext", multiLang: true, required: true, height: 300, placeholder: "完整解答内容...", placeholderEn: "Full answer..." },
    { name: "category", label: "分类", kind: "text", placeholder: "如：设备选型 / 技术原理 / 售后服务", placeholderEn: "e.g. Selection / Principle" },
    { name: "sortOrder", label: "排序", kind: "number" },
    { name: "status", label: "状态", kind: "select", options: [{ label: "发布", value: "published" }, { label: "草稿", value: "draft" }] },
  ],
  listColumns: [
    { key: "question", label: "问题" },
    { key: "category", label: "分类" },
    { key: "sortOrder", label: "排序" },
    { key: "status", label: "状态" },
  ],
  searchFields: ["question", "answer", "category"],
  sort: { field: "sortOrder", order: "asc" },
  enableStatus: true,
});

// ---- 成功案例 Case（中等复杂：slug / 图片 / 精选 / SEO）----
registerContentType({
  name: "case",
  label: "成功案例",
  model: "Case",
  titleField: "title",
  slugField: "slug",
  fields: [
    { name: "title", label: "案例标题", kind: "text", multiLang: true, required: true, capitalize: true, placeholder: "案例标题", placeholderEn: "Case Title" },
    { name: "slug", label: "Slug（URL 标识）", kind: "text", required: true, placeholder: "如：vcr-fittings", placeholderEn: "e.g. vcr-fittings" },
    { name: "industry", label: "所属行业", kind: "text", multiLang: true, placeholder: "如：半导体 / 珠宝 / 机械加工", placeholderEn: "e.g. Semiconductor" },
    { name: "client", label: "客户名称", kind: "text", multiLang: true, placeholder: "客户 / 品牌名称", placeholderEn: "Client name" },
    { name: "coverImage", label: "封面图", kind: "image" },
    { name: "video", label: "案例视频", kind: "video" },
    { name: "videoPoster", label: "视频封面图", kind: "image" },
    { name: "summary", label: "案例简介", kind: "textarea", multiLang: true, placeholder: "一句话简介（列表页展示）", placeholderEn: "One-line summary" },
    { name: "content", label: "案例详情", kind: "richtext", multiLang: true, height: 320, placeholder: "完整案例描述（背景、方案、成果）...", placeholderEn: "Full case story..." },
    { name: "caseDate", label: "案例日期", kind: "datetime" },
    { name: "featured", label: "精选展示", kind: "boolean" },
    { name: "sortOrder", label: "排序", kind: "number" },
    { name: "status", label: "状态", kind: "select", options: [{ label: "发布", value: "published" }, { label: "草稿", value: "draft" }] },
  ],
  listColumns: [
    { key: "title", label: "案例标题" },
    { key: "industry", label: "行业" },
    { key: "client", label: "客户" },
    { key: "featured", label: "精选" },
    { key: "status", label: "状态" },
  ],
  searchFields: ["title", "client", "industry"],
  sort: { field: "sortOrder", order: "asc" },
  enableSeo: true,
  enableStatus: true,
});

// ---- 产品 Product（复杂：relation 关联 + stringArray + SEO/状态，双轨并存扩展点=specs/images 数组）----
registerContentType({
  name: "products",
  label: "产品管理",
  model: "Product",
  titleField: "name",
  slugField: "slug",
  fields: [
    { name: "name", label: "产品名称", kind: "text", multiLang: true, required: true, capitalize: true, placeholder: "产品名称", placeholderEn: "Product Name" },
    /**
     * ⚠️ `model` 在库表里是 `String @db.VarChar(100)`（**NOT NULL、无默认值**），
     *   以前没标 `required` ⇒ 新建时留空会从提交体里消失，直接抛
     *   `Invalid prisma.product.create() invocation: … Argument 'model' is missing`（owner 2026-10-08 报障）。
     */
    { name: "model", label: "型号", kind: "text", required: true, placeholder: "如：ZW-10D", placeholderEn: "e.g. ZW-10D" },
    { name: "slug", label: "Slug（URL 标识）", kind: "text", required: true, placeholder: "如：zw-10d", placeholderEn: "e.g. zw-10d" },
    { name: "tabId", label: "所属产品线（Tab）", kind: "relation", relationModel: "ProductTab", relationLabelField: "name", required: true },
    { name: "categoryId", label: "所属分类", kind: "relation", relationModel: "ProductCategory", relationLabelField: "name" },
    { name: "subtitle", label: "副标题", kind: "text", multiLang: true, placeholder: "一句话定位", placeholderEn: "Tagline" },
    { name: "summary", label: "简介", kind: "textarea", multiLang: true, placeholder: "列表页一句话简介", placeholderEn: "One-line summary" },
    { name: "description", label: "详细描述", kind: "richtext", multiLang: true, height: 320, placeholder: "产品详细介绍（富文本）...", placeholderEn: "Full description..." },
    { name: "features", label: "核心特性", kind: "stringArray", multiLang: true, addButtonText: "添加特性", itemLabel: "特性" },
    { name: "coverImage", label: "封面图", kind: "image" },
    // 产品图集（单语数组，多图 URL）—— 详情页主图优先取 images[0]，
    // 为空时才回退 coverImage（见 app/products/[tab]/[id]/ProductDetailClient.tsx 第 56 行）。
    // ⚠️ 此前该字段未登记 ⇒ sanitizeData 按白名单裁剪会把提交的 images 静默丢弃，
    //    导致后台改不动图集（ContentTypeForm 已渲染图集编辑器并提交 images）（2026-09-15 修复）。
    { name: "images", label: "产品图集", kind: "gallery" },
    // 360° 环拍（单语 JSON 对象 {template,totalFrames,startIndex}）。
    // ⚠️ 此前同样未登记 ⇒ 提交的 frames360 会被 sanitizeData 静默丢弃。
    //    本仓补充说明：ContentTypeForm 尚未接入 ThreeSixtyUpload（该组件当前仅被
    //    _archive/admin-legacy 引用），故后台暂无 360° 编辑入口；此处先补齐白名单，
    //    前台 app/products/[tab]/[id]/ProductDetailClient.tsx 会读取该字段渲染 360° 视图。
    { name: "frames360", label: "360°环拍", kind: "frames360" },
    /**
     * 🔴 owner 2026-10-09（产品详情页「下载产品手册」）：「这个功能在后台产品详情页没有看到编辑入口，查一下哪里去了？」
     *   根因：库表有 `Product.manualUrl`（详情页 `model.manualUrl || DEFAULT_MANUAL_URL` 在用），
     *   但**迁移到通用内容架构时没登记进本表** ⇒ 后台不渲染该字段、`sanitizeData()` 白名单还会**静默丢弃**提交
     *   （与 `images` / `frames360` 此前那两次是同一类问题，当时只修了那两个）。
     *   现补登记：可上传 PDF 或填 URL；留空则前台回退到站点默认手册（阀门站是 valtrix-product-catalog-2026.pdf）。
     */
    {
      name: "manualUrl",
      label: "产品手册 PDF",
      kind: "file",
      placeholder: "留空 ⇒ **前台按钮置灰**（不再回退站点默认手册，owner 2026-10-09）",
      placeholderEn: "Empty ⇒ the front-end button is greyed out (no site-default fallback).",
    },
    /**
     * 同理补登记：详情页会渲染 `model.video`（`<video src={model.video}>`），此前同样改不了。
     * 前台位置：产品名/型号/简介**下方**、紧接着「下载产品手册」按钮**上方**（留空则整块不显示）。
     */
    { name: "video", label: "产品视频", kind: "video", placeholder: "前台位置：产品名 / 型号 / 简介 下方、「下载产品手册」按钮上方；留空则不显示" },
    { name: "price", label: "参考价（元）", kind: "number", placeholder: "仅用于价格显示策略", placeholderEn: "Reference price" },
    { name: "priceTiers", label: "阶梯价（批量优惠）", kind: "jsonArray", jsonFields: [{ key: "qty", label: "起订量" }, { key: "price", label: "单价（元）" }], placeholder: "[{\"qty\":10,\"price\":1000}]" },
    { name: "isParts", label: "配件产品", kind: "boolean" },
    { name: "sortOrder", label: "排序", kind: "number" },
    { name: "status", label: "状态", kind: "select", options: [{ label: "发布", value: "published" }, { label: "草稿", value: "draft" }] },
    { name: "publishedAt", label: "发布时间", kind: "datetime" },
  ],
  listColumns: [
    { key: "name", label: "产品名称" },
    { key: "model", label: "型号" },
    { key: "tabId", label: "产品线", width: "120px" },
    { key: "categoryId", label: "产品分类", width: "140px" },
    { key: "subtitle", label: "副标题", width: "200px" },
    { key: "price", label: "参考价", width: "100px" },
    { key: "isParts", label: "配件", width: "70px" },
    { key: "publishedAt", label: "发布时间", width: "130px" },
    { key: "updatedAt", label: "更新时间", width: "130px" },
    { key: "sortOrder", label: "排序", width: "70px" },
    { key: "status", label: "状态", width: "80px" },
  ],
  searchFields: ["name", "model"],
  sort: { field: "sortOrder", order: "asc" },
  enableSeo: true,
  enableStatus: true,
});

// ---- 新闻 News（relation 分类 + 图片 + 布尔 + SEO/状态）----
registerContentType({
  name: "news",
  label: "新闻管理",
  model: "News",
  titleField: "title",
  slugField: "slug",
  fields: [
    { name: "title", label: "标题", kind: "text", multiLang: true, required: true, capitalize: true, placeholder: "新闻标题", placeholderEn: "News Title" },
    { name: "slug", label: "Slug（URL 标识）", kind: "text", required: true, placeholder: "如：company-news", placeholderEn: "e.g. company-news" },
    { name: "categoryId", label: "所属分类", kind: "relation", relationModel: "NewsCategory", relationLabelField: "name" },
    { name: "summary", label: "摘要", kind: "textarea", multiLang: true, placeholder: "列表页摘要", placeholderEn: "Summary" },
    { name: "content", label: "正文", kind: "richtext", multiLang: true, height: 360, placeholder: "新闻正文（富文本）...", placeholderEn: "Full content..." },
    { name: "coverImage", label: "封面图", kind: "image" },
    { name: "author", label: "作者", kind: "text", placeholder: "作者", placeholderEn: "Author" },
    { name: "source", label: "来源", kind: "text", placeholder: "来源名称", placeholderEn: "Source" },
    { name: "sourceUrl", label: "来源链接", kind: "text", placeholder: "https://...", placeholderEn: "https://..." },
    { name: "isFeatured", label: "精选推荐", kind: "boolean" },
    { name: "isTop", label: "置顶", kind: "boolean" },
    { name: "publishedAt", label: "发布时间", kind: "datetime" },
    { name: "status", label: "状态", kind: "select", options: [{ label: "发布", value: "published" }, { label: "草稿", value: "draft" }, { label: "下线", value: "offline" }] },
  ],
  listColumns: [
    { key: "title", label: "标题" },
    { key: "publishedAt", label: "发布时间" },
    { key: "isFeatured", label: "精选" },
    { key: "status", label: "状态" },
  ],
  searchFields: ["title", "summary"],
  sort: { field: "publishedAt", order: "desc" },
  enableSeo: true,
  enableStatus: true,
});

// ---- 服务 Service（jsonArray 特性/流程 + 图标 + SEO/状态）----
registerContentType({
  name: "services",
  label: "服务内容",
  model: "Service",
  titleField: "title",
  slugField: "slug",
  fields: [
    { name: "title", label: "服务标题", kind: "text", multiLang: true, required: true, capitalize: true, placeholder: "服务标题", placeholderEn: "Service Title" },
    { name: "slug", label: "Slug（URL 标识）", kind: "text", required: true, placeholder: "如：odm", placeholderEn: "e.g. odm" },
    { name: "subtitle", label: "副标题", kind: "text", multiLang: true, placeholder: "一句话定位", placeholderEn: "Tagline" },
    { name: "description", label: "服务详情", kind: "richtext", multiLang: true, height: 320, placeholder: "服务介绍（富文本）...", placeholderEn: "Full description..." },
    { name: "features", label: "服务能力", kind: "jsonArray", multiLang: true, jsonFields: [{ key: "title", label: "标题" }, { key: "desc", label: "描述" }], addButtonText: "添加能力" },
    { name: "process", label: "服务流程", kind: "jsonArray", multiLang: true, jsonFields: [{ key: "step", label: "步骤" }, { key: "title", label: "标题" }, { key: "desc", label: "描述" }], addButtonText: "添加步骤" },
    { name: "icon", label: "图标", kind: "text", placeholder: "图标标识", placeholderEn: "Icon key" },
    { name: "sortOrder", label: "排序", kind: "number" },
    { name: "status", label: "状态", kind: "select", options: [{ label: "发布", value: "published" }, { label: "草稿", value: "draft" }] },
  ],
  listColumns: [
    { key: "title", label: "服务标题" },
    { key: "sortOrder", label: "排序" },
    { key: "status", label: "状态" },
  ],
  searchFields: ["title", "description"],
  sort: { field: "sortOrder", order: "asc" },
  enableSeo: true,
  enableStatus: true,
});

// ---- 行业方案 Industry（stringArray 挑战 + jsonArray 方案 + 图片 + SEO/状态）----
registerContentType({
  name: "industries",
  label: "行业方案",
  model: "Industry",
  titleField: "name",
  slugField: "slug",
  fields: [
    { name: "name", label: "行业名称", kind: "text", multiLang: true, required: true, capitalize: true, placeholder: "行业名称", placeholderEn: "Industry Name" },
    { name: "slug", label: "Slug（URL 标识）", kind: "text", required: true, placeholder: "如：semiconductor", placeholderEn: "e.g. semiconductor" },
    { name: "tagline", label: "口号", kind: "text", multiLang: true, placeholder: "一句话定位", placeholderEn: "Tagline" },
    { name: "description", label: "行业详情", kind: "richtext", multiLang: true, height: 320, placeholder: "行业介绍（富文本）...", placeholderEn: "Full description..." },
    { name: "challenges", label: "行业挑战", kind: "stringArray", multiLang: true, addButtonText: "添加挑战", itemLabel: "挑战" },
    { name: "solutions", label: "解决方案", kind: "jsonArray", multiLang: true, jsonFields: [{ key: "title", label: "标题" }, { key: "desc", label: "描述" }], addButtonText: "添加方案" },
    { name: "image", label: "行业图片", kind: "image" },
    { name: "icon", label: "图标", kind: "text", placeholder: "图标标识", placeholderEn: "Icon key" },
    { name: "sortOrder", label: "排序", kind: "number" },
    { name: "status", label: "状态", kind: "select", options: [{ label: "发布", value: "published" }, { label: "草稿", value: "draft" }] },
  ],
  listColumns: [
    { key: "name", label: "行业名称" },
    { key: "sortOrder", label: "排序" },
    { key: "status", label: "状态" },
  ],
  searchFields: ["name", "description"],
  sort: { field: "sortOrder", order: "asc" },
  enableSeo: true,
  enableStatus: true,
});
