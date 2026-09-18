# 插件评估与优化建议（VALTRIX 后台）

> 更新时间：2026-09-10
> 评估范围：`lib/plugins/registry.ts` 全部插件 + 后台插件启停中心（`app/admin/plugins/page.tsx`）+ 侧边栏静态菜单关联
> 方法：静态代码读取与分析（registry 备份文件 `docs/admin/_backup_20260910/registry.ts.bak` + 当前 registry.ts + plugins/page.tsx + AdminSidebar.tsx + 关键 API/页面），**纯评估，未修改任何代码、未执行任何写操作**。
> 状态说明：本文所有合并/优化建议均为 **「待确认，未实施」**，合并实施需用户明确确认后另行执行。

---

## 1. 概述

VALTRIX 站后台采用「能力插件化」架构：AI 客服 / SEO / AI 翻译 / 内容采集 / 邮件营销 / 统计等能力统一登记为插件 manifest（`lib/plugins/registry.ts`），后台「插件管理」统一启停与配置。

本次评估覆盖：

- **注册表插件总数：45 个**（全部登记于 `BUILTIN_PLUGINS` 数组；其中 `builtin: true` 43 个、`builtin: false` 2 个（video-content / ai-recommend）；默认启用 41 个、默认停用 4 个（ai-video / applet / ai-recommend / customer-portal）；`isContentSection` 内容栏目插件 10 个；当前 **无 `planned: true` 规划中插件**，能力市场占位已全部转正）。
- **插件状态存储**：`site_config.plugin_state`（JSON），结构 `{ [key]: { enabled, config, name?, showInSidebar? } }`。
- **启停生命周期**：`lib/plugins/hooks.ts` 的 `onEnable / onDisable / onConfigChange`。
- **AI 功能另有第三层开关**：`lib/ai/features.ts` 的 AI 功能点开关矩阵（/admin/ai-features）与 `lib/ai/gateway.ts` 全局 AI 开关，与插件启停中心并行，构成「插件开关 → AI 功能点开关 → 全局 AI 开关」三层控制。

### 核心结论速览

1. 存在 **3 处插件共用同一后台 URL**（ai-text 与 ai-customer-service 共用 `/admin/settings/ai`；template 与 frontend-theme 共用 `/admin/templates`），是注册表层面最直接的重复信号。
2. 存在 **3 处「静态菜单入口 vs 插件动态入口」双入口**（运营驾驶舱 /admin/operations、SEO 优化 /admin/settings/seo、品牌 OEM /admin/settings/oem、API 网关 /admin/gateway 实际为 4 处）。
3. 存在 **2 个插件注册了但侧边栏无入口**（form-builder、home-sections 被列入 `STATIC_SIDEBAR_PLUGIN_KEYS` 却无对应静态菜单项，动态追加又被排除 → 侧边栏消失）。
4. 插件卡片**未展示功能点列表**（registry 无 `features` 字段，仅 `permissions`）、**未标注启用影响**、**未标注「能力型插件无独立管理页」**。
5. 识别出 **12 组**重复/可合并/需理顺项（详见第 3 节），其中 3 组为高优先级合并候选。

---

## 2. 插件全景清单

> showInSidebar 列：registry manifest 未定义该字段，默认 true，可经插件卡片「编辑」弹窗（meta 编辑）调整；「动态追加」= 未列入 `STATIC_SIDEBAR_PLUGIN_KEYS`，启用后自动追加到侧边栏「能力市场」分组。

