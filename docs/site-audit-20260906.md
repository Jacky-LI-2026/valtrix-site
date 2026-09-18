# 全站现状盘点 & 优化建议报告（含执行记录）

> 日期：2026-09-06 · 范围：左文科技通用企业建站平台（`D:\企业网站`）
> 方法：代码结构扫描 + 本地 dev（127.0.0.1:3000）后台/前台全路由 HTTP 实测 + 引用分析 + 插件注册表盘点
> 状态：**P1/P2 已全部执行完毕**（2026-09-06），本报告保留原始结论 + 底部"六、执行记录"

---

## 一、站点规模总览

| 维度 | 数量 | 说明 |
|---|---|---|
| 前台页面路由 | 32 | 含 10 个动态路由（products/[tab]/[id]、content/[type] 等）|
| 后台页面 | 90 | 78 静态 + 12 动态（new / [id]/edit / content/[type]）|
| API 路由 | 195+ | app/api 下 route.ts |
| 前台组件 | 64 | components/ |
| 后端模块 | 94 | lib/ |
| 脚本 | 288+ | scripts/（其中 _archive 归档 237 个一次性脚本）|
| 能力市场插件 | 44+ | BUILTIN_PLUGINS 注册（含规划中未实现的）|
| robots / sitemap | ✓ | app/robots.ts、app/sitemap.ts 均已存在 |

---

## 二、功能完整性实测结果

### 后台（登录 admin 后全路由 HTTP 实测）
- ✅ 78 个静态页面 **全部 200**（唯一"404"为 `/admin/` 尾斜杠 308 重定向到 `/admin`，属正常）
- ✅ 动态/编辑页 10+ 抽样全 200：products/news/industries/services/cases/faqs/careers/resources/about 的 `[id]/edit`、`/admin/content/*`、`/admin/translate-batch`、`/admin/sites`
- ✅ 报价单详情走**列表内弹窗**（`openDetail`），非独立路由——`/admin/quotes/1` 404 属设计如此，非 bug

### 前台（公开全路由 HTTP 实测）
- ✅ 33 个页面 **全部 200**：首页、产品、新闻、行业、服务、关于（含 4 个子页）、招聘、资源、联系、FAQ、案例、商城、询价车、考察预约、会员登录、退订、内容型页面（partners/honors）、产品详情、行业详情、服务详情、案例详情、招聘详情、商城商品/购物车/优惠券
- ⚠️ `/forms/1` 404：表单是 slug 动态路由，本地库无表单数据（**待用真实 slug 验证**，非代码故障）

### 插件体系（能力市场）
- ✅ 注册 44+ 插件，覆盖：通用内容模型（9 个内容栏目 + 菜单）、AI 系（客服/翻译/文本/自动运营/建站向导/推荐）、营销系（SEO/采集/EDM/外链/线索/报价/预约/留资/防刷/SMTP/分析）、平台系（模板/站点/首页/页头/主题/语种/表单/商城/会员/视频/小程序/多站点/白标/客户门户等）
- ⚠️ 其中**部分为规划态**（未实现页面），在插件中心标注"规划中"

---

## 三、发现的问题（按优先级，原始结论）

### P1 · 功能缺口

| # | 问题 | 证据 | 处置 |
|---|---|---|---|
| 1 | **会员中心后台管理页缺失** | 原测 `/admin/member` → 404；`member` 插件 adminUrl=`/admin/members` 指向不存在的页面 | **已修复**：API 层已存在（`/api/admin/members` + `[id]`），补齐后台页 `app/admin/members/page.tsx`（列表/搜索/统计/启停/删除/详情抽屉含收藏+订单），并补 API 鉴权 |
| 2 | **email-subscriber 未接线（死代码）** | 初判 prisma 模型 `email_subscriber` 零引用 | **结论修正（非死代码）**：`lib/email-subscriber.ts` + 6 个 API（subscribe/contact/quote/visit-booking/download-lead/email-marketing）均在使用，**保留** |

