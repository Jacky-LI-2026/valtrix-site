# 双站代码 Bug 修复清单与同步记录

**整理日期**：2026-09-11
**涉及仓库**：
- 左文科技站：`D:\企业网站`（服务器 8.130.65.182，pm2 zuowen-web，DB zuowen_admin，域名 zuowentech.com）
- VALTRIX 阀门站：`D:\阀门网站`（服务器 47.57.241.85，pm2 valtrix，DB zuowen_valve，域名 valvetrix.com）

**同步原则**：仅同步纯代码修复，品牌内容（公司名/电话/邮箱/域名/产品数据/价格/UNILOK 模板/OEM）各仓保留，禁止覆盖。阀门站从左文站 2026-09-08 版本 fork，本次同步方向以阀门→左文为主（阀门 9-08 后做了 QA 修复），同时反向核查左文→阀门。

---

## 一、本次同步已修复的代码 Bug（共 25 项，左文 24 项 + 阀门 1 项）

### A. RTL / bidi 修复（ar 语种电话/邮箱乱序）

| 编号 | 问题描述 | 涉及文件 | 修复方式 | 左文 | 阀门 | 备注 |
|------|----------|----------|----------|------|------|------|
| B01 | ar 语种下联系页电话号码 bidi 乱序（M3） | `app/contact/page.tsx` | 电话/邮箱值用 `<bdi dir="ltr">` 包裹（IIFE 判断电话/邮箱格式） | ✓ 2026-09-11 | ✓ 已有 | 左文原仅有 dir="ltr" span 且邮箱未隔离；M2 标签重复左文已有去重逻辑无需改 |
| B02 | 服务详情页联系电话/邮箱 ar 下乱序 | `app/services/[slug]/ServiceDetailClient.tsx` | `<p>` 内电话/邮箱包 `<bdi dir="ltr">` | ✓ 2026-09-11 | ✓ 已有 | 品牌电话/邮箱值保留各仓 |
| B03 | 产品详情页联系电话/邮箱 ar 下乱序 | `app/products/[tab]/[id]/ProductDetailClient.tsx` | 两处 `<span>` 电话/邮箱改 `<bdi dir="ltr">` | ✓ 2026-09-11 | ✓ 已有 | |
| B04 | 页脚电话/邮箱 ar 下乱序 + 地址多语言对象兼容 | `components/layout/Footer.tsx` | 电话/邮箱包 `<bdi dir="ltr">`；地址 `{addr}` 兼容多语言对象 `addr?.[locale]\|\|addr?.zh` | ✓ 2026-09-11 | ✓ 已有 | |
| B05 | CTA 区块电话 ar 下乱序 | `components/sections/CTA.tsx` | `{phone}` 包 `<bdi dir="ltr">` | ✓ 2026-09-11 | ✓ 已有 | |

### B. 加载态字典化（硬编码"加载中..."未本地化，M1）

| 编号 | 问题描述 | 涉及文件 | 修复方式 | 左文 | 阀门 |
|------|----------|----------|----------|------|------|
| B06 | 案例列表页加载态硬编码中文 | `app/cases/page.tsx` | `"加载中..."` → `{t("loading")}` | ✓ 2026-09-11 | ✓ 已有 |
| B07 | 案例详情页加载态硬编码中文 | `app/cases/[slug]/page.tsx` | 同上 | ✓ 2026-09-11 | ✓ 已有 |
| B08 | 服务列表页加载态硬编码中文 | `app/services/page.tsx` | 同上 | ✓ 2026-09-11 | ✓ 已有 |
| B09 | 资源列表页加载态硬编码中文 | `app/resources/page.tsx` | 同上 | ✓ 2026-09-11 | ✓ 已有 |
| B10 | 资源分类页加载态硬编码中文 | `app/resources/[type]/page.tsx` | 同上 | ✓ 2026-09-11 | ✓ 已有 |
| B11 | FAQ 页加载态硬编码中文 | `app/faqs/page.tsx` | 同上 | ✓ 2026-09-11 | ✓ 已有 |
| B12 | 新闻详情页加载态 + 404 文案硬编码中文 | `app/news/[slug]/NewsDetailClient.tsx` | `"加载中..."`→`t("loading")`；`"页面不存在"`→`t("notFound")`；`"返回新闻列表"`→`t("backToNews")` | ✓ 2026-09-11 | ✓ 已有 |
| B13 | 关于页加载态硬编码中文 | `app/about/page.tsx` | `"加载中..."` → `{t("loading")}` | ✓ 2026-09-11 | ✓ 已有 |