| # | key | name | category | 默认启用 | 管理入口（adminUrl / adminUrls） | 侧边栏 | 内容栏目 | 功能定位 |
|---|-----|------|----------|:---:|------|:---:|:---:|------|
| 1 | content-types | 通用内容模型 | content | ✅ | /admin/content-types | 动态追加 | 否 | 可视化定义内容栏目（字段/多语言/SEO），通用 CRUD + 前台渲染；sections 覆盖 10 个内容栏目入口 |
| 2 | ai-customer-service | AI 智能客服 | ai | ✅ | /admin/settings/ai + /admin/ai-knowledge | 动态追加 | 否 | 前台在线客服（多语言欢迎语/知识库问答/转人工留资/人机验证） |
| 3 | ai-translate | AI 多语言翻译 | ai | ✅ | /admin/translate-batch + /admin/settings/translate | 动态追加 | 否 | 全站一键翻译（DeepSeek/百度/小牛/MyMemory 多通道）、批量/自动翻译 |
| 4 | seo | SEO / GEO 优化 | seo | ✅ | /admin/settings/seo | 动态追加 | 否 | 全站 SEO 配置、结构化数据、百度站长推送、hreflang、外链回链 |
| 5 | content-collector | 内容采集 | content | ✅ | /admin/collection + /admin/auto-collection-tasks | 动态追加 | 否 | 指定网站自动采集（配置+定时任务+去重入库） |
| 6 | content-product | 产品管理 | content | ✅ | /admin/content/products | 静态 | ✅ | 产品栏目：产品线/分类/型号/规格/多语言/SEO |
| 7 | content-news | 新闻管理 | content | ✅ | /admin/content/news | 静态 | ✅ | 新闻/公告栏目：分类/多语言/SEO |
| 8 | content-resource | 资源管理 | content | ✅ | /admin/resources | 静态 | ✅ | 资源/下载栏目：分类/下载/多语言 |
| 9 | content-industry | 行业方案 | content | ✅ | /admin/content/industries | 静态 | ✅ | 应用行业/解决方案栏目 |
| 10 | content-service | 服务内容 | content | ✅ | /admin/content/services | 静态 | ✅ | 服务/产品服务栏目 |
| 11 | content-case | 成功案例 | content | ✅ | /admin/content/case | 静态 | ✅ | 成功案例/客户案例栏目 |
| 12 | content-faq | 常见问题 | content | ✅ | /admin/content/faq | 静态 | ✅ | FAQ 栏目 |
| 13 | content-career | 招聘职位 | content | ✅ | /admin/careers | 静态 | ✅ | 招聘职位：岗位/福利/投递 |
| 14 | content-about | 关于我们 | content | ✅ | /admin/about | 静态 | ✅ | 关于我们/企业文化/发展历程/荣誉资质 |
| 15 | content-menu | 菜单管理 | content | ✅ | /admin/menus | 静态 | ✅ | 前台导航菜单管理 |
| 16 | ai-text | AI 文本 | ai | ✅ | **/admin/settings/ai（与 ai-customer-service 共用）** | 动态追加 | 否 | 全站编辑器嵌入 AI 生成/改写/润色，SEO 文案、批量改写 |
| 17 | ai-image | AI 图像 | ai | ✅ | 无（能力型） | 无菜单 | 否 | 语义 AI 生图（Pollinations/SiliconFlow）+ 免费占位配图，内容表单一键配图 |
| 18 | ai-autopilot | AI 自动运营 | ai | ✅ | /admin/ai-autopilot | 静态（能力市场） | 否 | 流水线「草稿→AI补全→AI翻译→发布→SEO推送」，定时/手动运行 |
| 19 | email-marketing | EDM 邮件营销 | marketing | ✅ | /admin/email-marketing | 动态追加 | 否 | 邮件订阅管理、营销邮件群发（基于 SMTP） |
| 20 | backlink | 外链营销 | seo | ✅ | /admin/backlinks + /admin/backlinks/posts | 动态追加 | 否 | 外链台账 + AI 软文营销引擎（生成/发布/回链追踪） |
| 21 | analytics | 数据统计 | data | ✅ | /admin/analytics + /admin/funnel + /admin/heatmap + **/admin/operations** | 动态追加 | 否 | 访客统计、销售漏斗、热力图、运营驾驶舱、操作日志 |
| 22 | captcha | 验证码防刷 | system | ✅ | 无（能力型） | 无菜单 | 否 | 前台提交类（留资/询价/留言/下载）人机验证与频率防刷 |
| 23 | smtp | SMTP 邮件服务 | system | ✅ | /admin/settings/smtp | 静态（无 plugin 标记） | 否 | SMTP 配置、验证码邮件、留资通知、报价单发送 |
| 24 | lead | 询盘线索 | marketing | ✅ | /admin/leads | 动态追加 | 否 | 前台留言/询盘/表单线索统一管理，IP/国家/城市，导出 CSV |
| 25 | quote | 询价报价 | marketing | ✅ | /admin/quotes + /admin/quotes/template | 动态追加 | 否 | 询价车、附加项、报价单 PDF（中英双语/LOGO）、审核后发邮箱 |
| 26 | visit-booking | 考察预约 | marketing | ✅ | /admin/visit-bookings | 动态追加 | 否 | 前台参观考察预约（多语言日历）+ 后台预约管理 |
| 27 | download-leads | 下载留资 | marketing | ✅ | /admin/download-leads | 动态追加 | 否 | 方案/手册下载留资（邮箱验证码），留资管理与导出 |
| 28 | template | 模板管理 | system | ✅ | **/admin/templates（与 frontend-theme 共用）** | 静态（站点设置） | 否 | 站点模板登记与管理（默认模板/多模板切换预留） |
| 29 | site-config | 站点配置 | system | ✅ | /admin/settings/site | 静态 | 否 | 站点基础信息（名称/LOGO/域名/页脚/社交/SEO 默认值） |
| 30 | home-config | 首页配置 | system | ✅ | /admin/settings/home | 静态 | 否 | 首页轮播/Banner、核心优势、数据统计、CTA、SEO |
| 31 | page-hero | 页面头部设置 | system | ✅ | /admin/page-hero | 静态 | 否 | 各栏目/详情页头部 Banner 统一管理 |
| 32 | theme | 主题配色 | system | ✅ | /admin/settings/theme | 静态 | 否 | 前台主题颜色/风格自定义 |
| 33 | language | 语种管理 | system | ✅ | /admin/languages | 静态 | 否 | 站点多语言启停（zh/en/ja/ko/fr/ar） |
| 34 | member | 会员中心 | marketing | ✅ | /admin/members + /admin/member-levels | 动态追加 | 否 | 前台会员注册/登录/个人中心/收藏/会员分级（独立 HMAC token） |
| 35 | mall | 在线商城 | marketing | ✅ | /admin/shop + categories/orders/stats/coupons | 动态追加 | 否 | 商品/购物车/订单/支付（线下/微信/支付宝），可与询价报价并存 |
| 36 | frontend-theme | 前台模板市场 | integration | ✅ | **/admin/templates（与 template 共用）** | 动态追加 | 否 | 多套前台模板（首页/列表/详情/配色）切换，内置十套预设模板+行业数据包 |
| 37 | form-builder | 通用表单 | marketing | ✅ | /admin/forms | **无入口（BUG）** | 否 | 可视化创建自定义表单，前台 /forms/标识 访问，提交入库+CSV 导出 |
| 38 | video-content | 视频内容 | content | ✅ | 无（能力型） | 无菜单 | 否 | 内容模型视频字段：上传/外链/播放器/封面（builtin:false） |
| 39 | ai-video | AI 视频生成 | ai | ❌ | /admin/ai-video | 动态追加 | 否 | AI 生成产品宣传视频分镜脚本（豆包/Seedance 成片，默认停用） |
| 40 | applet | 小程序 / APP 端 | integration | ❌ | /admin/applet | 动态追加 | 否 | 一键生成微信小程序/H5 App 壳（默认停用） |
| 41 | multi-site | 多站点 / 多语言独立站 | system | ✅ | /admin/tenants + /admin/sites | 动态追加 | 否 | 一套后台管理多个独立站点（子域名隔离，SaaS 多租户） |
| 42 | white-label | 白标 OEM | system | ✅ | /admin/settings/oem | 动态追加 | 否 | 代理商以自有品牌交付（品牌名/后台标题/登录LOGO/页脚版权） |
| 43 | ai-recommend | AI 内容推荐 | ai | ❌ | 无（能力型） | 无菜单 | 否 | 基于浏览行为的站内智能推荐「猜你喜欢」（builtin:false，默认停用） |
| 44 | customer-portal | 客户门户 | marketing | ❌ | /admin/tickets | 动态追加 | 否 | 签约客户专属门户：授权状态/下载手册/工单/询价历史（默认停用） |
| 45 | home-sections | 前台组件市场 | system | ✅ | /admin/home-sections | **无入口（BUG）** | 否 | 首页区块（Hero/产品/优势/数据/关于/领域/案例/服务/CTA）显示与排序 |

