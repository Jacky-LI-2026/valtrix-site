# VALTRIX 后台侧边栏菜单结构 · 全面只读分析（原始数据）

> 生成时间：2026-09-10
> 分析范围：`components/admin/AdminSidebar.tsx`（473 行）+ `lib/plugins/registry.ts`（714 行）+ `app/api/admin/plugins/route.ts` + `app/admin/**` 全部 85 个 page.tsx + 数据库 `permissions/roles/role_permissions/site_config(plugin_state)` 只读查询
> 硬约束遵守：未修改任何代码/数据，仅 SELECT 与文件读取。

---

## 0. 结论速览（TL;DR）

| 指标 | 数值 |
|---|---|
| 顶层导航项（分组+单入口） | **10**（5 个可展开分组 + 5 个单入口） |
| 静态菜单项总数 | **42**（含 5 个分组父级） |
| 动态插件菜单入口（全默认启用场景） | **16**（11 单入口 + 5 多二级页父级） |
| 动态插件菜单入口（当前 mall/visit-booking 停用后） | **14** |
| 后台页面路由（page.tsx 去重） | **~73 个可访问路由**（85 个文件含 new/edit/[id] 子页） |
| 侧边栏无入口页面（真孤儿） | **3**：`/admin/settings/languages`、`/admin/forms`、`/admin/home-sections` |
| 侧边栏无入口页面（别名/重定向，合理） | 3：`/admin/inquiries`、`/admin/shop/products`、`/admin/content` |
| 侧边栏无入口页面（插件默认/当前停用） | 9（随插件启停出现） |
| 死链（指向不存在路由） | **0** |
| 因权限码缺失被永久隐藏的菜单项 | **4**：插件启停中心、API 网关、成功案例、常见问题 |
| 重复入口路由 | **5**：`/admin/operations`、`/admin/settings/ai`、`/admin/settings/oem`、`/admin/settings/seo`、`/admin/templates` |

---

## 1. 现有侧边栏分组树（含渲染条件）

渲染机制说明：
- `hasPerm(p)`：无 `permission` 声明 → 默认可见；有声明 → 必须 `user.permissions`（来自 DB role_permissions → permission.code）包含该码。
- `pluginOn(p)`：插件元数据加载中（`pluginMeta===null`）→ 全部显示；加载后 → 插件已启用且 `showInSidebar!==false` 才显示。
- 动态插件入口：`/api/admin/plugins?mode=enabled` 返回已启用插件；过滤条件 = `showInSidebar!==false` 且 非 `isContentSection` 且 非 `planned` 且 不在 `STATIC_SIDEBAR_PLUGIN_KEYS` 且 有 `adminUrl/adminUrls`。**动态入口不参与任何权限过滤**。

