# VALTRIX 后台菜单优化方案

> 文档版本：v1.0
> 更新时间：2026-09-10
> 分析范围：`components/admin/AdminSidebar.tsx` + `lib/plugins/registry.ts` + `app/admin/**` 全部页面 + 数据库 `permissions/roles/role_permissions/site_config` 只读查询 + 线上服务器 `47.57.241.85` 只读核实
> 硬约束：本方案仅为分析与建议，**未修改任何代码/数据库**；待用户确认后再执行整改。

---

## 一、现状全貌

### 1.1 后台规模

| 指标 | 数值 |
|---|---|
| 顶层导航项（分组 + 单入口） | **10**（5 个可展开分组 + 5 个单入口） |
| 静态菜单项 | **42**（含 5 个分组父级） |
| 动态插件入口（默认全启用） | **16**（当前 mall/visit-booking 停用后实显 14） |
| 后台可访问路由 | **~73 个**（85 个 page.tsx 含 new/edit/[id] 子页） |
| permissions 表权限码 | **57 条**（admin 全量 57、editor 26） |

### 1.2 现有侧边栏分组树

```
├─ [单入口] 控制台          /admin
├─ [单入口] 运营驾驶舱      /admin/operations
├─ [分组] 内容管理
│   ├─ 产品管理      /admin/content/products      perm:product:view
│   ├─ 新闻管理      /admin/content/news          perm:news:view
│   ├─ 资源管理      /admin/resources             perm:resource:view
│   ├─ 行业方案      /admin/content/industries    perm:industry:view
│   ├─ 服务内容      /admin/content/services      perm:service:view
│   ├─ 成功案例      /admin/content/case          perm:case:view    ⚠️ 权限码不存在→隐藏
│   ├─ 常见问题      /admin/content/faq           perm:faq:view     ⚠️ 权限码不存在→隐藏
│   ├─ 招聘职位      /admin/careers               perm:career:view
│   ├─ 关于我们      /admin/about                 perm:about:view
│   ├─ 菜单管理      /admin/menus                 perm:menu:view
│   ├─ 产品分类      /admin/product-categories    perm:product:view
│   └─ 资源分类      /admin/resource-categories   perm:resource:view
├─ [分组] 能力市场
│   ├─ 插件启停中心  /admin/plugins               perm:plugin:view  ⚠️ 权限码不存在→隐藏
│   ├─ API 网关      /admin/gateway               perm:plugin:view  ⚠️ 同上→隐藏
│   ├─ AI 开关矩阵   /admin/ai-features           perm:ai:config
│   ├─ AI 自动运营   /admin/ai-autopilot          perm:ai:config  plugin:ai-autopilot
│   ├─ AI 建站向导   /admin/ai-site-wizard        perm:ai:config  plugin:ai-autopilot
│   └─ 【动态插件入口 ×14，无权限过滤】：
│       ├─ 通用内容模型    /admin/content-types
│       ├─ AI 智能客服 ▾   /admin/settings/ai + /admin/ai-knowledge
│       ├─ AI 多语言翻译 ▾ /admin/translate-batch + /admin/settings/translate
│       ├─ SEO/GEO 优化    /admin/settings/seo          ⚠️ 与站点设置重复
│       ├─ 内容采集 ▾      /admin/collection + /admin/auto-collection-tasks
│       ├─ AI 文本         /admin/settings/ai           ⚠️ 与 AI 智能客服子项重复
│       ├─ EDM 邮件营销    /admin/email-marketing
│       ├─ 外链营销 ▾      /admin/backlinks + /admin/backlinks/posts
│       ├─ 数据统计 ▾      /admin/analytics + /admin/funnel + /admin/heatmap + /admin/operations  ⚠️ 运营驾驶舱重复
│       ├─ 询盘线索        /admin/leads
│       ├─ 询价报价 ▾      /admin/quotes + /admin/quotes/template
│       ├─ 下载留资        /admin/download-leads
│       ├─ 会员中心 ▾      /admin/members + /admin/member-levels
│       ├─ 前台模板市场    /admin/templates             ⚠️ 与站点设置重复
│       ├─ 多站点/租户 ▾   /admin/tenants + /admin/sites
│       └─ 白标 OEM        /admin/settings/oem          ⚠️ 与站点设置重复
├─ [分组] 站点设置
│   ├─ 站点配置        /admin/settings/site      perm:config:site
│   ├─ 首页配置        /admin/settings/home      perm:config:home
│   ├─ 定价与价格显示  /admin/settings/pricing   perm:config:site
│   ├─ 客户分类管理    /admin/customer-types     perm:config:site
│   ├─ 页面头部        /admin/page-hero          perm:page-hero:view
│   ├─ 主题配色        /admin/settings/theme     perm:config:theme
│   ├─ 模板管理        /admin/templates          perm:template:view   ⚠️ 与能力市场重复
│   ├─ 行业包管理      /admin/industry-packs     perm:config:site
│   ├─ 语种管理        /admin/languages          perm:language:view
│   ├─ SMTP 邮件       /admin/settings/smtp      perm:smtp:view      ⚠️ 无 plugin 字段
│   ├─ 品牌 OEM        /admin/settings/oem       perm:config:site    ⚠️ 与能力市场重复
│   ├─ SEO 优化        /admin/settings/seo       perm:config:site    ⚠️ 与能力市场重复
│   └─ SEO 批量补全    /admin/seo-audit          perm:config:site
├─ [分组] 系统运维
│   ├─ 一键部署    /admin/deploy        perm:deploy:view
│   ├─ 系统更新    /admin/system-update perm:system:update
│   ├─ 服务器管理  /admin/servers       perm:deploy:view
│   ├─ 数据库备份  /admin/backup        perm:system:backup
│   └─ 操作日志    /admin/logs          perm:system:log  plugin:analytics  ⚠️ 依赖 analytics 插件
├─ [单入口] 授权管理    /admin/license   perm:license:view
├─ [分组] 权限管理
│   ├─ 用户管理  /admin/users  perm:system:user
│   └─ 角色权限  /admin/roles  perm:system:role
├─ [单入口] 通知中心    /admin/notifications  perm:notification:view
└─ [单入口] 使用说明书  /admin/guide          perm:guide:view
```