> 注：`careers/page.tsx`、`industries/page.tsx`、`ServiceDetailClient.tsx`、`JobDetailClient.tsx`、`AboutSectionClient.tsx`、`IndustryDetailClient.tsx` 此前已用 `t("loading")`，无需修改。

### C. Header 导航竞态与品牌位修复

| 编号 | 问题描述 | 涉及文件 | 修复方式 | 左文 | 阀门 |
|------|----------|----------|----------|------|------|
| B14 | 切换语种时旧语种菜单残留闪烁 | `components/layout/Header.tsx` | 菜单 useEffect 开头加 `setApiNavItems([]); setNavLoading(true)` | ✓ 2026-09-11 | ✓ 已有 |
| B15 | 菜单加载中错误回退静态菜单（闪现后台已隐藏项） | `components/layout/Header.tsx` | `finalNavItems` 回退条件改为 `navLoading ? [] : navItems` | ✓ 2026-09-11 | ✓ 已有 |
| B16 | 桌面导航无加载骨架 | `components/layout/Header.tsx` | `navLoading && apiNavItems.length===0` 时显示 animate-pulse 加载文案 | ✓ 2026-09-11 | ✓ 已有 |
| B17 | 中文站名被 toUpperCase 污染 en 品牌位 | `components/layout/Header.tsx` | siteBrand en 字段加正则 `/^[a-zA-Z]{2,}$/` 判断，非纯字母保留原 en 值 | ✓ 2026-09-11 | ✓ 已有 | 初始品牌值 `{zh:"左文科技",en:"ZUO WEN TECHNOLOGY"}` 保留 |

### D. 组件逻辑与类型修复

| 编号 | 问题描述 | 涉及文件 | 修复方式 | 左文 | 阀门 |
|------|----------|----------|----------|------|------|
| B18 | Stats 数字计数 target 变化时残留旧值 | `components/sections/Stats.tsx` | useCountUp 中 `!start` 分支加 `setCount(target)` 同步显示 | ✓ 2026-09-11 | ✓ 已有 | 品牌统计数值未动 |
| B19 | 行业列表/详情页 isEn 判断导致 ja/ko/fr/ar 下挂英文副标题 | `components/sections/Industries.tsx`、`app/industries/[slug]/IndustryDetailClient.tsx` | 删除 `const isEn = locale==="en"`；`!isEn` → `locale==="zh"` | ✓ 2026-09-11 | ✓ 已有 |
| B20 | 职位列表页 benefits 兜底数组缺 ja/ko/fr/ar 字段 | `app/careers/page.tsx` | 4 项福利补全 `titleJa/Ko/Fr/Ar` + `descJa/Ko/Fr/Ar` | ✓ 2026-09-11 | ✓ 已有 | 通用 HR 文案，非品牌内容 |
| B21 | AboutSection 接口缺多语言字段声明 | `lib/about.ts` | `content[]` 补 `headingJa/Ko/Fr/Ar`、`paragraphsJa/Ko/Fr/Ar` 可选字段 | ✓ 2026-09-11 | ✓ 已有 | 类型安全对齐 |
| B22 | ProductModel 接口缺 DB 已有字段声明 | `lib/products.ts` | 补 `nameJa/Ko/Fr/Ar`、`subtitle/En`、`summary/En` 可选字段 | ✓ 2026-09-11 | ✓ 已有 | |

### E. 后台管理修复

| 编号 | 问题描述 | 涉及文件 | 修复方式 | 左文 | 阀门 |
|------|----------|----------|----------|------|------|
| B23 | 模板管理页 currentSlug 空值无回退 + 无"当前使用中"标识 | `app/admin/templates/page.tsx` | currentSlug 回退 `'default'` + catch 回退；模板卡加绿色"当前使用中"徽章；加"预览"按钮；页头补充说明文案 | ✓ 2026-09-11 | ✓ 已有 | |
| B24 | 后台表格小屏内容被裁剪（无横向滚动） | `app/admin/shop/page.tsx`、`components/admin/ContentTypeList.tsx` | `overflow-hidden` → `overflow-x-auto`；table 加 `min-w-[720px]/[960px]` | ✓ 2026-09-11 | ✓ 已有 | |

### F. 阀门站独立修复

| 编号 | 问题描述 | 涉及文件 | 修复方式 | 左文 | 阀门 |
|------|----------|----------|----------|------|------|
| B25 | sitemap.xml 中 `/services/technical-support` 重复列出 | `app/sitemap.ts`（阀门） | 删除重复行，域名保留 `valvetrix.com` | 不适用 | ✓ 2026-09-11 | 左文 sitemap 无此重复 |

### G. 多语言字典补全（支撑上述修复）