```
├─ [单入口] 控制台  /admin  （无权限/无插件）
├─ [单入口] 运营驾驶舱  /admin/operations  （无权限/无插件）
├─ [分组] 内容管理  href='#'
│   ├─ 产品管理    /admin/content/products    perm:product:view  plugin:content-product
│   ├─ 新闻管理    /admin/content/news        perm:news:view     plugin:content-news
│   ├─ 资源管理    /admin/resources           perm:resource:view plugin:content-resource
│   ├─ 行业方案    /admin/content/industries  perm:industry:view plugin:content-industry
│   ├─ 服务内容    /admin/content/services    perm:service:view  plugin:content-service
│   ├─ 成功案例    /admin/content/case        perm:case:view     plugin:content-case   ⚠️ case:view 不存在→全用户隐藏
│   ├─ 常见问题    /admin/content/faq         perm:faq:view      plugin:content-faq    ⚠️ faq:view 不存在→全用户隐藏
│   ├─ 招聘职位    /admin/careers             perm:career:view   plugin:content-career
│   ├─ 关于我们    /admin/about               perm:about:view    plugin:content-about
│   ├─ 菜单管理    /admin/menus               perm:menu:view     plugin:content-menu
│   ├─ 产品分类    /admin/product-categories  perm:product:view  plugin:content-product
│   └─ 资源分类    /admin/resource-categories perm:resource:view plugin:content-resource
├─ [分组] 能力市场  href='/admin/plugins'
│   ├─ 插件启停中心  /admin/plugins           perm:plugin:view   ⚠️ plugin:view 不存在→全用户隐藏
│   ├─ API 网关     /admin/gateway            perm:plugin:view   ⚠️ 同上→隐藏
│   ├─ AI 开关矩阵  /admin/ai-features        perm:ai:config
│   ├─ AI 自动运营  /admin/ai-autopilot       perm:ai:config  plugin:ai-autopilot
│   ├─ AI 建站向导  /admin/ai-site-wizard     perm:ai:config  plugin:ai-autopilot
│   └─ 【动态插件入口 ×14~16，无权限过滤，全部可见】：
│       ├─ 通用内容模型      /admin/content-types            （content-types）
│       ├─ AI 智能客服 ▾     /admin/settings/ai  /admin/ai-knowledge   （ai-customer-service）
│       ├─ AI 多语言翻译 ▾   /admin/translate-batch /admin/settings/translate （ai-translate）
│       ├─ SEO / GEO 优化    /admin/settings/seo             （seo）⚠️ 与站点设置"SEO 优化"重复
│       ├─ 内容采集 ▾        /admin/collection /admin/auto-collection-tasks （content-collector）
│       ├─ AI 文本           /admin/settings/ai              （ai-text）⚠️ 与 AI 智能客服子项重复
│       ├─ EDM 邮件营销      /admin/email-marketing          （email-marketing）
│       ├─ 外链营销 ▾        /admin/backlinks /admin/backlinks/posts （backlink）
│       ├─ 数据统计 ▾        /admin/analytics /admin/funnel /admin/heatmap /admin/operations （analytics）⚠️ 运营驾驶舱重复
│       ├─ 询盘线索          /admin/leads                    （lead）
│       ├─ 询价报价 ▾        /admin/quotes /admin/quotes/template （quote）
│       ├─ 下载留资          /admin/download-leads           （download-leads）
│       ├─ 会员中心 ▾        /admin/members /admin/member-levels （member）
│       ├─ 前台模板市场      /admin/templates                （frontend-theme）⚠️ 与模板管理重复
│       ├─ 多站点 / 多语言独立站 ▾ /admin/tenants /admin/sites （multi-site）
│       └─ 白标 OEM          /admin/settings/oem             （white-label）⚠️ 与品牌 OEM 重复
│       （mall 在线商城、visit-booking 考察预约：当前 DB plugin_state 已停用 → 不渲染）
│       （ai-video / applet / customer-portal(tickets)：defaultEnabled=false → 未启用时不渲染）
├─ [分组] 站点设置  href='/admin/settings/site'
│   ├─ 站点配置      /admin/settings/site     perm:config:site   plugin:site-config
│   ├─ 首页配置      /admin/settings/home     perm:config:home   plugin:home-config
│   ├─ 定价与价格显示 /admin/settings/pricing  perm:config:site   plugin:site-config
│   ├─ 客户分类管理  /admin/customer-types     perm:config:site   plugin:site-config
│   ├─ 页面头部      /admin/page-hero          perm:page-hero:view plugin:page-hero
│   ├─ 主题配色      /admin/settings/theme     perm:config:theme  plugin:theme
│   ├─ 模板管理      /admin/templates          perm:template:view plugin:template   ⚠️ 与能力市场"前台模板市场"重复
│   ├─ 行业包管理    /admin/industry-packs     perm:config:site
│   ├─ 语种管理      /admin/languages          perm:language:view plugin:language
│   ├─ SMTP 邮件     /admin/settings/smtp      perm:smtp:view     （无 plugin 字段！smtp 插件停用不影响此项显示，与插件机制不一致）
│   ├─ 品牌 OEM      /admin/settings/oem       perm:config:site   ⚠️ 与能力市场"白标 OEM"重复
│   ├─ SEO 优化      /admin/settings/seo       perm:config:site   ⚠️ 与能力市场"SEO/GEO 优化"重复
│   └─ SEO 批量补全  /admin/seo-audit          perm:config:site
├─ [分组] 系统运维  href='/admin/deploy'
│   ├─ 一键部署   /admin/deploy        perm:deploy:view
│   ├─ 系统更新   /admin/system-update perm:system:update
│   ├─ 服务器管理 /admin/servers       perm:deploy:view
│   ├─ 数据库备份 /admin/backup        perm:system:backup
│   └─ 操作日志   /admin/logs          perm:system:log  plugin:analytics  （analytics 插件停用→本项隐藏）
├─ [单入口] 授权管理  /admin/license  perm:license:view
├─ [分组] 权限管理  href='/admin/users'
│   ├─ 用户管理  /admin/users  perm:system:user
│   └─ 角色权限  /admin/roles  perm:system:role
├─ [单入口] 通知中心  /admin/notifications  perm:notification:view
└─ [单入口] 使用说明书  /admin/guide  perm:guide:view
```