### 1.3 路由与入口对照表（关键异常项）

| 路由 | 页面存在 | 侧边栏入口 | 异常类型 |
|---|---|---|---|
| /admin/plugins | ✅ | 有但**隐藏** | 权限码 plugin:view 不存在 |
| /admin/gateway | ✅ | 有但**隐藏** | 同上 |
| /admin/content/case | ✅ | 有但**隐藏** | 权限码 case:view 不存在 |
| /admin/content/faq | ✅ | 有但**隐藏** | 权限码 faq:view 不存在 |
| /admin/settings/languages | ✅ | **无入口** | 孤儿页（旧版残留，当前用 /admin/languages） |
| /admin/forms | ✅ | **无入口** | 孤儿页（form-builder 在排除集但无静态入口） |
| /admin/home-sections | ✅ | **无入口** | 孤儿页（home-sections 在排除集但无静态入口） |
| /admin/operations | ✅ | **双入口** | 顶层单入口 + 能力市场·数据统计子项 |
| /admin/settings/ai | ✅ | **双入口** | AI 智能客服子项 + AI 文本 |
| /admin/settings/oem | ✅ | **双入口** | 站点设置·品牌 OEM + 能力市场·白标 OEM |
| /admin/settings/seo | ✅ | **双入口** | 站点设置·SEO 优化 + 能力市场·SEO/GEO |
| /admin/templates | ✅ | **双入口** | 站点设置·模板管理 + 能力市场·前台模板市场 |

> 完整 73 个路由清单见附录原始分析文件 `_sidebar-analysis-raw.md` 第 2 节。死链数：**0**（所有侧边栏 href 均指向存在的页面）。