**统计**：45 个插件中，有管理入口 39 个、能力型无入口 4 个（ai-image / captcha / video-content / ai-recommend）、侧边栏入口丢失 2 个（form-builder / home-sections，BUG）。

### 静态菜单（非 registry 插件，但承载插件能力入口）

以下后台页面**未在 registry 注册**，仅存在于侧边栏静态菜单或独立路由，评估时需与对应插件区分：

| 路由 | 侧边栏位置 | 性质 | 与插件关系 |
|------|-----------|------|-----------|
| /admin/operations | 顶层「运营驾驶舱」 | 静态 | **与 analytics 插件的 adminUrls 重复入口** |
| /admin/gateway | 能力市场「API 网关」 | 静态 | 与 plugins 页内嵌「对外 API 网关」面板重复 |
| /admin/ai-features | 能力市场「AI 开关矩阵」 | 静态 + 独立 API（lib/ai/features.ts） | 与 plugins 启停中心构成第三层 AI 开关 |
| /admin/ai-site-wizard | 能力市场「AI 建站向导」 | 静态 + 独立 API | 挂在 ai-autopilot 插件 key 下（plugin: 'ai-autopilot'） |
| /admin/seo-audit | 站点设置「SEO 批量补全」 | 静态 + 独立 API | SEO 工具的批量补全页，未插件化 |
| /admin/industry-packs | 站点设置「行业包管理」 | 静态 + 独立 API | 未插件化，与 multi-site/ai-site-wizard 相关 |
| /admin/product-categories | 内容管理「产品分类」 | 静态 | 挂在 content-product 插件下 |
| /admin/resource-categories | 内容管理「资源分类」 | 静态 | 挂在 content-resource 插件下 |
| /admin/settings/pricing | 站点设置「定价与价格显示」 | 静态 | 挂在 site-config 插件下 |
| /admin/customer-types | 站点设置「客户分类管理」 | 静态 | 挂在 site-config 插件下 |
| /admin/inquiries | — | **纯 redirect → /admin/leads** | 旧版询盘页别名，建议保留兼容或直接废弃 |
| /admin/notifications | 顶层「通知中心」 | 静态 | 留言/系统/采集/备份通知，未插件化 |
| /admin/settings/languages | — | **纯 redirect → /admin/languages** | 语种管理别名页 |
| /admin/logs | 系统运维「操作日志」 | 静态 | 挂在 analytics 插件下（plugin: 'analytics'） |

---

## 3. 重复 / 可合并矩阵

按任务要求分组。**所有合并建议均为「待确认，未实施」**。

### 3.1 SEO 类

#### 组 S1：seo ↔ backlink（外链能力重叠）｜优先级：中

- **重叠点**：seo 插件 description/permissions 已包含「外链回链管理」（permissions: 外链回链），而 backlink 是独立插件专做外链台账 + 软文营销（/admin/backlinks、/admin/backlinks/posts）。
- **合并建议**：保持两个插件独立，但**seo 插件描述中去掉「外链回链」表述**（外链统一归 backlink 负责），避免用户混淆入口。或反向：把 backlink 作为 seo 插件的 adminUrls 子入口（「外链营销」挂在 SEO 插件下）。
- **风险评估**：低。仅涉及描述文案 / 入口归属，无数据与路由破坏。
- **优先级**：中。

#### 组 S2：seo 插件 ↔ 静态「SEO 优化」「SEO 批量补全」入口｜优先级：中