---

## 2. 完整路由清单表（路由 → 页面文件 → 侧边栏入口）

> 侧边栏入口列：`有(分组)` / `无·孤儿` / `无·别名(合理)` / `无·插件控制` / `无·认证页(合理)`

| 路由 | 页面文件 | 侧边栏入口 |
|---|---|---|
| /admin | app\admin\page.tsx | 有（控制台） |
| /admin/about | app\admin\about\page.tsx | 有（内容管理） |
| /admin/about/new | app\admin\about\new\page.tsx | 子页（新建，无独立入口，正常） |
| /admin/about/[id]/edit | app\admin\about\[id]\edit\page.tsx | 子页（正常） |
| /admin/ai-autopilot | app\admin\ai-autopilot\page.tsx | 有（能力市场·AI 自动运营） |
| /admin/ai-features | app\admin\ai-features\page.tsx | 有（能力市场·AI 开关矩阵） |
| /admin/ai-knowledge | app\admin\ai-knowledge\page.tsx | 有（能力市场·AI 智能客服→知识库管理） |
| /admin/ai-site-wizard | app\admin\ai-site-wizard\page.tsx | 有（能力市场·AI 建站向导） |
| /admin/ai-video | app\admin\ai-video\page.tsx | 无·插件控制（ai-video 默认停用，启用后动态出现） |
| /admin/analytics | app\admin\analytics\page.tsx | 有（能力市场·数据统计→访客统计） |
| /admin/applet | app\admin\applet\page.tsx | 无·插件控制（applet 默认停用） |
| /admin/auto-collection-tasks | app\admin\auto-collection-tasks\page.tsx | 有（能力市场·内容采集→自动采集任务） |
| /admin/backlinks | app\admin\backlinks\page.tsx | 有（能力市场·外链营销→外链台账） |
| /admin/backlinks/posts | app\admin\backlinks\posts\page.tsx | 有（能力市场·外链营销→软文营销） |
| /admin/backup | app\admin\backup\page.tsx | 有（系统运维·数据库备份） |
| /admin/careers | app\admin\careers\page.tsx | 有（内容管理·招聘职位） |
| /admin/careers/new | app\admin\careers\new\page.tsx | 子页（正常） |
| /admin/careers/[id]/edit | app\admin\careers\[id]\edit\page.tsx | 子页（正常） |
| /admin/collection | app\admin\collection\page.tsx | 有（能力市场·内容采集→采集配置） |
| /admin/content | app\admin\content\page.tsx | 无·别名（redirect → /admin/content-types） |
| /admin/content/[type] | app\admin\content\[type]\page.tsx | 有（经内容管理组具体栏目进入，动态栏目槽位） |
| /admin/content/[type]/new | app\admin\content\[type]\new\page.tsx | 子页（正常） |
| /admin/content/[type]/[id]/edit | app\admin\content\[type]\[id]\edit\page.tsx | 子页（正常） |
| /admin/content-types | app\admin\content-types\page.tsx | 有（能力市场·通用内容模型，动态） |
| /admin/customer-types | app\admin\customer-types\page.tsx | 有（站点设置·客户分类管理） |
| /admin/deploy | app\admin\deploy\page.tsx | 有（系统运维·一键部署） |
| /admin/download-leads | app\admin\download-leads\page.tsx | 有（能力市场·下载留资，动态） |
| /admin/email-marketing | app\admin\email-marketing\page.tsx | 有（能力市场·EDM 邮件营销，动态） |
| /admin/forms | app\admin\forms\page.tsx | **无·孤儿**（form-builder 在 STATIC 排除集但无静态入口） |
| /admin/funnel | app\admin\funnel\page.tsx | 有（能力市场·数据统计→销售漏斗） |
| /admin/gateway | app\admin\gateway\page.tsx | **无·权限隐藏**（静态项 plugin:view 不存在→全用户不可见） |
| /admin/guide | app\admin\guide\page.tsx | 有（使用说明书） |
| /admin/heatmap | app\admin\heatmap\page.tsx | 有（能力市场·数据统计→访客热力图） |
| /admin/home-sections | app\admin\home-sections\page.tsx | **无·孤儿**（home-sections 在 STATIC 排除集但无静态入口） |
| /admin/industry-packs | app\admin\industry-packs\page.tsx | 有（站点设置·行业包管理） |
| /admin/inquiries | app\admin\inquiries\page.tsx | 无·别名（redirect → /admin/leads） |
| /admin/languages | app\admin\languages\page.tsx | 有（站点设置·语种管理） |
| /admin/leads | app\admin\leads\page.tsx | 有（能力市场·询盘线索，动态） |
| /admin/license | app\admin\license\page.tsx | 有（授权管理） |
| /admin/login | app\admin\login\page.tsx | 无·认证页（合理） |
| /admin/logs | app\admin\logs\page.tsx | 有（系统运维·操作日志） |
| /admin/member-levels | app\admin\member-levels\page.tsx | 有（能力市场·会员中心→等级与权益，动态） |
| /admin/members | app\admin\members\page.tsx | 有（能力市场·会员中心→会员中心，动态） |
| /admin/menus | app\admin\menus\page.tsx | 有（内容管理·菜单管理） |
| /admin/notifications | app\admin\notifications\page.tsx | 有（通知中心） |
| /admin/operations | app\admin\operations\page.tsx | 有（顶层单入口 + 能力市场·数据统计子项，**双入口**） |
| /admin/page-hero | app\admin\page-hero\page.tsx | 有（站点设置·页面头部） |
| /admin/plugins | app\admin\plugins\page.tsx | **无·权限隐藏**（静态项 plugin:view 不存在→全用户不可见；仅插件页内部 PluginBackBar 引用） |
| /admin/product-categories | app\admin\product-categories\page.tsx | 有（内容管理·产品分类） |
| /admin/quotes | app\admin\quotes\page.tsx | 有（能力市场·询价报价→报价询价单，动态） |
| /admin/quotes/template | app\admin\quotes\template\page.tsx | 有（能力市场·询价报价→报价单模板，动态） |
| /admin/resource-categories | app\admin\resource-categories\page.tsx | 有（内容管理·资源分类） |
| /admin/resources | app\admin\resources\page.tsx | 有（内容管理·资源管理） |
| /admin/resources/new | app\admin\resources\new\page.tsx | 子页（正常） |
| /admin/resources/[id]/edit | app\admin\resources\[id]\edit\page.tsx | 子页（正常） |
| /admin/roles | app\admin\roles\page.tsx | 有（权限管理·角色权限） |
| /admin/seo-audit | app\admin\seo-audit\page.tsx | 有（站点设置·SEO 批量补全） |
| /admin/servers | app\admin\servers\page.tsx | 有（系统运维·服务器管理） |
| /admin/settings/ai | app\admin\settings\ai\page.tsx | 有（能力市场·AI 智能客服子项 + AI 文本，**双入口**） |
| /admin/settings/home | app\admin\settings\home\page.tsx | 有（站点设置·首页配置） |
| /admin/settings/languages | app\admin\settings\languages\page.tsx | **无·孤儿**（全代码无任何引用） |
| /admin/settings/oem | app\admin\settings\oem\page.tsx | 有（站点设置·品牌 OEM + 能力市场·白标 OEM，**双入口**） |
| /admin/settings/pricing | app\admin\settings\pricing\page.tsx | 有（站点设置·定价与价格显示） |
| /admin/settings/seo | app\admin\settings\seo\page.tsx | 有（站点设置·SEO 优化 + 能力市场·SEO/GEO 优化，**双入口**） |
| /admin/settings/site | app\admin\settings\site\page.tsx | 有（站点设置·站点配置） |
| /admin/settings/smtp | app\admin\settings\smtp\page.tsx | 有（站点设置·SMTP 邮件） |
| /admin/settings/theme | app\admin\settings\theme\page.tsx | 有（站点设置·主题配色） |
| /admin/settings/translate | app\admin\settings\translate\page.tsx | 有（能力市场·AI 多语言翻译→翻译配置，动态） |
| /admin/setup | app\admin\setup\page.tsx | 无·初始化页（合理） |
| /admin/shop | app\admin\shop\page.tsx | 无·插件控制（mall 已停用；启用后动态出现"商品管理"） |
| /admin/shop/categories | app\admin\shop\categories\page.tsx | 无·插件控制（mall 已停用） |
| /admin/shop/coupons | app\admin\shop\coupons\page.tsx | 无·插件控制（mall 已停用） |
| /admin/shop/orders | app\admin\shop\orders\page.tsx | 无·插件控制（mall 已停用） |
| /admin/shop/products | app\admin\shop\products\page.tsx | 无·别名（历史/外部入口兜底，mall adminUrls 未收录） |
| /admin/shop/stats | app\admin\shop\stats\page.tsx | 无·插件控制（mall 已停用） |
| /admin/sites | app\admin\sites\page.tsx | 有（能力市场·多站点→站点管理，动态） |
| /admin/system-update | app\admin\system-update\page.tsx | 有（系统运维·系统更新） |
| /admin/templates | app\admin\templates\page.tsx | 有（站点设置·模板管理 + 能力市场·前台模板市场，**双入口**） |
| /admin/tenants | app\admin\tenants\page.tsx | 有（能力市场·多站点→租户管理，动态） |
| /admin/tickets | app\admin\tickets\page.tsx | 无·插件控制（customer-portal 默认停用） |
| /admin/translate-batch | app\admin\translate-batch\page.tsx | 有（能力市场·AI 多语言翻译→批量翻译，动态） |
| /admin/users | app\admin\users\page.tsx | 有（权限管理·用户管理） |
| /admin/visit-bookings | app\admin\visit-bookings\page.tsx | 无·插件控制（visit-booking 已停用） |