---

## 二、问题诊断

### 问题一：能力插件入口缺失（用户反馈 #1）

#### 根因（已确认，本地 + 线上双端核实一致）

**`plugin:view` 权限码在 `permissions` 表中不存在（57 条全量缺失），而 AdminSidebar 的「插件启停中心」「API 网关」两个菜单项硬编码依赖 `hasPerm('plugin:view')`，导致这两个入口对任何角色（含 admin）恒隐藏。**

#### 证据链

1. **权限码缺失**：`SELECT ... WHERE code ILIKE '%plugin%'` → 0 行。permissions 共 57 条，无 `plugin:view`/`plugin:manage`。
2. **种子脚本同样缺失**：`prisma/seed.ts`（21 项）和 `scripts/seed-permissions.js`（30 项，此前"修复权限表"跑的就是它）均未定义 plugin 码。
3. **角色关联**：admin 角色关联全部 57 条权限，但不可能含 `plugin:view`（表里没这条码）。auth.ts 的 `session.user.permissions` 完全由 `role_permissions → permissions.code` 组装，码不存在则永远拿不到。
4. **渲染条件**：AdminSidebar.tsx 第 85-86 行 `permission: 'plugin:view'`；`hasPerm` 逻辑为无声明→可见，有声明→必须在 userPerms 中。
5. **分组未整体隐藏**：能力市场分组只要求 ≥1 个子项，AI 开关矩阵（ai:config 已授予）和 14 个动态插件入口仍在，所以用户看到的是"分组还在，但插件启停中心/API 网关不见了"。

#### 已排除的其他可能

- ❌ 插件状态全 disabled：plugin_state 仅 mall/visit-booking 停用，其余默认启用
- ❌ 页面不存在：/admin/plugins 和 /admin/gateway 页面与 API 均存在，直接访问 URL 可用
- ❌ 租户/站点开关：tenants/sites 表为空，无租户级插件控制
- ❌ pluginOn 加载失败：fetch 失败时 pluginOn 放行（返回 true），不会反向隐藏
- ❌ 线上与本地版本不一致：线上 47.57.241.85 代码与 DB 状态与本地完全一致

#### 伴生问题：另外两个权限码也缺失

同因导致另外两个内容管理入口也被永久隐藏：
- `case:view` → 成功案例（/admin/content/case）
- `faq:view` → 常见问题（/admin/content/faq）

---

### 问题二：菜单分类不合理（用户反馈 #2）

#### P1 权限码与菜单脱节（双向失真）—— 最严重

- **入口被误藏**：plugin:view / case:view / faq:view 三个码不存在 → 4 个入口对所有用户隐身（连管理插件的入口都被权限机制自己藏掉）。
- **入口未受控**：16 个动态插件入口完全不参与权限过滤（无 permission 字段），editor 角色（26 权限，无系统级权限）登录后也能看到会员中心、多站点/租户、白标 OEM、询价报价等系统级/商业级入口。

#### P2 能力市场成"大杂烩"—— 分类混乱的直接来源

16 个动态插件入口（营销/SEO/系统/多站点/AI/内容）全部平铺在「能力市场」一组，其中：
- 营销类（询盘/报价/下载留资/EDM/会员/商城）与站点设置、系统运维职责重叠
- 系统类（多站点/白标 OEM）本应属站点设置
- SEO 类（SEO优化/批量补全/外链）本应独立聚集
- 5 个路由与其他分组重复出现

#### P3 重复入口（5 个路由出现 2 次）

| 路由 | 入口 A | 入口 B |
|---|---|---|
| /admin/operations | 顶层"运营驾驶舱" | 能力市场·数据统计→运营驾驶舱 |
| /admin/settings/ai | 能力市场·AI 智能客服→设置 | 能力市场·AI 文本 |
| /admin/settings/oem | 站点设置·品牌 OEM | 能力市场·白标 OEM |
| /admin/settings/seo | 站点设置·SEO 优化 | 能力市场·SEO/GEO 优化 |
| /admin/templates | 站点设置·模板管理 | 能力市场·前台模板市场 |