| 编号 | 新增 key | 六语种 | 左文 | 阀门 |
|------|----------|--------|------|------|
| B26 | `language`（语言标签） | zh/en/ja/ko/fr/ar | ✓ 2026-09-11 | ✓ 已有 |
| B27 | `newsNotFound`（新闻404） | 六语种 | ✓ 2026-09-11 | ✓ 已有 |
| B28 | `modelDrawings`（模型图纸） | 六语种 | ✓ 2026-09-11 | ✓ 已有 |
| B29 | `downloadFile`（下载文件） | 六语种 | ✓ 2026-09-11 | ✓ 已有 |
| B30 | `noManual`（暂无资料） | 六语种 | ✓ 2026-09-11 | ✓ 已有 |

> `config/i18n.ts` 阀门新增 89 个 key，其中 84 个为阀门品牌专属（unilok*、valtrix*、navDesc*、vcrFittings、semiconductor/biopharmaceutical 等行业词、statsProductSeries 等），不同步到左文。

---

## 二、QA 报告中已确认修复/非代码 Bug 的项

| QA编号 | 问题 | 类型 | 当前状态 | 说明 |
|--------|------|------|----------|------|
| H3 | 相关服务丢弃多语言字段 | 代码 bug | ✓ 两仓均已修复 | `setRelatedServices(rec.map((x)=>({...x})))` 展开全字段，非 QA 报告所述的 `{slug,title,subtitle}` |
| H6 | sitemap 域名错误（valtrix.example.com） | 配置/品牌 | ✓ 阀门已修复为 valvetrix.com | 域名属品牌配置，各仓保留；左文用 zuowentech.com 正确 |
| M2 | contact 标签重复 | 代码 bug | ✓ 左文已有去重逻辑 | 渲染处 `item.sub && item.sub !== item.label` 已去重 |
| M7 | 服务 not-found 中文硬编码 | 代码 bug | ✓ 两仓均已用 `t("serviceNotFound")` | |
| P2#12 / L5 | Header 菜单 hover 描述仅 en/zh | 数据层 | 非代码 bug | desc 来自后台菜单 API 的 `description` 字段，代码已透传；需后台补多语种菜单描述 |
| P2#7 | Hero defaultStats 仅 en/zh | 部分代码+数据 | 代码已走 `t()` 字典 | defaultStats 的 label 已用 `t("productSeries")` 等字典 key；value 为品牌数字保留各仓 |
| H1 | 首页 Hero 全语种英文 | 数据层 | 非代码 bug | 需后台首页配置补各语种文案 |
| H2 | zh 基础字段被英文填充 | 数据层 | 非代码 bug | 阀门站以英文为基准内容，需后台补 zh 翻译 |
| H4 | ar 产品 features 空数组 | 数据层 | 非代码 bug | 需后台补 featuresAr |
| H5 | 产品手册 PDF 404 | 资源缺失 | 非代码 bug | 需上传真实 PDF 到 public/downloads/ |
| M4 | ja VCR 被误译为"摄像机" | 翻译质量 | 非代码 bug | 需后台重译 featuresJa |
| M5 | about/profile 统计多语种缺失 | 数据层 | 非代码 bug | 需后台补数据 |
| M6 | resources 页 403×4 | 待确认 | 可能为下载门控预期行为 | |
| L1 | favicon.ico 404 | 资源 | 非代码 bug | 需补 favicon.ico 或 layout 加 icon link |
| L2 | honors 认证卡片空 | 数据层 | 非代码 bug | |
| L3 | culture Hero 背景图 404 | 资源 | 非代码 bug | |
| L4 | 部分页面 title 用 slug | 数据+配置 | 非代码 bug | 需后台补 seoTitle |
| P3#14 | ja badge "専精特新"不自然 | 翻译质量 | 非代码 bug | 需后台/字典润色 |

---

## 三、阀门特有功能（不同步到左文）

以下功能为阀门站品牌/架构特有，左文站不需要：