- **重叠点**：seo 插件（动态追加到能力市场）+ 站点设置静态「SEO 优化」（无 plugin 标记，启停不受控）+ 静态「SEO 批量补全」（/admin/seo-audit，未插件化）。
- **合并建议**：静态「SEO 优化」菜单项补 `plugin: 'seo'`（受启停控制）；`/admin/seo-audit` 挂为 seo 插件的 adminUrls 子入口（label「SEO 批量补全」），或独立注册为 `seo-audit` 插件。
- **风险评估**：低。仅菜单元数据调整。
- **优先级**：中。

### 3.2 AI 类

#### 组 A1：ai-text ↔ ai-customer-service ↔ ai-features（AI 入口与开关三层重叠）｜优先级：**高**

- **重叠点**：
  1. ai-text 与 ai-customer-service **共用 `/admin/settings/ai`**——该页面实际是 AI 客服配置页（欢迎语/模型/人机验证），ai-text 的配置项（provider/model/maxTokens）在该页面无对应 UI，入口指向名不副实。
  2. `/admin/ai-features`（AI 开关矩阵）与插件启停中心（/admin/plugins）**并行管理 AI 能力开关**：plugins 页管插件级，ai-features 页管功能点级（editor_generate / translate_auto / seo_fill / chat_answer / image_placeholder…）+ 全局 AI 开关（lib/ai/gateway.ts）。三层开关并存，UI 分散，用户易困惑「在哪关 AI」。
  3. ai-customer-service 的 adminUrls 与 ai-text 的 adminUrl 指向同一设置页。
- **合并建议（方案，待确认）**：
  - ai-text 不再独占 adminUrl，改为「无独立管理页，配置并入 `/admin/settings/ai` 的「AI 模型配置」Tab」；ai-text 与 ai-customer-service 的模型配置合并为一个「AI 模型与密钥」设置区块（一个 apiKey/model 全站共享，与 registry 注释「留空自动回退读取翻译/AI 客服配置」呼应）。
  - 将 `/admin/ai-features` 收敛进插件启停中心：在 plugins 页 AI 分类卡片内展示「AI 功能点开关」（或 ai-features 页增加「跳转插件管理」链接），明确「插件级开关」与「功能点级开关」层级，避免两页并列。
- **风险评估**：中。settings/ai 页与 ai-features 页均有既有用户路径；合并仅收敛入口与配置，不删数据。AI 客服配置表单结构若调整需回归测试多语言欢迎语保存。
- **优先级**：高（入口共用是硬伤）。

#### 组 A2：ai-autopilot ↔ ai-site-wizard（挂靠关系错位）｜优先级：低

- **重叠点**：AI 建站向导（/admin/ai-site-wizard）是独立功能，侧边栏却挂在 `plugin: 'ai-autopilot'` 下——停用 AI 自动运营会连带隐藏建站向导入口，二者功能无强关联。
- **合并建议**：建站向导挂靠 ai-text（文案生成）或独立注册为 `ai-site-wizard` 插件；至少改为不受 ai-autopilot 启停控制。
- **风险评估**：低。
- **优先级**：低。

#### 组 A3：ai-image / ai-video / ai-recommend / video-content（AI 生成类家族）｜优先级：低

- **重叠点**：四者均为「内容生成/增强」能力型插件，但定位不同（静态配图 / 视频脚本 / 推荐 / 视频字段），无功能重叠，**不建议合并**。
- **建议**：卡片增加「能力型插件」徽章说明无独立管理页（见第 5 节）。
- **优先级**：低（仅 UI 说明）。

### 3.3 数据分析类

#### 组 D1：analytics ↔ 静态「运营驾驶舱」↔「操作日志」｜优先级：中高

- **重叠点**：analytics 插件 adminUrls 含 `/admin/operations`（运营驾驶舱），而侧边栏**顶层静态菜单已有「运营驾驶舱」**；系统运维分组又有「操作日志」（plugin: 'analytics'）。→ 运营驾驶舱双入口、操作日志与 analytics 的 permissions（操作日志）重叠。
- **合并建议**：
  - 运营驾驶舱保持顶层静态入口，**从 analytics 的 adminUrls 移除 /admin/operations**（插件卡片不再重复显示）；
  - analytics 插件描述改为「访客统计/销售漏斗/热力图/操作日志」；
  - 顶层「运营驾驶舱」补 `plugin: 'analytics'` 标记，使启停联动。
- **风险评估**：低。仅入口元数据。
- **优先级**：中高。

### 3.4 询盘 / 线索 / 留资类

#### 组 L1：lead ↔ download-leads ↔ quote ↔ visit-booking ↔ form-builder ↔ inquiries（线索/留资家族）｜优先级：中

- **重叠点**：lead（询盘线索：留言/询盘/表单统一管理）、download-leads（下载留资）、quote（询价报价）、visit-booking（考察预约）、form-builder（自定义表单提交入库）、inquiries（redirect 别名）——**六个入口都在收集「访客线索」**，且 form-builder 的提交记录与 lead 的「表单线索统一管理」语义重叠（form-builder 入库后是否进 lead 线索池需确认，当前实现为独立存储）。
- **合并建议（方案，待确认）**：
  - 短期：保留独立插件，但插件卡片标注「线索归口：所有线索可在 /admin/leads 统一查看」（明确 lead 为线索总入口）；
  - 中期：将 download-leads / visit-booking 的线索数据并入 lead 的统一线索池（或 lead 提供「线索来源筛选」：留言/下载/预约/询价/表单）；
  - inquiries 纯 redirect 页保留兼容即可，**不建议单独合并**。