根因：静态菜单与动态插件入口缺乏统一去重。`STATIC_SIDEBAR_PLUGIN_KEYS`（20 个）只覆盖了部分插件 key，seo/white-label/frontend-theme/analytics/ai-text 等未列入排除集。

#### P4 孤儿页面（3 个，侧边栏无任何入口）

1. **/admin/settings/languages**：全代码无引用，疑似旧版语种页残留（当前语种管理走 /admin/languages）。
2. **/admin/forms**（通用表单）：form-builder 插件被 STATIC 排除集排除动态追加，但静态菜单里没有对应项 → 只能直连 URL。
3. **/admin/home-sections**（前台组件市场）：同上，在排除集但无静态入口。

#### P5 内容管理分组路径混乱 + 混入配置项

- 同组 12 项混用两套 URL：`/admin/content/*`（产品/新闻/行业/服务/案例/FAQ，走通用内容模型动态路由）与 `/admin/*`（资源/职位/关于/菜单/分类，走独立老页面）。
- "产品分类/资源分类"属分类配置，与栏目管理混排。

#### P6 SMTP 菜单项与插件机制脱节

静态项 SMTP 邮件声明了权限 `smtp:view` 但**没有 `plugin:'smtp'` 字段**；停用 smtp 插件后该项仍显示，与"停用即隐藏入口"的插件设计不一致（其余站点设置项均带 plugin 字段）。

#### P7 操作日志依赖 analytics 插件

系统运维→操作日志声明了 `plugin:'analytics'`，停用 analytics 插件后操作日志入口消失，但 `system:log` 权限仍存在。操作日志属系统安全审计，不应与营销分析插件绑定。

#### P8 站点设置组混入非设置项

13 项中混入：SEO 批量补全（SEO 工具）、行业包管理（内容/数据包）、客户分类管理（CRM 配置）；且 SEO 优化/品牌 OEM/模板管理与能力市场重复（P3）。

---

## 三、优化方案

> 以下提供两个方案，**待用户确认后选择执行**。两个方案均不引入新页面需求、不改动现有路由、不动权限码体系（仅建议补建缺失码）。

### 方案 A：保守微调（推荐先执行，风险最低）

**思路**：在现有 10 个顶层导航结构基础上，修复所有明确 bug，不做大范围分组重组。改动量小、可快速验证。

#### A-1 补建缺失权限码（解决问题一 + P1 入口误藏）

在 `permissions` 表补建 3 个权限码并授予 admin 角色：

| 权限码 | 名称 | 模块 | 操作 | 授予 admin | 授予 editor |
|---|---|---|---|---|---|
| `plugin:view` | 查看插件 | plugin | view | ✅ | ❌ |
| `case:view` | 查看成功案例 | case | view | ✅ | ✅ |
| `faq:view` | 查看常见问题 | faq | view | ✅ | ✅ |

- 同步更新 `scripts/seed-permissions.js` 和 `prisma/seed.ts`，保证新环境初始化一致。
- 执行后需**重新登录**（JWT 缓存旧 permissions）。
- 效果：插件启停中心、API 网关、成功案例、常见问题 4 个入口立即恢复显示。

#### A-2 消除重复入口（解决 P3）

在动态插件入口生成逻辑中增加 **href 去重**：动态入口生成前，先收集所有静态菜单项的 href，动态插件入口若 href 已存在则跳过。

涉及文件：`components/admin/AdminSidebar.tsx`（dynamicPluginChildren 生成处，约第 240-267 行）。

效果：/admin/operations、/admin/settings/ai、/admin/settings/oem、/admin/settings/seo、/admin/templates 不再出现两次（保留静态入口，剔除动态重复）。

#### A-3 补建孤儿页面入口（解决 P4）