---

## 3. 问题清单

### P1 权限码缺失 → 4 个菜单项对所有用户永久隐藏（最严重）
- **现状**：AdminSidebar 使用 `case:view`、`faq:view`、`plugin:view` 三个权限码，但 `permissions` 表 57 条记录中**均不存在**。用户 permissions 由 auth.ts 从 role_permissions 直接 flatMap（无通配/超管豁免），`hasPerm` 一律 false。
- **受影响的菜单项**：
  1. 内容管理 → 成功案例（/admin/content/case）
  2. 内容管理 → 常见问题（/admin/content/faq）
  3. 能力市场 → 插件启停中心（/admin/plugins）——**"插件启停中心"自身因权限码缺失不可见，形成自相矛盾：动态插件入口挂在能力市场组下，但管理这些插件的入口却隐藏**
  4. 能力市场 → API 网关（/admin/gateway）
- **诊断**：新增菜单项时未同步在 permissions 表建码/给角色授权（content-case/content-faq 插件已注册但权限码漏建；plugin:view 属纯静态项从未入库）。admin 角色虽是"全部权限"，但"全部"仅指表内 57 条。
- **建议**：① 在 permissions 表补建 `case:view/manage`、`faq:view/manage`、`plugin:view/manage` 并给 admin 角色授权（editor 按需）；② 或删除静态菜单中无对应实现的成功案例/常见问题入口（改由通用内容模型管理）；③ 长期：为 admin 增加"超管=所有权限"的代码级豁免，避免每次新增权限码都漏授权。