- **风险评估**：中。涉及线索数据模型与既有报表口径；合并需迁移 download-leads.jsonl 等既有数据。
- **优先级**：中。

#### 组 L2：member ↔ customer-portal ↔ mall（用户体系家族）｜优先级：低

- **重叠点**：member（会员基础）、customer-portal（客户门户，描述明确「会员登录」）、mall（在线商城，需登录下单）共用会员体系；customer-portal 当前默认停用。
- **合并建议**：不合并插件，但 customer-portal 描述中声明「依赖 member 插件，启用前需先启用会员中心」；mall 同理标注依赖 member。
- **风险评估**：低。
- **优先级**：低。

### 3.5 内容类

#### 组 C1：content-types ↔ 10 个 content-* 栏目插件（统一模型 vs 独立栏目）｜优先级：中（架构理顺，不建议合并）

- **重叠点**：content-types 的 sections 已覆盖 10 个内容栏目入口（产品/新闻/资源/行业/服务/案例/FAQ/招聘/关于/菜单），与 10 个 content-* 插件的 adminUrl **完全对应**（如 content-product → /admin/content/products = content-types.sections 产品管理）。即同一栏目存在「content-* 插件」与「content-types 衍生栏目」两套标识。
- **合并建议**：**不建议合并**（各栏目插件权限隔离、启停粒度合理）。建议理顺：
  - content-types 的 sections 列表在卡片中已展示（已有 UI），保持；
  - 10 个 content-* 插件 `isContentSection: true` 已在插件卡片中隐藏，符合设计；
  - 可选优化：content-* 插件卡片虽隐藏，但侧边栏「内容管理」分组已是其入口，建议在文档/引导中说明「内容栏目插件统一在侧边栏内容管理操作」。
- **风险评估**：无（不改代码）。
- **优先级**：中（文档说明即可）。

#### 组 C2：home-config ↔ home-sections（首页配置重叠）｜优先级：**高**

- **重叠点**：home-config（/admin/settings/home）管理「首页轮播/Banner、核心优势、数据统计、CTA、SEO 等首页区块**内容**」；home-sections（/admin/home-sections）管理「首页区块（Hero/产品/优势/数据/关于/领域/案例/服务/CTA）的**显示与排序**」。**同一批首页区块被两个插件/两个页面管理**（一个管内容、一个管显隐排序），用户需在两个入口间切换。
- **合并建议**：合并为单一「首页配置」插件（保留 home-config key），页面合并：/admin/settings/home 增加「区块显示与排序」Tab（或反向），废弃 /admin/home-sections 独立页；插件卡片只保留一个。
- **风险评估**：中。需合并 home-config 与 home-sections 两套 API/页面；前台渲染逻辑（sections 启停）依赖 home-sections 的数据结构，合并时需保持 HomeConfig 与 HomeSections 数据字段兼容或做迁移。
- **优先级**：高。

#### 组 C3：content-collector ↔ ai-autopilot（采集能力依赖）｜优先级：低

- **重叠点**：ai-autopilot 流水线含「自动采集」能力（permissions: 自动采集），content-collector 也是采集（配置+定时任务）。ai-autopilot 的「草稿→补全」来源与 content-collector 的采集入库存在能力重叠。
- **合并建议**：不合并，明确 ai-autopilot **依赖 content-collector** 提供采集源；建议在 ai-autopilot 描述中声明依赖，避免重复实现采集。
- **风险评估**：低。
- **优先级**：低。

### 3.6 系统 / 集成类

#### 组 X1：template ↔ frontend-theme（模板插件重复）｜优先级：**高**

- **重叠点**：template（模板管理，/admin/templates，站点设置静态入口）与 frontend-theme（前台模板市场，**同一 URL /admin/templates**，动态追加能力市场）。两个插件、两个 key、一个页面；frontend-theme 描述（多套前台模板/预设模板/行业数据包）明显是 template 的扩展版。
- **合并建议**：**合并为一个「模板管理」插件**：保留 key `template`（或 `frontend-theme` 二选一），合并后名称为「模板管理（含前台模板市场）」；保留 /admin/templates 页面，废弃另一个 key（从 registry 移除或标记 deprecated 隐藏）；permissions 合并（模板下载/切换 + 模板登记）。侧边栏只保留站点设置「模板管理」一个入口。
- **风险评估**：低-中。两个 key 的 plugin_state 需合并迁移（若用户已分别启停）；其余无数据破坏（共用同一页面）。
- **优先级**：高（同 URL 是注册表级硬伤）。

#### 组 X2：white-label ↔ 静态「品牌 OEM」｜优先级：中

- **重叠点**：white-label 插件 adminUrl=/admin/settings/oem，动态追加能力市场；站点设置静态「品牌 OEM」同 URL（无 plugin 标记，启停不受控）→ 双入口。
- **合并建议**：静态「品牌 OEM」补 `plugin: 'white-label'` 标记，white-label 不再动态追加（或反向）。二选一入口。
- **风险评估**：低。
- **优先级**：中。

#### 组 X3：gateway 静态页 ↔ plugins 页内嵌「对外 API 网关」面板｜优先级：中