| 孤儿页 | 处理方式 | 新增入口位置 |
|---|---|---|
| /admin/forms | 补静态入口 | 站点设置 → 通用表单（perm: config:site, plugin: form-builder） |
| /admin/home-sections | 补静态入口 | 站点设置 → 首页区块（perm: config:home, plugin: home-sections） |
| /admin/settings/languages | 确认是否废弃 | 若为旧版残留则删除页面；若有用则补入口（待确认） |

#### A-4 修复插件机制不一致（解决 P6 + P7）

- SMTP 邮件静态项补 `plugin: 'smtp'` 字段。
- 操作日志移除 `plugin: 'analytics'` 依赖（操作日志属系统安全，不应随营销插件隐藏）。

#### A-5 能力市场分组内排序优化（轻量）

将能力市场内的静态项和动态项按业务相关性排序：插件管理 → AI 能力 → 营销 → 数据 → 系统。不拆分组，仅排序。

#### 方案 A 改动清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `scripts/seed-permissions.js` | 修改 | NEW_PERMS 增加 3 个码 |
| `prisma/seed.ts` | 修改 | permissionsData 同步增加 |
| 数据库 | 写操作 | INSERT 3 条 permissions + INSERT role_permissions（admin 全授，editor 授 case/faq） |
| `components/admin/AdminSidebar.tsx` | 修改 | 动态入口 href 去重 + SMTP 补 plugin + 操作日志移除 plugin + 排序 + 补 forms/home-sections 入口 |
| `app/admin/settings/languages/` | 待定 | 确认后删除或补入口 |

---

### 方案 B：业务域重组（彻底解决分类混乱，改动较大）

**思路**：按"工作台 / 内容 / 营销 / AI / SEO与数据 / 站点 / 系统 / 权限"八大业务域重新分组，彻底消除能力市场大杂烩和重复入口。在方案 A 全部修复的基础上执行。

#### B-1 优化后的菜单结构树

