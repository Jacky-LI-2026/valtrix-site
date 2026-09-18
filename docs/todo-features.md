# 待完成功能清单

> 调查日期：2026-09-01
> 调查范围：左文科技企业官网（Next.js 14 + Prisma + PostgreSQL）前台 + 后台全部功能模块

---

## 一、占位/未实现功能

### 1. 采集配置（`/admin/collection`）— 框架级占位
- **位置**：`app/admin/collection/page.tsx` L85、`app/api/admin/collection/run/route.ts` L53-78
- **现状**：
  - "新增采集源"按钮点击后 `alert("新增采集源功能待实现")`，无法添加采集源
  - 采集执行 API 为纯框架，`collected` 恒为 0，无实际 RSS/HTML 解析逻辑
  - 返回消息明确标注"基础框架，实际解析待实现"
  - AI 润色接口标注"调用大模型接口（待实现）"
- **影响**：采集功能完全不可用
- **优先级**：中（如不需要可从侧边栏隐藏）

### 2. 自动采集任务（`/admin/auto-collection-tasks`）— 入口占位
- **位置**：`app/admin/auto-collection-tasks/page.tsx` L92
- **现状**："新建任务"按钮点击后 `alert("请在新闻管理页面的AI采集工具中创建自动采集任务")`，本身无创建功能
- **影响**：自动采集任务无法创建
- **优先级**：中（依赖采集功能 #1）

### 3. 翻译 API — 阿里翻译
- **位置**：`app/api/admin/translate/route.ts` L488-495
- **现状**：函数体只有 `console.log('阿里翻译API尚未实现，跳过')`，无实际调用
- **影响**：选择阿里翻译时静默跳过，不报错但不翻译
- **优先级**：低（当前百度 + MyMemory 已覆盖翻译需求）

### 4. 翻译 API — 腾讯翻译
- **位置**：`app/api/admin/translate/route.ts` L499-506
- **现状**：函数体只有 `console.log('腾讯翻译API尚未实现，跳过')`，无实际调用
- **影响**：同上
- **优先级**：低

### 5. 使用说明书（`/admin/guide`）— 纯静态文档
- **位置**：`app/admin/guide/page.tsx`
- **现状**：130 行纯静态文档，无 fetch/API/交互
- **说明**：有意设计的说明页，非 bug，无需实现

### 6. 系统升级（`/admin/system-update`）— 半实现，核心逻辑缺失
- **位置**：`app/admin/system-update/page.tsx`、`app/api/admin/system-update/route.ts`
- **现状**：
  - UI 框架完整：当前版本展示、检查更新按钮、更新历史列表
  - 检查更新为模拟实现：写死返回"当前已是最新版本"，未连接远程更新服务器
  - "立即更新"按钮无点击事件，无实际升级执行逻辑
  - 缺少：升级包上传、在线下载、文件覆盖、数据库迁移、服务重启、失败回滚
- **影响**：无法通过后台执行系统升级
- **优先级**：中（部署到生产环境前需要）
- **计划实现**：①上传升级包升级 ②在线检查+下载升级 ③通用升级流程（自动备份→解压→覆盖→迁移→记录→重启）

---

## 二、半实现/有配置问题的功能

### 6. 火山翻译（Volcengine）
- **位置**：`app/api/admin/translate/route.ts` `translateWithVolcengine`
- **现状**：代码已完整实现（Signature V4 签名），认证通过（HTTP 200），但 `TranslationList` 恒为空
- **根因**：AK 在火山侧未开通机器翻译服务 / 未创建翻译项目 / 无配额
- **解决**：需用户在火山控制台开通服务 + 创建项目后可用
- **优先级**：低

---

## 三、已验证为真实可用的功能（无需处理）

| 模块 | 路径 | 状态 |
|------|------|------|
| 产品管理 | `/admin/products` | 完整 CRUD + 多语言 + 规格 |
| 产品分类 | `/admin/product-categories` | 完整 CRUD + 多语言 |
| 新闻管理 | `/admin/news` | 完整 CRUD + 多语言 + SEO/GEO |
| 资源管理 | `/admin/resources` | 完整 CRUD + 多语言 |
| 资源分类 | `/admin/resource-categories` | 完整 CRUD + 多语言 |
| 行业方案 | `/admin/industries` | 完整 CRUD + 多语言 |
| 服务内容 | `/admin/services` | 完整 CRUD + 多语言 |
| 关于我们 | `/admin/about` | 完整 CRUD + 多语言 |
| 招聘职位 | `/admin/careers` | 完整 CRUD + 多语言 |
| 菜单管理 | `/admin/menus` | 完整 CRUD + 多语言 |
| 留言线索 | `/admin/leads` | 完整 CRUD + 状态流转 |
| 访客统计 | `/admin/analytics` | track/events/stats/visitors 四 API 完整 |
| 站点配置 | `/admin/settings/site` | 完整（含多语言地址、价值观、福利卡片） |
| 主题配色 | `/admin/settings/theme` | 完整可配置 |
| 首页配置 | `/admin/settings/home` | 完整多语言 |
| 大模型配置 | `/admin/settings/ai` | 完整可配置 |
| 翻译配置 | `/admin/settings/translate` | 完整可配置 |
| SEO/GEO配置 | `/admin/settings/seo` | 完整可配置 |
| 语种管理 | `/admin/languages` | 完整可配置 |
| 数据库备份 | `/admin/backup` | 真实导出所有 Prisma 模型到 JSON |
| 一键部署 | `/admin/deploy` | 备份/恢复/部署/检查更新 真实实现 |
| 服务器管理 | `/admin/servers` | 完整 CRUD |
| 用户权限 | `/admin/users` | 正常 |
| 操作日志 | `/admin/logs` | 正常 |
| 前台联系表单 | `/api/contact` | 真实 API |
| 前台下载验证 | `/api/download/*` | 真实 API |
| 前台多语言 | 全站 | 六语种（zh/en/ja/ko/fr/ar）+ RTL 支持 |

---

## 四、处理建议

1. **如不需要采集功能**：从 `components/admin/AdminSidebar.tsx` 移除"采集配置"和"自动采集任务"两个入口，避免用户困惑
2. **如需要采集功能**：先实现 #1（采集源管理 + 实际解析），再实现 #2（自动任务调度）
3. **翻译 API**：阿里/腾讯暂不实现，百度 + MyMemory 已满足需求；火山需用户在控制台开通
4. **定期复查**：每次大版本更新后重新扫描 TODO/FIXME/alert 占位
