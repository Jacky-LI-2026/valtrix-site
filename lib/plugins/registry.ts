/**
 * 通用内容架构 · 插件注册表（Plugin Registry）
 * =====================================================
 * 「能力插件化」：AI客服 / SEO / AI翻译 / 内容采集 / 邮件营销 / 统计 等能力
 * 统一登记为插件（manifest），后台「插件管理」统一启停与配置，实现模块化、无限扩展。
 *
 * 设计要点（升华）：
 *  1. 插件 = 可插拔能力单元：manifest（key/名称/版本/分类/权限/配置项/自带内容类型）
 *  2. 内置插件默认启用（能力已在系统内），关闭 = 隐藏对应入口/功能
 *  3. 新插件只需在此登记一段 manifest + 实现能力，后台自动出现管理入口
 *  4. 与内容模型打通：插件可自带内容类型（configFields / 依赖字段），见 content-types 插件
 *
 * ⚠️ 约定：
 *  - key 唯一，小写连字符；启用状态/配置存 site_config.plugin_state（Json）
 *  - configFields 用于后台插件配置弹窗自动渲染
 *  - permissions 为权限声明（human-readable，供展示与校验）
 */

export type PluginCategory =
  | "ai"           // 人工智能（客服/翻译/生成）
  | "seo"          // SEO 与增长
  | "content"      // 内容与采集
  | "marketing"    // 营销与商机
  | "data"         // 数据与统计
  | "system"       // 系统与安全
  | "integration"; // 第三方集成