```
├─ [分组] 工作台
│   ├─ 控制台        /admin
│   └─ 运营驾驶舱    /admin/operations              （从顶层单入口移入，消除重复）
│
├─ [分组] 内容管理
│   ├─ 产品管理      /admin/content/products        perm:product:view
│   ├─ 新闻管理      /admin/content/news            perm:news:view
│   ├─ 资源管理      /admin/resources               perm:resource:view
│   ├─ 行业方案      /admin/content/industries      perm:industry:view
│   ├─ 服务内容      /admin/content/services        perm:service:view
│   ├─ 成功案例      /admin/content/case            perm:case:view     （补码后显示）
│   ├─ 常见问题      /admin/content/faq             perm:faq:view      （补码后显示）
│   ├─ 招聘职位      /admin/careers                 perm:career:view
│   ├─ 关于我们      /admin/about                   perm:about:view
│   ├─ 菜单管理      /admin/menus                   perm:menu:view
│   ├─ 通用内容模型  /admin/content-types           （从能力市场移入）
│   ├─ 首页区块      /admin/home-sections           （补入口，消除孤儿）
│   ├─ 产品分类      /admin/product-categories      perm:product:view
│   └─ 资源分类      /admin/resource-categories     perm:resource:view
│
├─ [分组] 营销与商机
│   ├─ 询盘线索      /admin/leads                   perm:lead:view
│   ├─ 询价报价 ▾    /admin/quotes + /admin/quotes/template  perm:lead:view
│   ├─ 下载留资      /admin/download-leads          perm:download-lead:view
│   ├─ EDM 邮件营销  /admin/email-marketing
│   ├─ 会员中心 ▾    /admin/members + /admin/member-levels
│   ├─ 客户分类      /admin/customer-types          （从站点设置移入）
│   ├─ 通用表单      /admin/forms                   （补入口，消除孤儿）
│   ├─ 在线商城 ▾    /admin/shop + ...              （mall 插件停用则隐藏）
│   └─ 考察预约      /admin/visit-bookings          （visit-booking 停用则隐藏）
│
├─ [分组] AI 能力中心
│   ├─ AI 开关矩阵   /admin/ai-features             perm:ai:config
│   ├─ AI 自动运营   /admin/ai-autopilot            perm:ai:config  plugin:ai-autopilot
│   ├─ AI 建站向导   /admin/ai-site-wizard          perm:ai:config  plugin:ai-autopilot
│   ├─ AI 智能客服 ▾ /admin/settings/ai + /admin/ai-knowledge
│   ├─ AI 多语言翻译 ▾ /admin/translate-batch + /admin/settings/translate
│   └─ 内容采集 ▾    /admin/collection + /admin/auto-collection-tasks
│
├─ [分组] SEO 与数据
│   ├─ SEO 优化      /admin/settings/seo            perm:seo:view    （唯一入口，消除重复）
│   ├─ SEO 批量补全  /admin/seo-audit               perm:seo:view    （从站点设置移入）
│   ├─ 外链营销 ▾    /admin/backlinks + /admin/backlinks/posts
│   └─ 数据统计 ▾    /admin/analytics + /admin/funnel + /admin/heatmap
│
├─ [分组] 站点设置
│   ├─ 站点配置      /admin/settings/site            perm:config:site
│   ├─ 首页配置      /admin/settings/home            perm:config:home
│   ├─ 页面头部      /admin/page-hero                perm:page-hero:view
│   ├─ 主题配色      /admin/settings/theme           perm:config:theme
│   ├─ 模板管理      /admin/templates                perm:template:view  （唯一入口）
│   ├─ 语种管理      /admin/languages                perm:language:view
│   ├─ 定价与价格显示 /admin/settings/pricing         perm:config:site
│   ├─ 品牌 OEM      /admin/settings/oem             perm:config:site   （唯一入口）
│   ├─ SMTP 邮件     /admin/settings/smtp            perm:smtp:view  plugin:smtp  （补 plugin）
│   └─ 行业包管理    /admin/industry-packs           perm:config:site
│
├─ [分组] 系统运维
│   ├─ 插件启停中心  /admin/plugins                  perm:plugin:view   （补码后显示，从能力市场移入）
│   ├─ API 网关      /admin/gateway                  perm:plugin:view   （补码后显示）
│   ├─ 多站点/租户 ▾ /admin/tenants + /admin/sites                     （从能力市场移入）
│   ├─ 一键部署      /admin/deploy                   perm:deploy:view
│   ├─ 系统更新      /admin/system-update            perm:system:update
│   ├─ 服务器管理    /admin/servers                  perm:deploy:view
│   ├─ 数据库备份    /admin/backup                   perm:system:backup
│   └─ 操作日志      /admin/logs                     perm:system:log    （移除 analytics 插件依赖）
│
├─ [分组] 权限管理
│   ├─ 用户管理      /admin/users                    perm:system:user
│   └─ 角色权限      /admin/roles                    perm:system:role
│
└─ [单入口]
    ├─ 授权管理      /admin/license                  perm:license:view
    ├─ 通知中心      /admin/notifications            perm:notification:view
    └─ 使用说明书    /admin/guide                    perm:guide:view
```

#### B-2 分组变更说明

| 新分组 | 来源 | 变更说明 |
|---|---|---|
| 工作台 | 原控制台 + 运营驾驶舱 | 运营驾驶舱从顶层单入口降为子项，消除与数据统计的重复 |
| 内容管理 | 原内容管理 + 移入 content-types/home-sections | 补成功案例/FAQ（补码后），补孤儿页入口 |
| 营销与商机 | **新建**，从能力市场拆分 | 询盘/报价/留资/EDM/会员/商城/考察预约/表单/客户分类集中 |
| AI 能力中心 | **新建**，从能力市场拆分 | 所有 AI 相关（开关矩阵/自动运营/建站/客服/翻译/采集）集中 |
| SEO 与数据 | **新建**，从能力市场+站点设置拆分 | SEO优化/批量补全/外链/数据统计集中，消除重复 |
| 站点设置 | 原站点设置（精简） | 移出客户分类/SEO批量补全，消除 OEM/SEO/模板重复，补 SMTP plugin |
| 系统运维 | 原系统运维 + 移入插件管理/API网关/多站点 | 插件启停中心从能力市场移入系统运维（更符合"系统级配置"定位） |
| 权限管理 | 原权限管理 | 不变 |