- **重叠点**：/admin/gateway（能力市场静态页，完整版：密钥/用量/定价）+ plugins 页底部内嵌「对外 API 网关」面板（简易版：生成/吊销 Key）→ 两个页面管理同一套 API Key。
- **合并建议**：plugins 页移除内嵌网关面板，仅保留「跳转 API 网关」链接（或反之，保留内嵌、废弃静态页，推荐前者）。
- **风险评估**：低。同一数据源，只删 UI 冗余。
- **优先级**：中。

#### 组 X4：smtp ↔ email-marketing（依赖关系）｜优先级：低

- **重叠点**：smtp 是邮件基础设施（验证码/通知/报价单发送），email-marketing 是营销群发，**依赖 smtp 能力**，不重叠。
- **建议**：email-marketing 描述声明「依赖 smtp 插件」；静态「SMTP 邮件」菜单补 `plugin: 'smtp'` 标记（当前无 plugin 标记，启停不受控）。
- **优先级**：低。

#### 组 X5：multi-site ↔ industry-packs ↔ applet（站点/集成家族）｜优先级：低

- **重叠点**：industry-packs（静态页）管理站点行业包，与 multi-site 的站点维度强相关（sites 表含 industryPack 字段）；applet 复用同一内容模型与接口。
- **合并建议**：不合并；建议 industry-packs 挂 `plugin: 'multi-site'`（或注册为独立插件），并在 multi-site 描述中提及行业包。
- **优先级**：低。

---

## 4. 插件功能说明优化表

> 依据：registry.ts 无 `features` 字段（仅 `permissions`）；page.tsx 卡片当前展示 name / version / category / description / permissions / adminUrls / sections / 启停开关，**无功能点列表、无启用影响说明、无「能力型无入口」标注**。

### 4.1 名称准确性

| key | 当前名称 | 问题 | 建议名称 |
|-----|---------|------|---------|
| ai-text | AI 文本 | 过于宽泛，与 ai-image/ai-video 并列时难辨「文本生成」具体能力 | 「AI 文本创作」或「AI 文案生成」 |
| ai-image | AI 图像 | 同上 | 「AI 配图生成」 |
| ai-recommend | AI 内容推荐 | 尚可，但「推荐」未指明站内 | 「AI 站内推荐」 |
| home-sections | 前台组件市场 | 实际是「首页区块启停排序」，非组件市场 | 「首页区块设置」 |
| template | 模板管理 | 与 frontend-theme（前台模板市场）名称易混 | 合并后统一「模板管理」 |
| analytics | 数据统计 | 实际含运营驾驶舱/漏斗/热力图/操作日志，名称偏窄 | 「数据统计与分析」 |
| content-types | 通用内容模型 | 尚可，但「模型」对非技术用户晦涩 | 「自定义栏目管理」 |
| video-content | 视频内容 | 实为「内容模型视频字段扩展」 | 「视频内容支持」 |
| form-builder | 通用表单 | 尚可 | 保留 |
| mall | 在线商城 | 尚可 | 保留 |
| customer-portal | 客户门户 | 尚可 | 保留 |

### 4.2 描述质量与启用影响

| key | 当前描述问题 | 建议补充 |
|-----|------------|---------|
| ai-text | 描述未说明入口与启用影响 | 补充「启用后在编辑器/表单出现 AI 生成按钮；配置入口见 AI 设置」 |
| ai-image | 未说明入口 | 补充「启用后内容表单图片字段出现『AI 配图』按钮；能力型插件无独立管理页」 |
| ai-autopilot | 未说明依赖采集 | 补充「依赖 content-collector 采集源；运行频率见配置」 |
| captcha | 未说明入口与开关影响 | 补充「能力型插件，无管理页；停用后前台提交类全部放开人机验证（高风险）」，建议停用时强警告 |
| video-content | 未说明影响 | 补充「关闭后后台隐藏视频字段、前台不渲染播放器」（描述已有，保留）；补「能力型插件无管理页」 |
| ai-recommend | 描述过简，无启用影响 | 补充「启用后前台详情页展示『猜你喜欢』；需积累访客行为数据后效果明显」 |
| email-marketing | 未说明依赖 | 补充「依赖 smtp 插件；群发走 SMTP 通道」 |
| customer-portal | 未说明依赖 | 补充「依赖 member 会员体系；启用前请先启用会员中心」 |
| multi-site | 描述偏技术 | 补充「启用后后台出现『站点视角』切换器；站点间内容隔离」 |
| ai-video | 未说明当前能力边界 | 补充「当前可生成分镜脚本；成片需接入豆包/Seedance 视频能力」 |
| applet | 未说明前置 | 补充「生成小程序/H5 壳需先配置应用信息与开放接口；默认停用」 |
| mall | 未说明与 quote 关系 | 补充「与询价报价可并存；启用后前台出现商城入口」 |
| visit-booking | 描述尚可 | 补充「启用后前台导航/联系页出现考察预约入口」 |
| download-leads | 描述尚可 | 补充「依赖 smtp（邮箱验证码）；未配置 SMTP 时走开发模式回显验证码」 |
| seo | 外链表述重叠 | 去掉「外链回链」或注明「外链专项见『外链营销』插件」 |

### 4.3 功能点明细（features）缺失