| 功能 | 文件 | 说明 |
|------|------|------|
| UNILOK 模板全套 | `components/theme-unilok/*`（20个文件） | 阀门第二套前端主题 |
| 模板路由 DefaultClient | `app/about/AboutDefaultClient.tsx`、`app/contact/ContactDefaultClient.tsx`、`app/news/NewsDefaultClient.tsx`、`app/products/ProductsDefaultClient.tsx` | 阀门 page.tsx 变薄，按模板 slug 路由 |
| 插件市场 | `app/api/admin/plugin-market/*`（7个）、`lib/plugins/market.ts` | 阀门付费插件兑换/安装系统 |
| 规格分组 | `lib/spec-grouping.ts` | 阀门产品规格分组逻辑 |
| 活动模板系统 | `lib/templates/active-theme.ts`、`get-active-template.ts` | 阀门多模板切换引擎 |
| 后台侧边栏重组 | `components/admin/AdminSidebar.tsx` | 阀门新增工作台/营销/AI/SEO 分组 + 插件动态菜单，依赖 plugin-market |
| 插件 registry 增强 | `lib/plugins/registry.ts`、`store.ts` | features/impact 字段 + 市场函数 + ai-site-wizard 插件 |
| 插件管理页增强 | `app/admin/plugins/page.tsx` | 477→1079行，依赖 registry 增强 |
| OEM/价格保密 | `app/admin/settings/oem/*`、`lib/server/price-verify.ts` | 阀门价格放大100倍保密逻辑 |
| home-sections 页合并 | `app/admin/home-sections/page.tsx` | 阀门已合并进 home-config，左文仍独立使用 |

---

## 四、左文站历史修复（阀门 fork 时已包含，无需同步）

以下为左文站 AGENTS.md 记录的历史修复，阀门站 9-08 fork 时已全部继承：

- 多语言字段全量保存（POST/PUT 接口全语种解构）
- AutoTranslateBar 数组字段 JSON 识别 + 全局节流 1100ms
- useAdminForm 初始化全语种键展开
- MultiLangTextField handleChangeAll 竞态修复
- iPhone 移动端导航崩溃修复（server.js 自定义 server + MobileNavItem href 兜底）
- 上传部署全链路修复（Windows zip 反斜杠、db-check grep、keepalive、pnpm onlyBuiltDependencies、logsRef useRef）
- SMTP 可视化配置 + 下载验证码留资
- 商用授权 RSA 签名系统
- 模板管理系统
- fr 语种启用 + ar RTL dir 设置
- 站点配置地址翻译 targetLang/translatedText 修复
- 33 个存量 tsc 类型错误清零

---

## 五、验证结果

| 检查项 | 左文站 | 阀门站 |
|--------|--------|--------|
| `npx tsc --noEmit` | ✓ 0 错误（2026-09-11） | ✓ 0 错误（2026-09-11） |
| 品牌内容未被覆盖 | ✓ 公司名/电话/邮箱/域名/产品数据均保留 | ✓ 同上 |
| 阀门特有功能未被同步到左文 | ✓ UNILOK/plugin-market/spec-grouping 等均未动 | ✓ |
| 数据库未修改 | ✓ | ✓ |
| 未部署上线 | ✓ | ✓ |
| 未删除任何文件 | ✓ | ✓ |

---

## 六、本次修改文件汇总

### 左文站（D:\企业网站）— 共修改 24 个文件

**前端渲染层（18个）**：
1. `app/contact/page.tsx` — M3 bdi 修复
2. `app/services/[slug]/ServiceDetailClient.tsx` — bdi 修复
3. `app/products/[tab]/[id]/ProductDetailClient.tsx` — bdi 修复
4. `components/layout/Footer.tsx` — bdi + 地址多语言兼容
5. `components/sections/CTA.tsx` — bdi 修复
6. `app/cases/page.tsx` — t("loading")
7. `app/cases/[slug]/page.tsx` — t("loading")
8. `app/services/page.tsx` — t("loading")
9. `app/resources/page.tsx` — t("loading")
10. `app/resources/[type]/page.tsx` — t("loading")
11. `app/faqs/page.tsx` — t("loading")
12. `app/news/[slug]/NewsDetailClient.tsx` — t("loading") + 404 字典化
13. `app/about/page.tsx` — t("loading")
14. `components/layout/Header.tsx` — 4 处竞态/品牌位修复（含组织者修复的 prev 闭包 tsc 错误）
15. `components/sections/Stats.tsx` — useCountUp 竞态修复
16. `components/sections/Industries.tsx` — isEn 清理
17. `app/industries/[slug]/IndustryDetailClient.tsx` — isEn 清理
18. `app/careers/page.tsx` — benefits 多语种补全

**Admin/Lib/Config（6个）**：
19. `app/admin/templates/page.tsx` — currentSlug 回退 + 徽章 + 预览 + 说明
20. `app/admin/shop/page.tsx` — 表格响应式
21. `components/admin/ContentTypeList.tsx` — 表格响应式
22. `lib/about.ts` — 类型安全
23. `lib/products.ts` — 类型对齐
24. `config/i18n.ts` — 5 个通用 key

### 阀门站（D:\阀门网站）— 共修改 1 个文件

1. `app/sitemap.ts` — 删除重复的 `/services/technical-support`

---

*文档生成时间：2026-09-11 | 下次代码同步前请先更新本文档*