#### B-3 方案 B 改动清单

在方案 A 全部改动基础上，额外：

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `components/admin/AdminSidebar.tsx` | 重写菜单配置 | 按新分组结构重写 menuItems 数组；动态入口按插件 category 分配到对应分组而非全部塞入能力市场 |
| `lib/plugins/registry.ts` | 可能微调 | 确保每个插件的 category 字段准确（ai/marketing/seo/data/system/content），用于动态入口分组路由 |
| 数据库 | 同方案 A | 补 3 个权限码 + 授权 |

---

### 两个方案对比

| 维度 | 方案 A（保守微调） | 方案 B（业务域重组） |
|---|---|---|
| 解决问题一（插件入口缺失） | ✅ 完全解决 | ✅ 完全解决 |
| 解决重复入口 | ✅ 去重 | ✅ 去重 + 重新分组 |
| 解决孤儿页面 | ✅ 补入口 | ✅ 补入口 |
| 解决"分类很乱" | ⚠️ 部分缓解（能力市场仍大杂烩，仅排序） | ✅ 彻底解决（按业务域拆分） |
| 改动量 | 小（1 个文件 + DB + 种子脚本） | 中（重写 AdminSidebar 菜单配置 + 可能调 registry） |
| 风险 | 低 | 中（菜单结构大变，需全面回归测试） |
| 用户学习成本 | 低（结构基本不变） | 中（需适应新分组） |
| 建议 | **先执行 A，验证后再决定是否升级到 B** | 作为 A 稳定后的二期优化 |

---

## 四、实施步骤与风险

### 4.1 方案 A 实施步骤（预计 30 分钟）

1. **备份**：执行 `node scripts/_local_backup.js` 做本地全量备份（源码 + DB）。
2. **补权限码**：修改 `scripts/seed-permissions.js`（NEW_PERMS 加 3 项）+ `prisma/seed.ts`（permissionsData 同步）。
3. **执行种子**：`node scripts/seed-permissions.js`（幂等，自动补码 + admin 全量授权；editor 授 case:view/faq:view）。
4. **修改 AdminSidebar**：
   - 动态入口生成处加 href 去重逻辑
   - SMTP 项补 `plugin: 'smtp'`
   - 操作日志移除 `plugin: 'analytics'`
   - 站点设置组补 forms、home-sections 两个静态入口
   - 能力市场组内按业务相关性排序
5. **处理 /admin/settings/languages**：确认是否废弃（待用户决策）。
6. **本地验证**：`pnpm dev` 启动，admin 登录后检查：
   - 能力市场→插件启停中心/API 网关是否出现
   - 内容管理→成功案例/常见问题是否出现
   - 5 个重复路由是否只剩一个入口
   - 站点设置→通用表单/首页区块是否出现
   - editor 角色登录验证权限边界
7. **类型检查**：`npx tsc --noEmit` 确保 0 错误。
8. **增量部署**：`node scripts/_deploy_incremental.js` 上传变更文件 + 服务器执行同一种子脚本。
9. **线上验证**：重新登录线上后台，确认入口恢复。