- **现状**：registry manifest **没有 `features` 字段**，仅有 `permissions`（权限声明）；page.tsx 卡片将 permissions 以 `ShieldCheck · 权限1 · 权限2` 展示，**不是功能点列表**。
- **建议**：为每个插件在 manifest 增加 `features: string[]`（3-6 条用户可感知的功能点，如 ai-customer-service → 「前台悬浮客服」「知识库 RAG 问答」「转人工留资」「多语言欢迎语」「人机验证」），卡片以 bullet 列表展示。
- **补充示例**：
  - seo → 「SEO/GEO 配置」「结构化数据」「百度站长推送」「多语言 hreflang」「sitemap」
  - content-collector → 「网站采集」「定时任务」「自动去重入库」
  - analytics → 「访客统计」「销售漏斗」「热力图」「运营驾驶舱」「操作日志」
  - lead → 「线索统一管理」「IP/国家/城市识别」「CSV 导出」
  - quote → 「询价车」「附加项」「中英双语 PDF」「审核发送」
  - mall → 「商品管理」「购物车/订单」「在线支付」「优惠券」「销售统计」

### 4.4 管理入口标注

- **现状**：有 adminUrl/adminUrls 的插件卡片已渲染入口按钮（label 取自 adminUrls 的 label 或默认「管理入口」）；**能力型插件（ai-image / captcha / video-content / ai-recommend）无入口按钮且无说明**，用户不知去哪配置。
- **建议**：无 adminUrl 的插件卡片显示「能力型插件 · 无独立管理页（随宿主功能生效）」徽章；有 adminUrls 的优先渲染多按钮（当前已支持）。

---

## 5. 插件卡 UI 改进方案（待确认，未实施）

### 5.1 现状

- ✅ 已有：按 category 分组展示（plugins 页按 categoryLabel 分组）、状态筛选 Tab（全部/已启用/已停用/规划中）、启停开关、编辑（自定义名称/侧边栏显隐）、配置弹窗、管理入口按钮、permissions 徽章、衍生栏目 sections 网格。
- ❌ 缺失：功能点列表、启用影响说明、搜索框、按 category 过滤、能力型徽章、配置状态徽章（需要配置 vs 已配置）。

### 5.2 改进后卡片结构（文字线框图）

```
┌────────────────────────────────────────────────┐
│ [icon] 插件名称            [状态徽章]    [启停开关] │
│ v1.0.0 · 分类标签 · 内置/动态 · 需要配置⚠        │
│ ────────────────────────────────────────────── │
│ 描述：全站 SEO 配置、结构化数据、百度站长推送……     │
│ ────────────────────────────────────────────── │
│ 功能点：                                       │
│  • SEO/GEO 配置   • 结构化数据   • 百度推送      │
│  • hreflang      • sitemap                    │
│ ────────────────────────────────────────────── │
│ 启用影响：启用后站点设置出现「SEO 优化」入口；      │
│ 停用后隐藏该入口，前台 SEO 标签停止输出。          │
│ ────────────────────────────────────────────── │
│ [管理入口] [配置] [编辑]   [依赖：smtp]           │
└────────────────────────────────────────────────┘
```

### 5.3 分组 / 搜索 / 过滤改进

1. **分组**：按 category 分组已实现；建议分组标题可折叠，并显示组内启用数（如「AI 人工智能 · 6/8 已启用」）。
2. **搜索**：顶部增加名称/描述搜索框（前端过滤 `name + description + key`）。
3. **过滤**：现有状态 Tab 保留；增加「按分类」下拉 +「仅看需要配置」开关（`configurable && 配置为空`）。
4. **状态徽章**：已启用（绿）/已停用（灰）/规划中（黄，当前无实例）/需要配置（橙，`configurable` 且 config 为空）/能力型（蓝，无管理入口）/依赖缺失（红，如 customer-portal 依赖 member 未启用时提示）。
5. **启停交互**：停用影响大的插件（captcha 停用=放开验证）二次确认；启用有关联依赖的插件时提示依赖链。
6. **入口统一**：plugins 页移除内嵌「对外 API 网关」面板，改为跳转 /admin/gateway（见组 X3）。

---

## 6. 待用户确认的合并决策点清单

> 以下全部为「待确认，未实施」。确认后按组逐项实施（涉及 registry.ts 修改、页面路由调整、plugin_state 迁移、权限码调整）。