### P2 能力市场分组职责严重失焦（16 个动态入口全部塞入一组）
- **现状**：能力市场组 = 5 个静态子项（其中 2 个因 P1 隐藏）+ 16 个动态插件入口（当前 14 个），涵盖：内容模型、AI 客服/翻译/文本、SEO、内容采集、邮件营销、外链营销、数据统计、询盘线索、询价报价、下载留资、会员中心、商城（停用中）、模板市场、多站点/租户、白标 OEM。
- **诊断**：按插件注册表的 `category` 本有 ai/seo/content/marketing/data/system/integration 七类，但侧边栏没有按 category 分组，全部平铺在"能力市场"。营销类（会员/商城/询价/下载留资/邮件营销）与系统类（多站点/白标/OEM）与站点设置、系统运维职责重叠，是"菜单分类很乱"的第一大来源。
- **建议**：能力市场组只保留"插件启停中心 + API 网关 + AI 能力"；将营销类动态插件收敛为独立"营销与商机"分组（询盘线索/询价报价/下载留资/EDM/会员/商城/考察预约/表单），将系统类（多站点/白标 OEM）移入站点设置，将 SEO 类移入 SEO 相关分组，内容模型移入内容管理。

### P3 重复入口（5 个路由出现 2 次）
| 路由 | 入口 A | 入口 B |
|---|---|---|
| /admin/operations | 顶层单入口"运营驾驶舱" | 能力市场·数据统计→运营驾驶舱 |
| /admin/settings/ai | 能力市场·AI 智能客服→AI 客服设置 | 能力市场·AI 文本 |
| /admin/settings/oem | 站点设置·品牌 OEM | 能力市场·白标 OEM |
| /admin/settings/seo | 站点设置·SEO 优化 | 能力市场·SEO/GEO 优化 |
| /admin/templates | 站点设置·模板管理 | 能力市场·前台模板市场 |
- **诊断**：静态菜单与动态插件入口缺乏统一去重（STATIC_SIDEBAR_PLUGIN_KEYS 只覆盖了部分 key；seo/white-label/frontend-theme/analytics/member 等 key 未列入排除集；ai-text 与 ai-customer-service 共用同一 adminUrl 未去重）。
- **建议**：动态入口生成前按 href 全量去重（保留静态入口、剔除动态重复）；或把白标/SEO/模板等并入静态菜单后从能力市场移除。

