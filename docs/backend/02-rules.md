# 左文科技企业官网 · 后台管理系统 总规则文件

> 文档编号：ZW-BACKEND-02
> 版本：v1.0
> 日期：2026-08-30
> 性质：**强制执行**的开发与运维规则，所有参与者必须遵守。与 01-数据字典、05-开发记忆库配套使用。

---

## 1. 项目管理规则

### 1.1 Git 规范

- **分支模型**：`main`（生产） / `develop`（集成） / `feature/*`（功能） / `fix/*`（修复） / `release/*`（发布）。
- 禁止直接向 `main` 提交；必须通过 PR/MR 合并，且 CI 通过。
- 每个功能/修复一个独立分支，命名示例：`feature/admin-product-crud`、`fix/theme-css-var`。

### 1.2 提交信息规范（Conventional Commits）

```
<type>(<scope>): <subject>

# type: feat | fix | docs | style | refactor | perf | test | chore | build | revert
# scope: admin | theme | seo | news | deploy | download | auth ...
# 示例：feat(admin): 产品管理列表页与 CRUD 接口
```

- 提交信息用中文或英文均可，但**前后一致**；关键提交附关联文档编号（如 `ZW-BACKEND-01`）。

### 1.3 版本规范

- 遵循语义化版本 `MAJOR.MINOR.PATCH`；后台功能演进打 `minor`，修复打 `patch`。
- 每个版本在 `CHANGELOG.md` 记录。

### 1.4 任务与文档联动

- **每个开发步骤完成后必须更新 `04-work-log.md`**（日期、任务、改动、验证、下一步）。
- 表结构变更 → 更新 `01-data-dictionary.md`。
- 技术决策 → 记入 `05-dev-memory.md`（ADR 形式）。
- 里程碑状态 → 更新 `03-progress.md`。

---

## 2. 代码规范

### 2.1 技术栈与版本锁定

- Next.js 14 / React 18 / TypeScript 5 / Tailwind CSS 3 / Prisma 5 / PostgreSQL。
- 依赖通过 `package.json` + `pnpm-lock.yaml` 锁定；新依赖需评审。
- 严格类型模式：`tsconfig` 开启 `strict`，不允许 `any`（除极少数注明原因）。

### 2.2 目录结构规范

```
app/
  admin/            # 后台管理端页面（登录后 SPA 区域）
    (auth)/login/
    dashboard/
    products/  industries/  services/  resources/
    news/      about/       jobs/      leads/
    users/     roles/
    settings/  theme/       home/      collect/  ai/
    logs/      backups/
  api/
    public/            # 前台取数（无鉴权，仅读）
    admin/             # 后台 CRUD（鉴权+RBAC+日志）
    download/          # 下载验证/留资
  (前台现有路由保持不动)
components/
  admin/               # 后台组件（Sidebar/Layout/Form/Table...）
  ui/                  # 前台 UI 组件（沿用）
lib/
  admin/               # 后台逻辑（auth/rbac/log）
  api/                 # 前台取数封装
  llm/                 # 大模型客户端
  collect/             # 采集服务
  prisma/              # Prisma client/seed
prisma/
  schema.prisma
  migrations/
  seed.ts
docs/backend/          # 本文档集
```

### 2.3 命名规范

| 项 | 规则 | 示例 |
|----|------|------|
| 目录/文件 | kebab-case | `product-table.tsx` |
| React 组件 | PascalCase | `ProductTable` |
| 函数/变量 | camelCase | `getProductById` |
| 常量 | UPPER_SNAKE_CASE | `VALIDITY_MS` |
| 数据库表 | snake_case 复数 | `product_specs` |
| 数据库字段 | snake_case | `download_url` |
| API 路由 | kebab-case | `/api/admin/product-categories` |
| 环境变量 | UPPER_SNAKE_CASE | `DATABASE_URL` |
| 图标 | 使用 lucide-react 名称 | `FileText` |

### 2.4 组件规范

- 前台组件尽量保持现有实现；后台组件独立于 `components/admin`，不污染前台。
- 组件单一职责；重复逻辑抽 hook（如 `useTable`、`usePermission`）。
- 颜色一律使用 Tailwind 主题 token（`bg-primary` 等），**禁止硬编码色值**（除品牌渐变等显式配置项）。

---

## 3. 数据库规范

- 全部通过 **Prisma Migration** 管理 schema，禁止手工改库（开发除外并回补 migration）。
- 所有表带审计字段与软删除（见 01-数据字典 第 0 节）。
- **索引**：唯一约束、查询条件列、外键列必须建索引。
- **JSONB 使用**：结构化列表（规格、特性、段落、FAQ）用 JSONB；可枚举/需查询的列独立成字段。
- **枚举**：状态类字段优先用 `SMALLINT` 常量 + 代码层枚举对象，减少数据库枚举迁移成本。
- **删除**：内容一律软删除；备份/日志保留周期策略（日志 180 天，留资按合规要求）。
- **敏感字段**：密码 bcrypt；API Key 加密存储（AES，密钥在环境变量）。