| # | 决策点 | 建议动作 | 涉及插件 | 影响面 | 优先级 |
|---|--------|---------|---------|--------|:---:|
| D1 | template + frontend-theme 同 URL | 合并为「模板管理」，废弃一个 key | template / frontend-theme | 低-中：plugin_state 合并迁移 | **高** |
| D2 | home-config + home-sections 首页配置重叠 | 合并为「首页配置」，/admin/settings/home 增加区块排序 Tab | home-config / home-sections | 中：页面/API 合并，数据兼容 | **高** |
| D3 | ai-text 与 ai-customer-service 共用 /admin/settings/ai | ai-text 去独立入口，模型配置并入 AI 设置页；ai-features 收敛进插件启停中心 | ai-text / ai-customer-service / ai-features(静态) | 中：AI 设置页结构调整 | **高** |
| D4 | analytics 与静态运营驾驶舱双入口 | 运营驾驶舱补 plugin 标记，analytics 移除 /admin/operations | analytics | 低 | 中高 |
| D5 | gateway 静态页与 plugins 内嵌面板 | plugins 页移除内嵌面板，统一跳 /admin/gateway | —（静态） | 低 | 中 |
| D6 | seo 静态入口无 plugin 标记 + seo-audit 未插件化 | 补 plugin: 'seo'；seo-audit 挂为 seo 子入口 | seo | 低 | 中 |
| D7 | white-label 与静态「品牌 OEM」双入口 | 静态项补 plugin: 'white-label' | white-label | 低 | 中 |
| D8 | 线索家族六个入口 | lead 为线索总入口，各插件标注归口；中期数据并入统一线索池 | lead / download-leads / quote / visit-booking / form-builder | 中：数据模型迁移 | 中 |
| D9 | seo 与 backlink 外链描述重叠 | seo 描述去掉外链，归 backlink | seo / backlink | 低 | 中 |
| D10 | form-builder / home-sections 侧边栏无入口（BUG） | 从 STATIC_SIDEBAR_PLUGIN_KEYS 移除（动态追加）或补静态菜单项 | form-builder / home-sections | 低 | **高（BUG）** |
| D11 | ai-autopilot 与 ai-site-wizard 挂靠错位 | 建站向导改挂 ai-text 或独立插件 | ai-autopilot / ai-site-wizard(静态) | 低 | 低 |
| D12 | 依赖声明 | member↔customer-portal/mall、smtp↔email-marketing、content-collector↔ai-autopilot 描述声明依赖 | 多插件 | 低（仅描述） | 低 |

---

## 7. 附录：插件与后台页面路由对照表

### 7.1 registry 插件 → 管理页路由

| 插件 key | 管理路由 |
|---------|---------|
| content-types | /admin/content-types |
| ai-customer-service | /admin/settings/ai、/admin/ai-knowledge |
| ai-translate | /admin/translate-batch、/admin/settings/translate |
| seo | /admin/settings/seo（+建议 /admin/seo-audit） |
| content-collector | /admin/collection、/admin/auto-collection-tasks |
| content-product | /admin/content/products（+产品分类 /admin/product-categories） |
| content-news | /admin/content/news |
| content-resource | /admin/resources（+资源分类 /admin/resource-categories） |
| content-industry | /admin/content/industries |
| content-service | /admin/content/services |
| content-case | /admin/content/case |
| content-faq | /admin/content/faq |
| content-career | /admin/careers |
| content-about | /admin/about |
| content-menu | /admin/menus |
| ai-text | /admin/settings/ai（与 ai-customer-service 共用） |
| ai-image | —（能力型） |
| ai-autopilot | /admin/ai-autopilot（+静态 /admin/ai-site-wizard 挂靠） |
| email-marketing | /admin/email-marketing |
| backlink | /admin/backlinks、/admin/backlinks/posts |
| analytics | /admin/analytics、/admin/funnel、/admin/heatmap、/admin/operations（建议移除）、/admin/logs |
| captcha | —（能力型） |
| smtp | /admin/settings/smtp |
| lead | /admin/leads（+别名 /admin/inquiries） |
| quote | /admin/quotes、/admin/quotes/template |
| visit-booking | /admin/visit-bookings |
| download-leads | /admin/download-leads |
| template | /admin/templates（与 frontend-theme 共用） |
| site-config | /admin/settings/site（+定价 /admin/settings/pricing、客户分类 /admin/customer-types） |
| home-config | /admin/settings/home |
| page-hero | /admin/page-hero |
| theme | /admin/settings/theme |
| language | /admin/languages（+别名 /admin/settings/languages） |
| member | /admin/members、/admin/member-levels |
| mall | /admin/shop、/admin/shop/categories、/admin/shop/orders、/admin/shop/stats、/admin/shop/coupons |
| frontend-theme | /admin/templates（与 template 共用） |
| form-builder | /admin/forms（侧边栏入口丢失 BUG） |
| video-content | —（能力型） |
| ai-video | /admin/ai-video |
| applet | /admin/applet |
| multi-site | /admin/tenants、/admin/sites |
| white-label | /admin/settings/oem |
| ai-recommend | —（能力型） |
| customer-portal | /admin/tickets |
| home-sections | /admin/home-sections（侧边栏入口丢失 BUG） |

### 7.2 静态页面（未插件化，与插件能力相关）

| 路由 | 说明 |
|------|------|
| /admin/operations | 运营驾驶舱（顶层静态，与 analytics 重复） |
| /admin/gateway | API 网关（与 plugins 页内嵌面板重复） |
| /admin/ai-features | AI 开关矩阵（第三层 AI 开关） |
| /admin/ai-site-wizard | AI 建站向导（挂 ai-autopilot） |
| /admin/seo-audit | SEO 批量补全（建议并入 seo） |
| /admin/industry-packs | 行业包管理（建议挂 multi-site） |
| /admin/product-categories / resource-categories | 分类管理（挂 content-* 插件） |
| /admin/settings/pricing / customer-types | 站点配置扩展页（挂 site-config） |
| /admin/inquiries | 旧询盘别名（redirect → /admin/leads） |
| /admin/notifications | 通知中心（未插件化） |
| /admin/settings/languages | 语种别名（redirect → /admin/languages） |
| /admin/logs | 操作日志（挂 analytics） |

---

*本文档由静态代码分析生成，未执行任何写操作。所有合并/优化建议待用户确认后另行实施。*
