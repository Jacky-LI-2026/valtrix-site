# 左文科技企业官网后台 — 浏览器回归测试报告

- 测试日期：2026-09-07
- 测试目标：http://8.130.65.182/admin （生产）
- 账号：admin / admin123
- 测试方式：bu（product browser）自动化逐页访问 + 文本/console 检查
- 截图说明：bu.screenshot() 在本次会话持续超时（COMMAND_TIMEOUT），截图未落地到 `D:\企业网站\docs\qa\shots\`；改用页面文本 + console 错误作为判定依据。如需截图请人工复现。

---

## 一、Bug 列表

| 编号 | 模块 | URL | 现象 | 预期 | 复现步骤 | 严重级 |
|------|------|-----|------|------|----------|--------|
| A-001 | 登录 | /admin/login | 已登录状态下访问 /admin/login，页面不跳转，仍渲染登录表单（用户名/密码/登录按钮），且登录表单下方仍叠加完整后台侧边栏 | 已认证用户访问 /admin/login 应 302 重定向到 /admin（dashboard） | 登录后新开标签访问 /admin/login | P1 |
| A-002 | 登录 | /admin/login | 已登录访问 /admin/login 后，多次工具调用之间页面自动跳转到前台公共页（/contact、/visit-booking、/ 首页），URL 被无理由改写 | 登录页应保持稳定，不应在无交互时自动跳前台 | 已登录 → 访问 /admin/login → 等待 3-5 秒 → URL 变为 / 或 /contact | P1 |
| A-003 | 在线商城 | /admin/shop/products | 直接返回 404「页面未找到」。但插件中心「在线商城」卡片明确列出管理入口「商品管理」，且 /admin/shop/stats 显示「在售商品 11 个」 | 商品管理页应可访问，或插件卡片不应列出该入口 | 访问 /admin/shop/products；对照 /admin/plugins 在线商城卡片 | P1 |
| A-004 | 商机线索 | /admin/inquiries | 返回 404。询盘线索实际路由为 /admin/leads（页面标题「询盘商机管理」） | 路由应统一，旧路径或重定向应有 | 访问 /admin/inquiries | P2 |
| A-005 | 语种管理 | /admin/settings/languages | 返回 404。实际路由为 /admin/languages（中间件 PATH_PERMISSION 也写的是 /admin/languages） | 路径应一致，或至少有重定向 | 访问 /admin/settings/languages | P3 |
| A-006 | 内容模型 | /admin/content | 返回 404。无 index 页 | 作为内容模型根路径应有列表或重定向 | 访问 /admin/content | P3 |
| A-007 | 内容模型 | /admin/content/about、/admin/content/careers、/admin/content/resources | 显示「未知内容类型：about/careers/resources — 请在 lib/content-types/registry.ts 中注册」。但 about/careers/resources 在旧路由 /admin/about /admin/careers /admin/resources 下均可正常管理 | 三个旧模块要么迁入新内容模型注册，要么在 /admin/content/[type] 下给出友好跳转而非错误页 | 分别访问三个 URL | P2 |
| A-008 | 部署 | /admin/deploy | 「服务器管理」区显示「暂无服务器，点击添加」「暂无可用服务器」。但 AGENTS.md 记录服务器 8.130.65.182 已配置并完整上线（PM2 online、数据库克隆） | 部署页应能列出已配置的部署目标 | 登录后访问 /admin/deploy，查看顶部服务器选择区 | P2 |
| A-009 | 部署 | /admin/servers | 「服务器管理」列表为空（暂无服务器）。与 A-008 同源 | 应至少有一条 8.130.65.182 的记录 | 访问 /admin/servers | P2 |
| A-010 | 产品新增表单 | /admin/products/new | GEO 城市多选框打开后默认选中「已选 438 个城市」（中国 366 + 印度 72），地区「已选 2 个」（中国+印度）。新建产品时全量预选中所有城市，保存后会把全部城市写库 | GEO 多选默认应为空或仅按用户手动选择 | 进入新增产品页，展开 GEO 城市区 | P2 |
| A-011 | 站点设置 | /admin/settings/* | 每个设置子页面顶部都有「返回插件启停中心」面包屑链接（如站点配置/首页配置/翻译配置/SEO/SMTP/主题配色等 10+ 页面均出现）。该文案是插件开发态术语，对最终用户不友好，且导航层级混乱 | 设置子页应使用「← 返回站点设置」类面包屑，或直接用侧边栏导航 | 访问任意 /admin/settings/* 页面，看顶部 | P3 |
| A-012 | 仪表盘 | /admin | 页面初次加载时 console 报 401 Unauthorized（多次，跨多个 API），但页面最终渲染正常 | 已登录用户首次加载不应有 401 | 硬刷新 /admin，看 console | P3 |
| A-013 | 多语言 | /admin/products/new | 多语言字段 Tab 渲染正常（中/英/日/韩/法/阿 6 个 Tab 均出现），字段内「一键翻译全部」按钮存在，AutoTranslateBar 顶部「一键翻译全部」按钮存在。**本次未实际点击翻译/保存（避免污染生产数据）** | — | — | （通过项，记录备查） |
| A-014 | 授权 | /admin/license | 显示「未授权」，顶部红色横幅「本系统未激活商用授权」。属已知正常行为（不锁功能） | — | — | （正常，非 bug） |

---

## 二、已通过（页面加载，无 500/白屏/JS 崩溃）

> 下列页面均能正常渲染主内容区，console 无新增 error（除 A-012 的初始 401 外）。

### 1. 登录与控制台
- /admin（dashboard）：产品 16 / 分类 4 / 用户 4 / 版本 0.1.0 / 最近操作列表 / 系统状态（数据库正常、应用运行中）
- /admin/operations（运营驾驶舱）：近 7/30/90 天商机统计、趋势图、渠道分布、客户地区、询价状态 — 正常

### 2. 内容管理（旧路由）
- /admin/products（16 款产品列表，4 个 tab 分组）
- /admin/product-categories（Tab/Category 两栏）
- /admin/news（新闻列表）
- /admin/industries（6 行业）
- /admin/services（4 服务）
- /admin/resources（资源列表）
- /admin/resource-categories
- /admin/careers
- /admin/about
- /admin/menus（菜单树）

### 3. 内容模型（新路由 /admin/content/*）
- /admin/content-types（内容类型管理，含 faq 等内置类型）
- /admin/content/news、/admin/content/products、/admin/content/services、/admin/content/industries（列表+编辑+删除按钮均渲染）

### 4. 站点设置
- /admin/settings/site（站点名/LOGO/域名/社交）
- /admin/settings/home（Banner/优势/统计/CTA/SEO，多语言自动翻译条存在）
- /admin/settings/translate（百度/阿里/小牛/腾讯/有道/MyMemory 多通道配置）
- /admin/settings/seo（sitemap 52 条 URL、基础 SEO 配置）
- /admin/settings/ai（AI 客服配置、六语种欢迎语）
- /admin/settings/smtp（显示「邮件服务已启用」，测试按钮存在）
- /admin/settings/theme（主色/亮/暗/辅助/深色，实时预览）
- /admin/languages（6 语种 zh/en/ja/ko/fr/ar 全部启用）

### 5. 插件中心
- /admin/plugins：35 个插件（启用 32 / 停用 3），分类：内容与采集 3 / 人工智能 7 / SEO 与增长 2 / 营销与商机 9 / 数据与统计 1 / 系统与安全 11 / 第三方集成 2。每个插件卡片含编辑/配置/管理入口链接。
- 本次未实际启停插件（生产环境风险），仅验证 UI 渲染。

### 6. 商机线索
- /admin/leads（8 条商机，新线索 7 / 跟进 1，王先生报价 QT20260904-0005 详情可见）
- /admin/download-leads（累计 2 条留资，CSV 导出按钮存在，统计卡 3 张）
- /admin/visit-bookings（0 条预约）

### 7. 报价 / EDM / 漏斗 / 统计
- /admin/quotes（新询价 3，报价单模板设置入口）
- /admin/email-marketing（订阅 1，群发按钮）
- /admin/funnel（销售漏斗：页面访问 966 → 访客 25 → 深度访客…）
- /admin/analytics（访客 25 / 浏览 966 / 动作 1729，明细表）
- /admin/heatmap（/ 132 条点击、/admin/plugins 72 条、/admin/content/news/46/edit 57 条）
- /admin/seo-audit（35 条待补 SEO，新闻 29 缺 SEO）

### 8. 商城 / 会员
- /admin/shop/orders（0 单，状态筛选 + CSV 导出）
- /admin/shop/coupons（新建券表单，六语种名称）
- /admin/shop/categories（半导体设备 semi 分类等）
- /admin/shop/stats（累计订单 0、在售商品 11）
- /admin/members（0 会员，等级筛选）
- /admin/member-levels（普通/银/金/黑卡 4 级，默认普通会员）
- /admin/customer-types（inquiry 询价客户等分类，折扣配置）

### 9. AI 相关
- /admin/ai-knowledge（知识库列表，批量补全多语言/上传文档入口）
- /admin/ai-features（AI 开关矩阵，全局总闸 + 插件 × 功能点）
- /admin/ai-autopilot（自动运营流水线）
- /admin/ai-site-wizard（AI 建站向导）
- /admin/ai-video（AI 视频分镜）
- /admin/collection（36 氪 RSS 采集源示例）
- /admin/auto-collection-tasks（0 任务）

### 10. 系统
- /admin/license（未授权，激活表单存在 — 未实际激活）
- /admin/deploy（系统信息真实：v0.1.0 / 运行 4.2 天 / Node v22.13.1 / 生产环境）
- /admin/templates（内置模板预设：深蓝科技风等，导入/新增按钮）
- /admin/logs（56 条操作日志，模块筛选）
- /admin/users（张丽娜/王海涛等 4 用户）
- /admin/roles（admin 72 权限 1 用户 / editor 25 权限 3 用户）
- /admin/notifications（23 条，未读 7）
- /admin/guide（使用说明书 181 章节，Markdown/HTML 下载）
- /admin/backup（备份 + 定时备份配置）
- /admin/system-update（版本更新检查）
- /admin/tenants（默认租户）
- /admin/sites（多站点）
- /admin/tickets（0 工单）
- /admin/forms（0 表单）
- /admin/gateway（API Key 管理）
- /admin/home-sections（首页 9 区块排序）
- /admin/page-hero（各栏目头部 Banner）
- /admin/backlinks（外链回链）
- /admin/applet（小程序生成）
- /admin/translate-batch（批量翻译入口）

---

## 三、统计

- 已测试菜单/页面总数：**约 70 个 URL**（含 404 与未知类型页）
- Bug 分布：
  - P0 阻塞：0
  - P1 严重：3（A-001 登录页未跳转、A-002 登录页自动跳前台、A-003 商城商品管理 404）
  - P2 一般：6（A-004/006/007/008/009/010）
  - P3 建议：3（A-005/011/012）
- 按模块：登录 2 / 商城 1 / 线索 1 / 设置 2 / 内容模型 1 / 部署 2 / 产品表单 1 / 全局 1

---

## 四、测试中修改/创建的数据

**无。** 本次测试仅做 GET 访问与只读查看：
- 未点击「开始部署」
- 未激活/解除授权码
- 未启停任何插件
- 未保存任何设置表单
- 未新增/编辑/删除任何业务数据
- 未触发翻译/发信/备份

---

## 五、后续建议（非 bug）

1. 截图能力本次不可用（bu.screenshot 持续超时），建议下次测试先在 dev 环境验证 screenshot 通路，或改用 CDP `Page.captureScreenshot`。
2. /admin 旧路由与 /admin/content/* 新路由并存，部分模块（about/careers/resources）只在旧路由可用、新路由报「未知内容类型」。建议统一：要么把这些类型注册进 content-types registry，要么在 /admin/content/[unknown] 下做友好重定向。
3. 部署页「暂无服务器」与实际生产运行状态不一致，需确认 servers 表是否在新部署中被清空，或部署页数据源是否接错。
4. GEO 城市多选默认全选 438 城属默认值问题，建议新建时默认空。