### P2 · 冗余与优化

| # | 问题 | 证据 | 处置 |
|---|---|---|---|
| 3 | **旧内容模块与新通用内容模型并存** | `app/admin/{news,industries,services,cases,faqs}` 旧列表/new/edit 页面无入口 | **已归档**：6 套旧模块（含 products）页面 + 对应后台 API 移入 `_archive/admin-legacy/`；保留 about/careers/resources（侧边栏仍在用）+ 前台公共 API |
| 4 | **侧边栏分组标题 href 指向旧页面** | 「内容管理」分组 `href: '/admin/products'` | **已改 `'#'`**（仅分组标题，子菜单不动）；并补回 **产品分类/资源分类** 两个丢失的入口 |
| 5 | **API 数量庞大（195）待收敛审计** | 无整体审计记录 | **已做鉴权审计**：全量扫描 `app/api/admin` 无鉴权 API，**30 个高危 API 批量注入 `auth()` 检查**（含 download-leads/visit-bookings/servers/settings-smtp/deploy/package 等数据泄露风险点），匿名访问已全部 401；`setup/status` 为公开设计豁免 |

### P3 · 待验证/说明

| # | 项 | 说明 |
|---|---|---|
| 6 | forms 表单页 | 本地无表单数据；需真实 slug 走查一次 `/forms/<slug>` 全流程（后台建表单→前台提交→后台查看）|
| 7 | lib/utils.ts 引用检测为 0 | 与 AGENTS.md 记录（9 处引用）冲突，属检测正则差异；**确认保留勿删** |
| 8 | 服务器一致性 | 本地与服务器 package.json 均 0.1.0；本次执行内容待增量部署 |

---

## 四、优化空间建议（可执行清单）

### 短期（已完成）
1. ✅ **补齐会员中心后台页**：`app/admin/members/page.tsx` + API 增强（统计/搜索/详情收藏+订单），member 插件 adminUrl 已指向该页
2. ✅ **旧模块归档**：6 套 → `_archive/admin-legacy/`（页面 + API，可恢复），归档前已 grep 确认无内部跳转残留
3. ✅ **侧边栏分组 href 修正**：内容管理 `href:'#'`；补回产品分类/资源分类入口
4. ✅ **固化"入口完整性检查"脚本**：`scripts/_check_entries.js`——页面↔菜单↔插件三向对比 + API 鉴权扫描，发布前必跑（当前结果：全部入口存在 ✓，仅 setup/status 公开豁免）
5. ✅ **email-subscriber 处置**：确认非死代码，保留

### 中期（产品化方向）
6. **API 收敛**：鉴权审计已完成；未使用 API 的归档可后续按需做
7. **能力市场"规划态"插件统一展示**：已注册未实现的插件（applet/multi-site/customer-portal 等）在插件中心标注"规划中"
8. **通用内容模型增强**：视频内容（video-content）、AI 视频（ai-video）插件落地后，内容模型加 media 字段（已有规划）

### 长期（架构级，已在方案主文档）
9. 多站点/白标/小程序端（已规划，排在多租户之前）
10. 插件 SDK 化（lib/plugins/sdk.ts 已就绪）→ 能力市场开放第三方插件

---

## 五、结论（原始）

- **全站功能健康度高**：111 个前后台页面路由实测仅 2 个 404（1 个属设计、1 个缺数据），无 500 错误
- **最大单点缺口**：会员中心后台管理页（P1-1）——已修复
- **最大冗余**：旧内容模块 6 套代码——已归档
- 以上 P1/P2 修复已在 2026-09-06 执行完毕

---

## 六、执行记录（2026-09-06 新增）