### P4 孤儿页面（3 个，侧边栏无任何入口且无引用）
1. **/admin/settings/languages**：全代码（app/components/lib）无任何引用，疑似旧版语种页残留；当前语种管理走 /admin/languages。
2. **/admin/forms**（通用表单）：form-builder 插件被 `STATIC_SIDEBAR_PLUGIN_KEYS` 排除动态追加，但静态菜单里**没有** form-builder 对应项 → 只能直连 URL 访问。
3. **/admin/home-sections**（前台组件市场）：home-sections 同样在排除集中但无静态入口 → 孤儿。
- **诊断**：STATIC_SIDEBAR_PLUGIN_KEYS 的语义是"已有静态入口的插件不动态追加"，但 form-builder / home-sections 属于"被排除却没有静态入口"的漏网项。
- **建议**：在站点设置补建"通用表单"、"首页区块"静态入口（或从排除集移除，让它们动态追加）。

### P5 内容管理分组路径混乱 + 混入配置项
- **现状**：同组 12 个子项使用两套 URL 约定：`/admin/content/*`（产品/新闻/行业/服务/案例/FAQ，走通用内容模型动态路由）与 `/admin/*`（资源/职位/关于/菜单/产品分类/资源分类，走独立老页面）。
- **诊断**：历史演进导致"通用内容模型"与"独立模块"并存且同组混排；"产品分类/资源分类"属分类配置，放在内容管理组内与栏目管理混在一起；成功案例/常见问题因 P1 隐藏。
- **建议**：统一为 content/[type] 架构（存量独立页迁移）或至少在组内加"栏目 / 分类"分隔线；分类配置可下沉到对应栏目子页面或独立"分类管理"组。

### P6 SMTP 菜单项与插件机制脱节
- **现状**：静态项 `SMTP 邮件`（/admin/settings/smtp）声明了权限 `smtp:view` 但**没有 `plugin:'smtp'` 字段**；而 smtp 插件存在于注册表且被 STATIC 集覆盖。
- **诊断**：停用 smtp 插件后该项仍显示（插件机制对此项失效），与"停用即隐藏入口"的插件设计不一致；其余站点设置项均带 plugin 字段。
- **建议**：静态项补 `plugin: 'smtp'`。

### P7 动态插件入口无权限过滤（editor 越权可见）
- **现状**：dynamicPluginChildren 不携带 permission，渲染过滤 `hasPerm(undefined)` 恒为 true。editor 角色（26 权限，无 config/system/license 等）登录后仍能看到能力市场全部动态入口：会员中心、多站点/租户/站点管理、询价报价、下载留资、外链营销、白标 OEM、模板市场等。
- **诊断**：插件注册表 manifest 未声明权限码，侧边栏也未映射"插件 → 权限"，权限控制只靠页面级 API 自行校验，入口层无拦截。
- **建议**：插件 manifest 增加 permission 声明，动态入口生成时做权限过滤（与静态项一致）。