export interface PluginConfigField {
  key: string;
  label: string;
  type: "text" | "textarea" | "password" | "boolean" | "select" | "number";
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface PluginManifest {
  /** 唯一标识（小写连字符） */
  key: string;
  /** 中文名称 */
  name: string;
  /** 简介 */
  description: string;
  category: PluginCategory;
  version: string;
  /** 是否内置（内置不可卸载，仅可启停） */
  builtin: boolean;
  /** 默认启用 */
  defaultEnabled: boolean;
  /** 是否需要配置 */
  configurable: boolean;
  /** 配置项 schema（后台弹窗渲染） */
  configFields?: PluginConfigField[];
  /** 权限/能力声明 */
  permissions?: string[];
  /** 关联的后台入口（用于跳转配置页） */
  adminUrl?: string;
  /** 多个管理入口（优先于 adminUrl 渲染；label=按钮文案） */
  adminUrls?: { label: string; href: string }[];
  /** 是否规划中（能力市场占位，功能未实现，禁用启停） */
  planned?: boolean;
  /** 内容栏目型插件（通用内容模型的衍生栏目）：能力市场不独立展示为卡片 */
  isContentSection?: boolean;
  /** 通用内容模型插件的衍生栏目列表 */
  sections?: { label: string; href: string }[];
  // ===== 插件市场（自阀门站回流至通用基地，双 fork 合并 D2）=====
  // features / impact 为阀门站接口的**必填**字段，已在全部内置 manifest 中逐条补齐
  // （双 fork 合并 D2：由可选收紧为必填，与阀门站接口完全对齐）。
  /** 功能点列表（后台插件卡片展示） */
  features: string[];
  /** 启用影响说明（后台插件卡片展示，说明对前台/后台的影响） */
  impact: string;
  /** 依赖的其他插件 key 列表（依赖声明，供插件卡片展示与联动校验） */
  dependencies?: string[];
  /** 市场价（元/一次性授权）；0 或未定义 = 免费 */
  price?: number;
  /** 是否付费插件（付费插件需兑换码开通后才能启停） */
  paid?: boolean;
  /** 是否在插件市场展示（默认 true；false 时市场目录不展示该条目） */
  market?: boolean;
  /** 市场来源标记：builtin=内置（随系统分发）；remote=远程市场条目 */
  marketSource?: "remote" | "builtin";
  /**
   * 侧边栏归属分组（**可选覆盖**；不写则按 `category` 推导，见 `resolvePluginMenuGroup`）。
   *
   * 为什么需要它：`category` 是"能力领域"（marketing/ai/…），而侧边栏要的是"用户去哪找"。
   *   多数情况下两者一致（ai→AI 能力、data→数据与统计），但有些插件按 category 归组会反直觉
   *   —— 例如「在线商城 / 会员中心 / 询价报价」的 category 都是 `marketing`，但它们属于业务功能，
   *   放进"营销与线索"会让用户找不到。这类少数情况用本字段显式覆盖。
   */
  menuGroup?: PluginMenuGroup;
  /** 同组内排序（小在前；不写则排在末尾） */
  menuOrder?: number;
}

/**
 * 侧边栏分组键（与 `AdminSidebar.tsx` 的顶层分组一一对应）。
 * 2026-09-18 新增：插件菜单不再"全部塞进能力市场"，而是按分组归位。
 */
export type PluginMenuGroup =
  | "content"    // 内容管理
  | "business"   // 业务运营（商城/会员/报价/预约…）
  | "marketing"  // 营销与线索
  | "data"       // 数据与统计
  | "ai"         // AI 能力
  | "site"       // 站点设置
  | "ops";       // 系统运维

/** category → 默认分组（个别插件用 manifest.menuGroup 覆盖） */
const CATEGORY_TO_MENU_GROUP: Record<PluginCategory, PluginMenuGroup> = {
  ai: "ai",
  data: "data",
  marketing: "marketing",
  seo: "marketing",
  content: "content",
  integration: "site",
  system: "site",
};

/**
 * 解析插件应出现在侧边栏的哪个分组。
 * 优先级：`manifest.menuGroup` 显式覆盖 → `category` 推导 → 兜底 `site`。
 */
export function resolvePluginMenuGroup(p: { category?: PluginCategory; menuGroup?: PluginMenuGroup }): PluginMenuGroup {
  if (p.menuGroup) return p.menuGroup;
  const c = p.category as PluginCategory | undefined;
  if (c && CATEGORY_TO_MENU_GROUP[c]) return CATEGORY_TO_MENU_GROUP[c];
  return "site";
}

export const PLUGIN_CATEGORY_LABELS: Record<PluginCategory, string> = {
  ai: "人工智能",
  seo: "SEO 与增长",
  content: "内容与采集",
  marketing: "营销与商机",
  data: "数据与统计",
  system: "系统与安全",
  integration: "第三方集成",
};

export const BUILTIN_PLUGINS: PluginManifest[] = [
  {
    key: "content-types",
    name: "通用内容模型",
    description: "可视化定义内容栏目（字段/多语言/SEO），新栏目无需改代码。插件自带内容类型能力（content_type_defs / dynamic_contents）。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["可视化定义内容栏目与字段", "栏目级多语言与 SEO 配置", "通用增删改查与前台渲染"],
    impact: "启用后可在后台创建自定义内容栏目，前台自动生成对应列表页与详情页",
    permissions: ["内容类型增删改", "通用 CRUD", "前台通用渲染"],
    adminUrl: "/admin/content-types",
    sections: [
      { label: "产品管理", href: "/admin/content/products" },
      { label: "新闻管理", href: "/admin/content/news" },
      { label: "资源管理", href: "/admin/resources" },
      { label: "行业方案", href: "/admin/content/industries" },
      { label: "服务内容", href: "/admin/content/services" },
      { label: "成功案例", href: "/admin/content/case" },
      { label: "常见问题", href: "/admin/content/faq" },
      { label: "招聘职位", href: "/admin/careers" },
      { label: "关于我们", href: "/admin/about" },
      { label: "菜单管理", href: "/admin/menus" },
      { label: "内容类型管理", href: "/admin/content-types" },
    ],
  },
  {
    key: "ai-customer-service",
    name: "AI 智能客服",
    description: "前台在线客服（多语言欢迎语/知识库问答/转人工留资/人机验证）。关闭后前台悬浮客服按钮隐藏。",
    category: "ai",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: true,
    features: ["前台悬浮客服浮窗", "知识库 RAG 问答", "转人工留资收集", "多语言欢迎语", "人机验证防刷"],
    impact: "启用后前台右下角显示 AI 客服浮窗；停用后前台客服入口隐藏",
    permissions: ["前台客服组件", "知识库问答", "留资收集", "人机验证"],
    adminUrls: [
      { label: "AI 客服设置", href: "/admin/settings/ai" },
      { label: "知识库管理", href: "/admin/ai-knowledge" },
    ],
  },
  {
    key: "ai-translate",
    name: "AI 多语言翻译",
    description: "全站内容一键翻译（DeepSeek / 百度 / 小牛 / MyMemory 多通道），批量翻译、自动翻译、翻译优先级。",
    category: "ai",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: true,
    features: ["全站内容一键批量翻译", "编辑时自动翻译", "DeepSeek/百度/小牛多通道", "翻译优先级与语种控制"],
    impact: "启用后后台内容表单出现翻译按钮与批量翻译入口；仅后台使用，不影响前台展示",
    permissions: ["批量翻译", "自动翻译", "翻译通道配置"],
    adminUrls: [
      { label: "批量翻译", href: "/admin/translate-batch" },
      { label: "翻译配置", href: "/admin/settings/translate" },
    ],
  },
  {
    key: "seo",
    name: "SEO / GEO 优化",
    menuGroup: "site",
    description: "全站 SEO 配置、结构化数据、百度站长主动推送、多语言 hreflang、外链回链管理。",
    category: "seo",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: true,
    features: ["SEO meta 标题/描述/关键词编辑", "GEO 地区定位配置", "结构化数据自动生成", "百度站长主动推送", "多语言 hreflang 与 sitemap"],
    impact: "启用后站点设置出现「SEO 优化」入口；停用后前台停止输出 SEO 标签与 sitemap",
    permissions: ["SEO/GEO 配置", "百度收录推送", "外链回链", "sitemap/hreflang"],
    adminUrl: "/admin/settings/seo",
  },
  {
    key: "content-collector",
    name: "内容采集",
    description: "从指定网站自动采集新闻/内容（配置 + 定时任务 + 去重入库）。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: true,
    features: ["指定网站自动采集", "定时采集任务", "内容自动去重入库"],
    impact: "启用后后台出现「内容采集」入口；采集内容入库后按普通内容管理，不直接改变前台布局",
    permissions: ["采集配置", "定时采集任务"],
    adminUrls: [
      { label: "采集配置", href: "/admin/collection" },
      { label: "自动采集任务", href: "/admin/auto-collection-tasks" },
    ],
  },
  // ===== 内容模块插件族（每个内容栏目一个插件：停用 → 侧边栏隐藏对应入口）=====
  {
    key: "content-product",
    name: "产品管理",
    description: "产品栏目：产品线/分类/型号/规格/多语言/SEO。停用后侧边栏隐藏「产品管理」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["产品线/分类/型号管理", "产品规格参数维护", "产品多语言与 SEO", "产品图片与资料管理"],
    impact: "启用后侧边栏显示「产品管理」入口与前台产品栏目；停用后前台产品页与导航入口隐藏",
    permissions: ["产品增删改"],
    isContentSection: true,
    adminUrl: "/admin/content/products",
  },
  {
    key: "content-news",
    name: "新闻管理",
    description: "新闻/公告栏目：分类/多语言/SEO。停用后侧边栏隐藏「新闻管理」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["新闻/公告发布", "新闻分类管理", "多语言与 SEO"],
    impact: "启用后侧边栏显示「新闻管理」入口；停用后前台新闻栏目隐藏",
    permissions: ["新闻增删改"],
    isContentSection: true,
    adminUrl: "/admin/content/news",
  },
  {
    key: "content-resource",
    name: "资源管理",
    description: "资源/下载栏目：分类/下载/多语言。停用后侧边栏隐藏「资源管理」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["资料/手册上传管理", "资源分类与下载", "多语言标题与描述"],
    impact: "启用后侧边栏显示「资源管理」入口；停用后前台资源下载栏目隐藏",
    permissions: ["资源增删改"],
    isContentSection: true,
    adminUrl: "/admin/resources",
  },
  {
    key: "content-industry",
    name: "行业方案",
    description: "应用行业/解决方案栏目。停用后侧边栏隐藏「行业方案」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["应用行业/解决方案发布", "行业方案多语言", "关联产品与案例"],
    impact: "启用后侧边栏显示「行业方案」入口；停用后前台行业方案栏目隐藏",
    permissions: ["行业增删改"],
    isContentSection: true,
    adminUrl: "/admin/content/industries",
  },
  {
    key: "content-service",
    name: "服务内容",
    description: "服务/产品服务栏目。停用后侧边栏隐藏「服务内容」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["服务项目发布", "服务流程与内容管理", "多语言支持"],
    impact: "启用后侧边栏显示「服务内容」入口；停用后前台服务栏目隐藏",
    permissions: ["服务增删改"],
    isContentSection: true,
    adminUrl: "/admin/content/services",
  },
  {
    key: "content-case",
    name: "成功案例",
    description: "成功案例/客户案例栏目。停用后侧边栏隐藏「成功案例」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["客户案例发布", "案例图文详情", "多语言支持"],
    impact: "启用后侧边栏显示「成功案例」入口；停用后前台案例栏目隐藏",
    permissions: ["案例增删改"],
    isContentSection: true,
    adminUrl: "/admin/content/case",
  },
  {
    key: "content-faq",
    name: "常见问题",
    description: "常见问题/FAQ 栏目。停用后侧边栏隐藏「常见问题」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["FAQ 问答维护", "分类与排序", "多语言支持"],
    impact: "启用后侧边栏显示「常见问题」入口；停用后前台 FAQ 栏目隐藏",
    permissions: ["FAQ 增删改"],
    isContentSection: true,
    adminUrl: "/admin/content/faq",
  },
  {
    key: "content-career",
    name: "招聘职位",
    description: "招聘职位栏目：岗位/福利/投递。停用后侧边栏隐藏「招聘职位」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["职位发布与下架", "岗位职责/任职要求编辑", "投递与简历收集"],
    impact: "启用后侧边栏显示「招聘职位」入口；停用后前台招聘栏目隐藏",
    permissions: ["招聘增删改"],
    isContentSection: true,
    adminUrl: "/admin/careers",
  },
  {
    key: "content-about",
    name: "关于我们",
    description: "关于我们/企业文化/发展历程/荣誉资质等子栏目。停用后侧边栏隐藏「关于我们」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["企业简介/文化编辑", "发展历程与荣誉资质", "多语言内容"],
    impact: "启用后侧边栏显示「关于我们」入口；停用后前台关于栏目隐藏",
    permissions: ["关于增删改"],
    isContentSection: true,
    adminUrl: "/admin/about",
  },
  {
    key: "content-menu",
    name: "菜单管理",
    description: "前台导航菜单管理。停用后侧边栏隐藏「菜单管理」入口。",
    category: "content",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["前台导航菜单增删改", "层级结构与排序", "多语言菜单名称"],
    impact: "启用后侧边栏显示「菜单管理」入口；停用后前台仍显示导航但后台无法编辑菜单",
    permissions: ["菜单管理"],
    isContentSection: true,
    adminUrl: "/admin/menus",
  },
  // ===== AI 能力插件族（全站功能可嵌入 AI 开关：文本 / 图像 / Chat / 翻译）=====
  {
    key: "ai-text",
    name: "AI 文本",
    description: "文本 AI：全站任意编辑器可嵌入「AI 生成/改写/润色」，内容自动创作、SEO 文案生成、批量改写。统一走 AI 能力网关（lib/ai/gateway.ts）。",
    category: "ai",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: true,
    features: ["编辑器内 AI 生成/改写/润色", "SEO 文案自动生成", "批量改写"],
    impact: "启用后后台各内容表单出现 AI 文本按钮；仅后台使用，不影响前台。配置并入「AI 设置」（/admin/settings/ai），本插件无独立管理页",
    adminUrl: "/admin/settings/ai",
    configFields: [
      { key: "provider", label: "文本模型服务商", type: "select", options: [{ label: "DeepSeek", value: "deepseek" }, { label: "OpenAI 兼容", value: "openai" }] },
      { key: "model", label: "模型名称", type: "text", placeholder: "deepseek-chat" },
      { key: "maxTokens", label: "单次最大 Token", type: "number", placeholder: "1200" },
      { key: "apiKey", label: "API 密钥（选填，留空自动回退读取翻译/AI 客服配置）", type: "text", placeholder: "sk-..." },
    ],
    permissions: ["AI 生成/改写", "SEO 文案", "批量改写"],
  },
  {
    key: "ai-image",
    name: "AI 图像",
    description: "图像 AI：语义 AI 生图（Pollinations 免费 / SiliconFlow 可选）+ 免费占位配图。内容表单图片字段旁「AI 配图」按钮一键生成。",
    category: "ai",
    version: "1.1.0",
    builtin: true,
    defaultEnabled: true,
    configurable: true,
    features: ["语义 AI 生图", "免费占位配图", "内容表单一键配图"],
    impact: "启用后内容表单图片字段旁出现「AI 配图」按钮；仅后台使用，不影响前台",
    configFields: [
      { key: "provider", label: "图像服务商", type: "select", options: [{ label: "Pollinations（免费）", value: "pollinations" }, { label: "SiliconFlow（需Key）", value: "siliconflow" }, { label: "免费占位图（picsum）", value: "picsum" }] },
      { key: "imageKey", label: "SiliconFlow API Key", type: "text", placeholder: "sk-..." },
    ],
    permissions: ["图像生成", "占位配图"],
  },
  {
    key: "ai-autopilot",
    dependencies: ["content-collector"],
    name: "AI 自动运营",
    description: "自动运营：流水线「草稿 → AI 补全 → AI 翻译 → 发布 → 搜索引擎推送」，内容类型草稿自动更新运营；可在后台一键运行一轮。",
    category: "ai",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: true,
    features: ["草稿自动补全", "自动翻译与发布", "自动推送搜索引擎"],
    impact: "启用后后台出现「AI 自动运营」入口，可按流水线批量发布内容；仅后台使用。依赖：内容采集(content-collector)插件",
    adminUrl: "/admin/ai-autopilot",
    configFields: [
      { key: "schedule", label: "运行频率", type: "select", options: [{ label: "手动运行", value: "manual" }, { label: "每天一次", value: "daily" }, { label: "每周一次", value: "weekly" }] },
      { key: "maxPerRun", label: "每轮最多发布", type: "number", placeholder: "5" },
    ],
    permissions: ["自动采集", "自动翻译", "自动发布", "SEO 推送"],
  },
  {
    key: "ai-site-wizard",
    name: "AI 建站向导",
    // 独立插件：不受 AI 自动运营(ai-autopilot)启停控制，自带独立管理页
    // （阶段 2 能力回流：自阀门站回流；/admin/ai-site-wizard 两仓均已存在，此前只缺 manifest 登记）
    description: "AI 建站向导：输入行业/关键词一键生成站点框架与内容初稿，辅助快速建站。独立插件，不受 AI 自动运营启停影响。",
    category: "ai",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["行业/关键词建站向导", "站点框架与内容初稿生成", "快速建站辅助"],
    impact: "启用后 AI 能力中心显示「AI 建站向导」入口；独立启停，与 AI 自动运营互不影响",
    adminUrl: "/admin/ai-site-wizard",
    permissions: ["建站向导"],
  },
  {
    key: "email-marketing",
    dependencies: ["smtp"],
    name: "EDM 邮件营销",
    description: "邮件订阅管理、营销邮件群发（基于 SMTP）。",
    category: "marketing",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["邮件订阅者管理", "营销邮件群发", "发送记录追踪"],
    impact: "启用后后台出现「EDM 邮件营销」入口；群发依赖 SMTP 配置，不影响前台",
    permissions: ["邮件群发", "订阅管理"],
    adminUrl: "/admin/email-marketing",
  },
  {
    key: "backlink",
    name: "外链营销",
    description: "外链台账 + AI 软文营销引擎：AI 生成第三方平台软文，编辑发布后追踪回链，配合 SEO 增长。",
    category: "seo",
    version: "1.1.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["外链台账管理", "AI 软文生成", "发布与回链追踪"],
    impact: "启用后后台出现「外链营销」入口；仅后台使用，不影响前台",
    permissions: ["外链管理", "回链统计", "软文营销"],
    adminUrls: [
      { label: "外链台账", href: "/admin/backlinks" },
      { label: "软文营销", href: "/admin/backlinks/posts" },
    ],
  },
  {
    key: "analytics",
    name: "数据统计",
    description: "访客统计、页面分析、销售漏斗、操作日志（系统管理）。",
    category: "data",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["访客统计", "销售漏斗", "访客热力图", "运营驾驶舱", "操作日志"],
    impact: "启用后后台出现数据统计系列入口；仅后台使用，不影响前台",
    permissions: ["访客统计", "销售漏斗", "操作日志"],
    adminUrls: [
      { label: "访客统计", href: "/admin/analytics" },
      { label: "销售漏斗", href: "/admin/funnel" },
      { label: "访客热力图", href: "/admin/heatmap" },
      { label: "运营驾驶舱", href: "/admin/operations" },
    ],
  },
  {
    key: "captcha",
    name: "验证码防刷",
    description: "所有前台提交类（留资/询价/留言/下载）的人机验证与频率防刷。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["人机图形验证", "提交频率防刷", "全前台表单保护"],
    impact: "启用后前台所有提交类表单带人机验证；停用后前台放开验证（有刷单风险）",
    permissions: ["人机验证", "频率防刷"],
  },
  {
    key: "smtp",
    name: "SMTP 邮件服务",
    description: "SMTP 配置、验证码邮件、留资通知、报价单发送（下载链接发邮箱等）。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: true,
    features: ["SMTP 服务器配置", "验证码邮件发送", "留资与报价单通知"],
    impact: "启用后站点设置出现「SMTP 邮件」入口；配置后前台下载验证码/留资通知邮件可真实送达",
    permissions: ["SMTP 配置", "邮件发送"],
    adminUrl: "/admin/settings/smtp",
  },
  {
    key: "lead",
    name: "询盘线索",
    description: "前台留言/询盘/表单线索统一管理，含联系方式/IP/国家城市，导出 CSV。",
    category: "marketing",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["前台留言/询盘统一收集", "IP/国家/城市识别", "线索导出 CSV", "线索统一归口管理"],
    impact: "启用后后台出现「询盘线索」入口；前台提交表单照常工作，线索在此统一查看。线索归口：/admin/leads 统一查看",
    permissions: ["询盘线索管理"],
    adminUrl: "/admin/leads",
  },
  {
    key: "quote",
    name: "询价报价",
    description: "询价车、附加项、报价单生成（中英双语 PDF / 含 LOGO）、后台审核后发邮箱。",
    category: "marketing",
    menuGroup: "business",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["前台询价车", "附加项选择", "中英双语报价单 PDF", "后台审核后发送", "线索统一归口管理"],
    impact: "启用后前台产品页出现「加入询价车」入口，后台可生成报价单；停用后询价车入口隐藏。线索归口：/admin/leads 统一查看",
    permissions: ["询价车", "报价单 PDF", "后台审核发送"],
    adminUrls: [
      { label: "报价询价单", href: "/admin/quotes" },
      { label: "报价单模板", href: "/admin/quotes/template" },
    ],
  },
  {
    key: "visit-booking",
    name: "考察预约",
    description: "前台参观考察预约（多语言日历）+ 后台预约管理。",
    category: "marketing",
    menuGroup: "business",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["前台参观预约表单", "多语言预约日历", "后台预约管理", "线索统一归口管理"],
    impact: "启用后前台联系页/导航出现考察预约入口；停用后预约入口隐藏。线索归口：/admin/leads 统一查看",
    permissions: ["前台预约", "预约管理"],
    adminUrl: "/admin/visit-bookings",
  },
  {
    key: "download-leads",
    name: "下载留资",
    description: "方案/手册下载需留资（邮箱验证码），下载链接发邮箱，后台留资管理与导出。",
    category: "marketing",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["下载需邮箱验证", "验证码发送与校验", "留资记录管理与导出", "线索统一归口管理"],
    impact: "启用后前台资源/手册下载需填写邮箱验证码；留资在后台统一管理，依赖 SMTP 配置。线索归口：/admin/leads 统一查看",
    permissions: ["下载留资", "留资导出"],
    adminUrl: "/admin/download-leads",
  },
  {
    key: "template",
    name: "模板管理",
    description: "站点模板登记与管理（默认模板 / 多模板切换预留）。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["默认模板与多模板登记", "预设模板一键切换", "行业数据包导入", "模板版本管理"],
    impact: "启用后站点设置出现「模板管理」入口；切换模板将改变前台整体版式",
    permissions: ["模板管理"],
    adminUrl: "/admin/templates",
  },
  // ===== 站点配置功能插件族（站点设置内的功能统一插件化：停用 → 侧边栏隐藏对应入口）=====
  {
    key: "site-config",
    name: "站点配置",
    description: "站点基础信息（名称/LOGO/域名/页脚/社交/SEO 默认值），与站点名称及商业授权关联。停用后侧边栏隐藏「站点配置」入口。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["站点名称/LOGO/域名", "页脚与社交链接", "SEO 默认值", "客户分类/定价显示"],
    impact: "启用后站点设置出现「站点配置」入口；配置项直接影响前台头部/页脚展示",
    permissions: ["站点配置"],
    adminUrl: "/admin/settings/site",
  },
  {
    key: "home-config",
    name: "首页配置",
    description: "首页轮播/Banner、核心优势、数据统计、CTA、SEO 等首页区块内容管理。停用后侧边栏隐藏「首页配置」入口。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["首页轮播/Banner 内容", "核心优势与数据统计", "首页区块显示启停", "区块展示顺序调整", "首页 SEO 配置"],
    impact: "启用后站点设置出现「首页配置」入口；配置与区块启停直接影响前台首页渲染",
    permissions: ["首页配置"],
    adminUrl: "/admin/settings/home",
  },
  {
    key: "page-hero",
    name: "页面头部设置",
    description: "各栏目/详情页头部 Banner（图片/颜色/渐变/透明度/文字）统一管理。停用后侧边栏隐藏「页面头部」入口。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["各栏目/详情页头部 Banner", "背景图/颜色/渐变", "透明度与文字覆盖"],
    impact: "启用后站点设置出现「页面头部」入口；配置直接影响前台各栏目页头部视觉",
    permissions: ["页面头部配置"],
    adminUrl: "/admin/page-hero",
  },
  {
    key: "theme",
    name: "主题配色",
    description: "前台主题颜色/风格自定义。停用后侧边栏隐藏「主题配色」入口。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["主题主色/强调色", "页面风格切换", "品牌视觉统一"],
    impact: "启用后站点设置出现「主题配色」入口；配色变更直接作用于前台全站样式",
    permissions: ["主题配色"],
    adminUrl: "/admin/settings/theme",
  },
  {
    key: "language",
    name: "语种管理",
    description: "站点多语言启停（zh/en/ja/ko/fr/ar）。停用后侧边栏隐藏「语种管理」入口。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["多语种启停（zh/en/ja/ko/fr/ar）", "语种排序与默认语种", "前台语言切换器"],
    impact: "启用后站点设置出现「语种管理」入口；停用语种后前台语言切换器不再显示该语种",
    permissions: ["语种管理"],
    adminUrl: "/admin/languages",
  },
  // ===== 能力市场（部分已转正）：登记能力插件，member 已实现（2026-09-05）=====
  {
    key: "member",
    name: "会员中心",
    description: "前台会员注册/登录、个人中心、产品收藏、会员管理（独立 HMAC token，与后台管理员隔离）。",
    category: "marketing",
    menuGroup: "business",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    planned: false,
    configurable: true,
    features: ["前台会员注册/登录", "个人中心与资料", "产品收藏", "会员等级与权益"],
    impact: "启用后前台导航出现「会员中心」入口；停用后会员相关入口隐藏",
    adminUrls: [
      { label: "会员中心", href: "/admin/members" },
      { label: "等级与权益", href: "/admin/member-levels" },
    ],
    configFields: [
      { key: "allowRegister", label: "开放注册", type: "boolean" },
      { key: "verifyType", label: "注册验证方式", type: "select", options: [{ label: "邮箱验证码", value: "email" }, { label: "手机验证码", value: "sms" }, { label: "无验证", value: "none" }] },
    ],
    permissions: ["注册/登录", "个人中心", "会员分级"],
  },
  {
  key: "mall",
  dependencies: ["member"],
  name: "在线商城",
  description: "商品/购物车/订单/支付（线下转账/对公/微信/支付宝），可与询价报价并存。",
  category: "marketing",
  menuGroup: "business",
  version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    planned: false,
    configurable: true,
    features: ["商品管理", "购物车与订单", "在线支付（线下/微信/支付宝）", "优惠券与销售统计"],
    impact: "启用后前台导航显示在线商城入口；停用后商城入口与购物车隐藏。依赖：会员中心(member)插件",
    configFields: [
      { key: "currency", label: "结算币种", type: "select", options: [{ label: "人民币 CNY", value: "CNY" }, { label: "美元 USD", value: "USD" }, { label: "欧元 EUR", value: "EUR" }] },
      { key: "enableWechat", label: "微信支付", type: "boolean" },
      { key: "enableAlipay", label: "支付宝", type: "boolean" },
    ],
    permissions: ["商品管理", "购物车/订单", "在线支付"],
    adminUrl: "/admin/shop",
    adminUrls: [
      { label: "商品管理", href: "/admin/shop" },
      { label: "商品分类", href: "/admin/shop/categories" },
      { label: "订单管理", href: "/admin/shop/orders" },
      { label: "销售统计", href: "/admin/shop/stats" },
      { label: "优惠券管理", href: "/admin/shop/coupons" },
    ],
  },
  {
    key: "frontend-theme",
    name: "前台模板市场",
    description: "多套前台模板（首页/列表/详情/配色）管理与一键切换，内置十套预设模板 + 行业数据包，支持自定义模板登记。",
    category: "integration",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    planned: false,
    configurable: true,
    features: ["多套前台模板一键切换", "预设模板与行业数据包", "模板登记与版本管理"],
    impact: "启用后站点设置出现「前台模板市场」入口（/admin/templates）；切换模板将改变前台首页/列表/详情整体版式与配色",
    adminUrl: "/admin/templates",
    permissions: ["模板下载", "模板切换"],
  },
  {
    key: "form-builder",
    name: "通用表单",
    description: "可视化创建自定义表单（字段/多语言/必填/选项），前台 /forms/标识 访问，提交自动入库并记录 IP/国家/城市，支持导出 CSV。",
    category: "marketing",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["可视化表单设计", "字段多语言/必填/选项", "提交记录入库与导出", "线索统一归口管理"],
    impact: "启用后前台可通过 /forms/标识 访问自定义表单；提交记录在后台统一管理。线索归口：/admin/leads 统一查看",
    permissions: ["表单定义增删改", "提交记录管理", "前台表单渲染"],
    adminUrl: "/admin/forms",
  },

  {
    key: "video-content",
    name: "视频内容",
    description: "通用内容模型视频字段：支持视频上传/外链，前台详情页内嵌播放器 + 封面海报。关闭后后台隐藏视频字段、前台不渲染播放器。",
    category: "content",
    version: "0.1.0",
    builtin: false,
    defaultEnabled: true,
    configurable: false,
    features: ["内容模型视频字段", "视频上传/外链", "前台播放器渲染"],
    impact: "启用后内容表单出现视频字段，前台详情页渲染播放器；停用后两者隐藏",
    permissions: ["视频上传", "播放器渲染"],
  },
  {
    key: "ai-video",
    name: "AI 视频生成",
    description: "输入文案/关键词，AI 生成产品宣传视频分镜脚本；接入豆包/Seedance 视频能力后可渲染成片，适配营销与社媒分发。",
    category: "ai",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: false,
    planned: false,
    configurable: true,
    features: ["文案/关键词生成分镜脚本", "营销视频创意", "接入豆包/Seedance 成片"],
    impact: "启用后后台出现「AI 视频生成」入口；当前仅生成脚本，成片需接入视频能力",
    adminUrl: "/admin/ai-video",
    permissions: ["文生视频", "图生视频"],
  },
  {
    key: "applet",
    name: "小程序 / APP 端",
    description: "一键生成微信小程序 / H5 App 壳：配置应用信息 + 下载开放接口对接文档，复用同一内容模型与接口。",
    category: "integration",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: false,
    planned: false,
    configurable: true,
    features: ["一键生成小程序/H5 壳", "应用信息配置", "开放接口对接"],
    impact: "启用后后台出现「小程序/APP」入口；生成的应用复用本站内容与接口，默认停用",
    adminUrl: "/admin/applet",
    permissions: ["小程序生成"],
  },
  {
    key: "multi-site",
    name: "多站点 / 多语言独立站",
    description: "一套后台管理多个独立站点（子域名），站点间数据/内容相互隔离（R1 已实现租户/站点基座，SaaS 多租户雏形）。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    planned: false,
    configurable: false,
    features: ["多站点/租户管理", "子域名解析", "站点间数据隔离"],
    impact: "启用后后台出现「多站点/租户」入口与站点视角切换器；不影响当前前台",
    adminUrl: "/admin/tenants",
    adminUrls: [
      { label: "租户管理", href: "/admin/tenants" },
      { label: "站点管理", href: "/admin/sites" },
    ],
    permissions: ["站点隔离", "子域名解析"],
  },
  {
    key: "white-label",
    name: "白标 OEM",
    description: "代理商/集成商以自有品牌交付本系统（品牌名/后台标题/登录LOGO/页脚版权/强调色），隐藏系统默认标识。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    planned: false,
    configurable: true,
    features: ["品牌名与后台标题定制", "登录 LOGO 与页脚版权", "强调色定制"],
    impact: "启用后站点设置出现「品牌 OEM」入口；配置后后台/前台品牌标识替换为自有品牌",
    adminUrl: "/admin/settings/oem",
    permissions: ["品牌定制"],
  },
  {
    key: "ai-recommend",
    name: "AI 内容推荐",
    description: "基于访客浏览行为（协同过滤）做站内产品/新闻智能推荐，前台详情页展示「猜你喜欢」，提升停留与转化。",
    category: "ai",
    version: "0.1.0",
    builtin: false,
    defaultEnabled: false,
    configurable: false,
    features: ["访客行为采集", "站内智能推荐", "详情页「猜你喜欢」"],
    impact: "启用后前台详情页展示「猜你喜欢」推荐位；需积累行为数据后效果明显，默认停用",
    permissions: ["行为分析", "智能推荐"],
  },
  {
    key: "customer-portal",
    dependencies: ["member"],
    name: "客户门户",
    description: "签约客户专属登录门户：查看授权状态、下载手册资料、提交工单、跟踪历史询价报价（会员登录）。",
    category: "marketing",
    menuGroup: "business",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: false,
    planned: false,
    configurable: true,
    features: ["客户专属登录门户", "授权状态查看", "手册下载与工单提交", "询价报价历史"],
    impact: "启用后后台出现「客户门户」入口；依赖会员体系，前台登录后进入专属门户，默认停用。依赖：会员中心(member)插件",
    adminUrl: "/admin/tickets",
    permissions: ["客户登录", "工单系统"],
  },

  {
    key: "home-sections",
    name: "前台组件市场",
    description: "可视化配置首页区块（Hero/产品/优势/数据/关于/领域/案例/服务/CTA）的显示与排序，关闭即前台隐藏。",
    category: "system",
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: false,
    features: ["首页区块显示启停", "首页区块展示排序", "区块内容可视化配置"],
    impact: "启用后后台出现「前台组件市场」入口（/admin/home-sections）；区块启停与排序直接影响前台首页渲染",
    permissions: ["首页区块启停", "区块排序"],
    adminUrl: "/admin/home-sections",
  },

  // ===== 2026-10-01 owner 新增：社媒一键发布 =====
  {
    key: "social-publish",
    name: "社媒一键发布",
    description:
      "把产品 / 解决方案 / 新闻一键发布到国内与海外社媒渠道；无开放发文接口的平台（小红书/抖音/视频号/B站/知乎/公众号）" +
      "自动生成文案供一键复制 + 打开发布页。",
    category: "marketing",
    // ⚠️ 阀门站这份 registry 的 PluginMenuGroup 还没有 "capability"（那是基地后加的），
    //    按 category 推导即可（marketing → 营销与线索）
    version: "1.0.0",
    builtin: true,
    defaultEnabled: true,
    configurable: true,
    features: ["多渠道一键发布", "国内 + 海外渠道", "群机器人/Webhook 开箱可用", "发布记录与原文报错", "无 API 平台生成文案"],
    impact:
      "启用后后台「能力市场」出现「社媒一键发布」（发布 / 渠道配置 / 发布记录 三个页签）；前台版式与内容**零变化**（不注入任何前台元素）。",
    permissions: ["社媒渠道配置", "社媒发布"],
    adminUrl: "/admin/social-publish",
  },

];

export function getPluginManifest(key: string): PluginManifest | undefined {
  return BUILTIN_PLUGINS.find((p) => p.key === key);
}

/**
 * 远程市场示例条目（插件市场演示数据）
 * =====================================================
 * 这些条目仅作为「插件市场」目录的示例，标记 marketSource='remote'、paid=true、price=99-299。
 * 它们没有实际功能代码：安装后卡片会标注「功能代码待部署」，如实提示，不假装可实现。
 * 生产接入真实远程市场时，应由 /api/admin/plugin-market 从 site_config.plugin_market_url 拉取目录。
 * 注意：示例条目不进入 BUILTIN_PLUGINS，不会出现在侧边栏/启停的默认列表；
 * 只有「安装」后（写入 plugin_state）才出现在已安装管理视图。
 *
 * 来源：自阀门站（VALTRIX）回流至通用基地（2026-09-12，双 fork 合并 D2）。
 */
export const MARKET_EXAMPLE_PLUGINS: PluginManifest[] = [
  {
    key: "ai-video-pro",
    name: "AI 视频生成 Pro",
    description: "专业级 AI 视频能力：文案分镜脚本 + 多模型成片渲染（豆包 / Seedance / 即梦），支持批量生成队列与品牌模板。",
    category: "ai",
    version: "2.0.0",
    builtin: false,
    defaultEnabled: false,
    configurable: true,
    features: ["多模型视频渲染", "批量生成与队列", "品牌模板与字幕"],
    impact: "启用后在「AI 视频生成」页开放 Pro 能力；功能代码待部署，当前仅市场目录条目",
    price: 299,
    paid: true,
    market: true,
    marketSource: "remote",
    adminUrl: "/admin/ai-video",
    // 2026-09-18（P1-5）：本条目 impact 里已写明"功能代码待部署，当前仅市场目录条目" ⇒
    //   用 `planned` 如实标记为规划中占位（后台会显示"规划中"、不提供启停），
    //   而不是让用户以为买/装了就真能用。将来做成真插件时，去掉 planned 即可。
    planned: true,
  },
  {
    key: "advanced-seo",
    name: "SEO 高级分析",
    description: "深度 SEO 分析：关键词排名监控、竞品外链分析、站点健康巡检与批量修复建议。",
    category: "seo",
    version: "1.5.0",
    builtin: false,
    defaultEnabled: false,
    configurable: false,
    features: ["关键词排名监控", "竞品外链分析", "站点健康巡检"],
    impact: "启用后在「SEO 优化」页出现高级分析 Tab；功能代码待部署，当前仅市场目录条目",
    price: 199,
    paid: true,
    market: true,
    marketSource: "remote",
    adminUrl: "/admin/seo-audit",
    planned: true, // 同上：示例占位（impact 已声明功能代码待部署）
  },
  {
    key: "crm-integration",
    name: "CRM 客户集成",
    description: "与主流 CRM（Salesforce / 纷享销客 / 销售易）双向同步客户与询盘线索，自动建档并推送事件。",
    category: "integration",
    version: "1.0.0",
    builtin: false,
    defaultEnabled: false,
    configurable: true,
    features: ["CRM 双向同步", "询盘自动建档", "Webhook 事件推送"],
    impact: "启用后后台出现「CRM 集成」配置入口；功能代码待部署，当前仅市场目录条目",
    price: 99,
    paid: true,
    market: true,
    marketSource: "remote",
    // 2026-09-18（P1-5）：原来指向 `/admin/crm`，但**该页面根本不存在** ⇒ 点击必 404。
    //   已移除该死链；本条目同时标为 planned（未实现）。
    planned: true,
  },
];

/**
 * 全部市场条目 = 内置插件 + 示例远程条目。
 * 市场目录（内置回退）与安装/启停列表统一使用此集合。
 */
export function getMarketPlugins(): PluginManifest[] {
  return [...BUILTIN_PLUGINS, ...MARKET_EXAMPLE_PLUGINS];
}

/** 按 key 查找市场条目（内置优先；远程示例条目也可命中） */
export function getMarketManifest(key: string): PluginManifest | undefined {
  return getMarketPlugins().find((p) => p.key === key);
}