### 4.2 风险点

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 补权限码后旧 JWT 未刷新 | 用户看到入口仍隐藏 | 明确告知需重新登录；或在 auth.ts 加权限变更强制刷新 |
| 动态入口去重逻辑误伤 | 某些动态入口被错误过滤 | 去重仅按 href 精确匹配，保留 label 不同但 href 相同的情况中的静态项 |
| editor 角色看到系统级入口（P7） | 权限越权 | 方案 A 不解决动态入口权限过滤（需插件 manifest 加 permission 声明，属较大改动，建议二期）；可先在方案 A 中为高风险动态入口（多站点/白标/会员）临时加权限判断 |
| /admin/settings/languages 删除 | 如有外部引用会 404 | 先全代码搜索引用，确认无引用再删；或保留页面仅不显示入口 |
| 菜单结构大变（方案 B） | 用户找不到常用功能 | 方案 B 执行前先出新旧对照图；执行后在后台加"菜单更新提示" |

### 4.3 不在本次范围的事项

- 不新增任何后台页面（所有入口均指向已有路由）
- 不改动前台任何代码
- 不改动插件注册表的 defaultEnabled 状态（mall/visit-booking 保持停用）
- 不改动权限码的 module/action 命名体系（仅补建缺失码）
- 不实现动态插件入口的权限过滤（需插件 manifest 改造，建议二期）

---

## 五、待用户确认的决策点

请确认以下事项后，我将执行对应整改：

### 决策 1：选择方案

- **方案 A（保守微调）**：修复 bug + 去重 + 补入口，菜单结构基本不变。**推荐先执行此方案。**
- **方案 B（业务域重组）**：按八大业务域彻底重排菜单，从根本上解决分类混乱。可在 A 稳定后作为二期。
- **A + B 一起做**：直接执行方案 B（内含方案 A 的全部修复）。

### 决策 2：/admin/settings/languages 孤儿页处理

- [ ] 删除该页面（疑似旧版残留，当前语种管理走 /admin/languages）
- [ ] 保留页面并在站点设置补入口
- [ ] 暂不处理，保持现状

### 决策 3：editor 角色是否授予 case:view / faq:view

- [ ] 授予（editor 可管理成功案例和常见问题，与其他内容栏目一致）
- [ ] 不授予（仅 admin 可见）

### 决策 4：插件启停中心的分组位置

- [ ] 保留在「能力市场」分组（方案 A 默认）
- [ ] 移入「系统运维」分组（方案 B 默认，更符合系统级配置定位）

### 决策 5：动态插件入口的权限过滤（二期）

当前 16 个动态插件入口对所有登录用户可见（含 editor）。是否需要在二期为插件 manifest 增加 permission 声明，使动态入口也参与权限过滤？

- [ ] 需要，纳入二期规划
- [ ] 暂不需要，editor 看到入口但页面级 API 会校验权限

---

## 附录

### A. 原始分析文件

- 侧边栏菜单结构原始分析：`D:\阀门网站\docs\admin\_sidebar-analysis-raw.md`（260 行，含完整 73 路由清单、57 权限码对照表、逐组评估）
- 插件入口缺失根因分析：`D:\阀门网站\docs\admin\_plugin-analysis-raw.md`（含代码级证据、线上核实记录、修复方案细节）

### B. 涉及的核心文件

| 文件 | 作用 |
|---|---|
| `components/admin/AdminSidebar.tsx` | 侧边栏菜单定义与渲染逻辑（473 行） |
| `lib/plugins/registry.ts` | 插件注册表（714 行），定义插件 key/category/adminUrl/defaultEnabled |
| `lib/plugins/store.ts` | 插件状态存储（site_config.plugin_state）与启用判断 |
| `app/api/admin/plugins/route.ts` | 插件 API（GET ?mode=enabled / POST / PUT） |
| `scripts/seed-permissions.js` | 权限码种子脚本（此前修复权限表用的就是它） |
| `prisma/seed.ts` | 初始化种子数据 |
| `auth.ts` | 认证与权限组装（session.user.permissions） |

### C. 数据库核心表

- `permissions`（57 条）：id / code / name / module / action
- `roles`（2 条）：admin / editor
- `role_permissions`：admin=57 / editor=26
- `users`（1 条）：admin
- `site_config`：含 `plugin_state`（当前仅 mall/visit-booking 显式停用）