### P8 分组间职责重叠（站点设置 vs 能力市场 vs 系统运维）
- 站点设置（13 项）里混入"SEO 批量补全"（/admin/seo-audit，属 SEO 工具而非站点设置）、"行业包管理"（内容/数据包）、"客户分类管理"（CRM 配置）；"SEO 优化/品牌 OEM/模板管理"又与能力市场重复（P3）。
- 系统运维里"操作日志"依赖 analytics 插件：停用 analytics 后操作日志入口消失，但 system:log 权限仍存在，语义错位。
- **建议**：按"内容 / 营销 / 站点 / 系统"四域重排分组；将 SEO 相关（优化/批量补全/外链/回链）聚为一个 SEO 分组；操作日志从 analytics 插件解耦（属系统安全日志）。

---

## 4. 权限码对照表

### 4.1 侧边栏用到的权限码 vs DB
| 侧边栏权限码 | 用在哪 | permissions 表 | admin 角色 | editor 角色 |
|---|---|---|---|---|
| product:view | 产品管理/产品分类 | ✅ id=1 | ✅ | ✅ |
| news:view | 新闻管理 | ✅ id=5 | ✅ | ✅ |
| resource:view | 资源管理/资源分类 | ✅ id=10 | ✅ | ✅ |
| industry:view | 行业方案 | ✅ id=22 | ✅ | ✅ |
| service:view | 服务内容 | ✅ id=24 | ✅ | ✅ |
| career:view | 招聘职位 | ✅ id=26 | ✅ | ✅ |
| about:view | 关于我们 | ✅ id=28 | ✅ | ✅ |
| menu:view | 菜单管理 | ✅ id=30 | ✅ | ✅ |
| **case:view** | **成功案例** | ❌ 不存在 | ❌ | ❌ |
| **faq:view** | **常见问题** | ❌ 不存在 | ❌ | ❌ |
| **plugin:view** | **插件启停中心/API 网关** | ❌ 不存在 | ❌ | ❌ |
| ai:config | AI 开关矩阵/自动运营/建站向导 | ✅ id=21 | ✅ | ❌ |
| config:site | 站点配置/定价/客户分类/行业包/OEM/SEO/批量补全 | ✅ id=12 | ✅ | ❌ |
| config:home | 首页配置 | ✅ id=14 | ✅ | ❌ |
| config:theme | 主题配色 | ✅ id=13 | ✅ | ❌ |
| page-hero:view | 页面头部 | ✅ id=39 | ✅ | ❌ |
| template:view | 模板管理 | ✅ id=41 | ✅ | ❌ |
| language:view | 语种管理 | ✅ id=37 | ✅ | ❌ |
| smtp:view | SMTP 邮件 | ✅ id=46 | ✅ | ❌ |
| deploy:view | 一键部署/服务器管理 | ✅ id=43 | ✅ | ❌ |
| system:update | 系统更新 | ✅ id=19 | ✅ | ❌ |
| system:backup | 数据库备份 | ✅ id=18 | ✅ | ❌ |
| system:log | 操作日志 | ✅ id=17 | ✅ | ❌ |
| license:view | 授权管理 | ✅ id=54 | ✅ | ❌ |
| system:user | 用户管理 | ✅ id=15 | ✅ | ❌ |
| system:role | 角色权限 | ✅ id=16 | ✅ | ❌ |
| notification:view | 通知中心 | ✅ id=56 | ✅ | ❌ |
| guide:view | 使用说明书 | ✅ id=45 | ✅ | ✅ |

> 动态插件入口：无权限码，全部用户可见（见 P7）。

### 4.2 DB 中存在的 57 个权限码（按 module）
- product×4（view/create/edit/delete）
- news×5（view/create/edit/delete/publish）
- resource×2（view/edit）
- industry×2（view/manage）
- service×2（view/manage）
- career×2（view/manage）
- about×2（view/manage）
- menu×2（view/manage）
- lead×2（view/manage）
- download-lead×2（view/manage）
- config×3（site/theme/home）
- system×5（user/role/log/backup/update）
- collect×1（manage）
- ai×1（config）
- analytics×1（view）
- language×2（view/manage）
- page-hero×2（view/manage）
- template×2（view/manage）
- deploy×2（view/manage）
- guide×1（view）
- smtp×2（view/manage）
- translate-config×2（view/manage）
- seo×2（view/manage）
- auto-collection×2（view/manage）
- license×2（view/manage）
- notification×1（view）
- setup×1（view）