### 1. 会员中心后台管理页（P1-1）
- **根因**：member 插件 `adminUrl: "/admin/members"`（带 s），API 层 `app/api/admin/members` 早已实现，但**页面缺失** → 侧边栏入口点进去 404。原报告 `/admin/member` 404 为路径少写 s 的误报。
- **改动**：
  - `app/api/admin/members/route.ts`：GET 补 `auth()` 鉴权 + 统计（total/active/disabled/todayNew）+ 搜索支持 phone
  - `app/api/admin/members/[id]/route.ts`：GET/PUT/DELETE 补 `auth()`；新增 GET 详情（会员信息 + 收藏 50 条含产品 + 商城订单 20 条）
  - `app/admin/members/page.tsx`（新建）：统计卡 + 搜索 + 表格 + 启用/禁用 + 删除（confirm）+ 详情抽屉（收藏/订单）
- **验证**：E2E 注册→列表→详情→禁用→恢复→删除全闭环；匿名 401；tsc 0

### 2. 旧模块归档（P2-3）
- **归档**（移入 `_archive/admin-legacy/`，可恢复）：
  - 页面：`app/admin/{news,industries,services,cases,faqs,products}/`（各含 page/new/[id]/edit）
  - API：`app/api/admin/{news,industries,services,cases,faqs,products}/`
  - 组件：`components/admin/AICollectionButton.tsx`（仅旧新闻页用）
- **保留**：`app/admin/{about,careers,resources}`（侧边栏仍在用）、全部前台公共 API（`/api/public/*`）、ContentRowActions（about/careers/resources 在用）
- **注意**：归档目录 `_archive` 已加入 tsconfig exclude，否则 tsc 报旧页面 import 错误
- **验证**：/admin/news、/admin/products → 404（预期）；/admin/content/* 全 200；前台 /news /products 200；tsc 0

### 3. 侧边栏修正（P2-4）
- 「内容管理」分组 `href: '/admin/products'` → `'#'`
- **补回丢失入口**：产品分类 `/admin/product-categories`、资源分类 `/admin/resource-categories`（AGENTS 曾记录入口，重构后丢失，页面成孤儿）

### 4. 入口完整性检查脚本（P2-5）
- `scripts/_check_entries.js`：四段检查——①侧边栏静态 href → 页面存在性；②插件 adminUrl（含 adminUrls 数组）→ 页面存在性；③app/admin 孤儿页面提示；④后台 API 鉴权扫描（GET 无 auth 警告）
- 当前结果：侧边栏 46 入口 + 插件 28 入口全 ✓；孤儿仅 login/setup（合理）；鉴权仅 setup/status 豁免

### 5. API 鉴权审计与修复（P2-6）
- **发现**：30 个后台 API 匿名可访问（HTTP 200），含高危数据泄露点：
  - 客户数据：`download-leads`（留资导出）、`visit-bookings`（预约手机号）、`email-marketing`（订阅者）
  - 基础设施：`servers`（SSH 服务器配置）、`settings/smtp`（SMTP 密码）、`settings/ai`（AI key）、`deploy/package`（触发打包）、`deploy/status`、`deploy/environment`
  - 平台配置：`plugins`、`plugins/gateway`、`page-config`、`license`、`notifications`、`ai-autopilot`、`ai-features`、`gateway`、`templates`、`tenants`、`sites`、`site-scope`、`shop/*`（orders/coupons/categories/products/stats）
- **修复**：30 个 route.ts 批量注入 `auth()` 检查（`session?.user` 缺失返回 401）
- **豁免**：`/api/admin/setup/status`（初始化检测，公开设计）
- **验证**：匿名全 401 ✓；登录后全 200 ✓；24 个关键后台页面 200 ✓；tsc 0

### 6. email-subscriber 结论修正（P1-2）
- 初判"零引用死代码"系审计正则遗漏。实际：`lib/email-subscriber.ts` 被 6 个 API 引用（subscribe/contact/quote/visit-booking/download-lead/email-marketing），为 EDM 订阅核心数据 → **保留，不处置**

### 7. 待办
- **部署**：以上改动需增量部署到服务器（`node scripts/_deploy_incremental.js`）
- **P3-6**：forms 真实 slug 走查（后台建表单→前台提交→后台查看）待做