---

## 4. API 规范

### 4.1 公开 API（/api/public/*）

- 只读、无需鉴权；返回内容为**已发布**状态（status=已发布）。
- 统一响应：
  ```json
  { "ok": true, "data": { ... } }
  ```
  错误：`{ "ok": false, "message": "..." }`
- 支持 `Cache-Control`（内容缓存 60s~1h），内容变更时主动刷新。
- 分页参数统一：`page`（1 起）、`pageSize`（≤100）。

### 4.2 管理 API（/api/admin/*）

- 统一前缀 `/api/admin`；所有接口经鉴权中间件 + RBAC 校验 + 操作日志。
- 鉴权失败：`401`；无权限：`403`；参数错误：`400`；不存在：`404`；服务错误：`500`。
- 统一响应（同公开 API）。
- 写操作（POST/PUT/PATCH/DELETE）必须记录 `operation_logs`。
- 列表接口支持：分页、关键字搜索、状态筛选、排序、批量操作（ids 数组）。

### 4.3 下载 API（/api/download/*）

- `send-code`：邮箱+限流（60s/次）→ 生成验证码入库 → SMTP 发送（开发模式返回 code）。
- `verify`：校验验证码 → 留资入库（download_leads）→ 返回成功与有效期。
- 文件下载：验证通过/有效期内签发签名 URL。

### 4.4 错误与幂等

- 写接口幂等：重复提交以唯一键（如 email+验证码）防护。
- 全站统一错误码表（维护于 `lib/api/errors.ts`）。

---

## 5. 后台开发规范

### 5.1 布局与交互

- 后台固定「左侧导航 + 右侧内容」；导航按权限过滤。
- 列表页统一：顶部搜索/筛选 → 操作栏（新增/批量） → 表格（分页） → 行操作。
- 表单统一：必填标 `*`，中英文字段成对出现；保存前校验。
- 危险操作（删除/下架/覆盖）需二次确认。
- 保存成功/失败均有明确反馈（toast）。

### 5.2 权限

- **前端隐藏菜单仅做体验优化，服务端必须校验**（中间件 + API 内 `requirePermission`）。
- 新增资源/操作必须同步：权限种子、菜单配置、角色默认授权。

### 5.3 内容编辑

- 中英文字段**必须成对维护**，禁止只填中文（影响 GEO/海外）。
- 富文本/长文用结构化 JSON（段落数组），便于前台与 SEO 输出。
- 图片上传：统一走 `media_assets`，前台引用其 URL。

---

## 6. 前端改造规范

- **改造顺序**：先建库/接口 → 再改前台取数 → 每页验证 → 更新工作记录。
- 前台取数封装在 `lib/api/*`，页面不直接裸调 fetch。
- **回退机制**：取数失败回退内置静态数据（`lib/*.ts` 保留为兜底），站点永不自愈失败。
- **配色改造**：只改 `tailwind.config.ts` 为变量引用 + 根布局注入 `:root`；组件内硬编码色值逐一迁移，列入清单。
- 改造后**逐页截图对比**（改造前后视觉一致）。
- 前台性能：列表页用服务端渲染 + 客户端交互组件保持 `"use client"` 最小化。

---

## 7. SEO / GEO 内容规范

- 每个内容实体维护 `meta_title`（≤60 字）与 `meta_description`（≤150 字）。
- 图片必须有 `alt`（含型号/关键词）。
- 产品参数用**表格**呈现；行业/产品页内置 FAQ。
- 全站事实（公司名、地址、联系方式、资质、型号）**必须与官网外公开信息一致**。
- 新闻发布时间不可随意改（采集时间与发布时间分离）。
- 下架内容 301 到相关页面，不直接 404。

---

## 8. 内容安全与合规

- 新闻采集/AI 生成内容：**一律进草稿，人工审核后发布**，禁止自动直发。
- 大模型输出必须做：格式校验 + 敏感词过滤 + 来源标注。
- 留资/留言数据：最小化收集、明示用途、支持删除（GDPR/个保法合规）。
- 采集遵守 robots 协议与来源版权，注明来源链接。

---

## 9. 部署与运维规范

- 环境变量不入库、不入仓库（进 CI Secrets / 部署平台）。
- 发布流程：CI 构建 → 跑测试 → `prisma migrate deploy` → 滚动发布 → CDN 刷新。
- 发布窗口：国内站避开工作高峰；主库写操作仅允许在主站执行。
- 每日自动备份 + 发布前手动备份；备份恢复演练每季度一次。
- 监控：应用健康、数据库连接、定时任务状态、CDN 缓存命中、留资量。

---

## 10. 文档维护规范

- `04-work-log.md`：**每个开发/运维动作后必记**（含本次方案制定）。
- `05-dev-memory.md`：记录决策（ADR）、坑点、已验证事实、命令速查。
- `03-progress.md`：任务状态随进度更新。
- 文档使用 Markdown，中文为主；表格表达结构化信息。

---

*本文档为最高优先级规则；与具体任务冲突时，先在本文件登记例外并说明原因。*