### 4.3 角色授权概况
- **admin（id=1，管理员）**：57/57 全量（表中所有权限）。
- **editor（id=2，内容维护）**：26 项 = 内容域全量（product/news/resource/industry/service/career/about/menu 的 view+manage）+ lead:view + download-lead:view + analytics:view + guide:view。**无** config/system/deploy/license/language/page-hero/template/smtp/seo/ai/notification 等系统权限。
- 用户：仅 admin（admin@zuowentech.com，active）。

---

## 5. 分组合理性评估（逐组）

| 分组 | 项数 | 评价 | 主要问题 |
|---|---|---|---|
| 控制台 | 1 | ✅ 合理 | — |
| 运营驾驶舱 | 1 | ⚠️ 职责重复 | 与能力市场·数据统计子项重复（P3）；且无权限声明，editor 可见 |
| 内容管理 | 12（2 隐藏） | ⚠️ 基本合理但需治理 | 路径两套（/admin/content/* vs /admin/*）；成功案例/常见问题因权限码缺失隐藏；分类配置混入（P5） |
| 能力市场 | 5 静态 + 14~16 动态 | ❌ 严重失焦 | 营销/系统/SEO/多站点全塞一组（P2）；启停入口自身被隐藏（P1）；动态项无权限过滤（P7） |
| 站点设置 | 13 | ⚠️ 偏多且混入非设置项 | SEO 批量补全/行业包/客户分类非"站点设置"；SEO/OEM/模板与能力市场重复（P3/P8）；SMTP 无 plugin 字段（P6） |
| 系统运维 | 5 | ✅ 最清晰 | 操作日志依赖 analytics 插件，停用即消失，语义错位（P8） |
| 授权管理 | 1 | ✅ 合理 | — |
| 权限管理 | 2 | ✅ 合理 | — |
| 通知中心 | 1 | ✅ 合理 | — |
| 使用说明书 | 1 | ✅ 合理 | — |

---

## 6. 最严重的 3 个分类问题（供优化方案立项）

1. **权限码体系与菜单脱节（P1+P7）**：3 个权限码未入库导致"插件启停中心/API 网关/成功案例/常见问题"四个入口对所有用户隐身（admin 也看不见，连管理插件的入口都被权限机制自己藏掉）；同时动态插件入口完全不做权限过滤，editor 能看到会员/多站点/租户等系统级入口。入口可见性与权限体系双向失真。
2. **能力市场成为"大杂烩"（P2+P3）**：16 个动态插件入口全部平铺在能力市场组，营销类、SEO 类、系统类、多站点类互相混杂，且其中 5 个路由与站点设置/顶层导航重复出现，是"分类很乱"的直接观感来源。
3. **同组路径/职责不统一（P5+P8）**：内容管理组混用 content/[type] 与独立页两套 URL；站点设置组混入 SEO 工具、数据包、CRM 配置等非设置项；插件机制在 SMTP、操作日志等项上表现不一致（有的隐藏、有的不隐藏）。

---

## 附录：静态菜单与插件排除集核对

`STATIC_SIDEBAR_PLUGIN_KEYS`（20 个）：content-product / content-news / content-resource / content-industry / content-service / content-case / content-faq / content-career / content-about / content-menu / ai-autopilot / site-config / home-config / page-hero / theme / template / language / smtp / form-builder / home-sections

- 有静态入口且匹配 ✅：前 16 个（content-*、ai-autopilot、site-config、home-config、page-hero、theme、template、language、smtp）
- 在排除集但**无静态入口** ❌：form-builder（→/admin/forms 孤儿）、home-sections（→/admin/home-sections 孤儿）
- 注册表中**未排除**且产生重复/冗余动态入口 ⚠️：seo（/admin/settings/seo）、white-label（/admin/settings/oem）、frontend-theme（/admin/templates）、analytics（/admin/operations 子项）、ai-text（/admin/settings/ai）、content-types（归入能力市场，建议移入内容管理）
