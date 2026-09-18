# 左文科技企业官网 · 后台管理系统 开发记忆库

> 文档编号：ZW-BACKEND-05
> 版本：v1.0
> 日期：2026-08-30
> 性质：项目长期知识库，记录**已验证事实**、**技术决策（ADR）**、**坑点**与**命令速查**。开发过程中持续补充。

---

## 1. 项目概况

| 项 | 值 |
|----|----|
| 项目名称 | 左文科技企业官网 + 后台管理系统 |
| 项目路径 | `F:\企业网站\左文科技网站及后台` |
| 前端框架 | Next.js 14（App Router）/ React 18 / TypeScript |
| 样式 | Tailwind CSS 3 |
| 后台目标 | 内容后台管理（含配色/360/下载），SEO+GEO，双域部署（阿里云+美国） |
| 文档集 | `docs/backend/`（00 方案 / 01 数据字典 / 02 总规则 / 03 进度 / 04 工作记录 / 05 本文件） |

---

## 2. 命令速查

```bash
# 开发启动（当前前端站点，端口 3000）
pnpm dev

# 构建
pnpm build

# 类型检查
npx tsc --noEmit

# 代码检查
pnpm lint

# ---- 后台开发期（规划，M1 落地后生效）----
# 数据库迁移
npx prisma migrate dev --name <migration_name>   # 开发
npx prisma migrate deploy                        # 生产
# 种子数据导入
npx prisma db seed
# 生成 Prisma Client
npx prisma generate
```

---

## 3. 前端已验证事实（改造依据）

### 3.1 路由与页面（16 个）

| 路由 | 说明 |
|------|------|
| `/` | 首页：Hero 轮播×3、Stats 统计×4、产品系列×4、行业×6、服务、关于、CTA |
| `/products` | 产品中心：Tab（全部设备 + 二级目录），URL 参数 `?tab=` 预选目录 |
| `/products/[tab]/[id]` | 产品详情：图集/360/规格/特性/详情/手册下载 |
| `/industries`、`/industries/[slug]` | 应用领域 |
| `/services` + `/services/{odm,mpcvd,technical-support,after-sales}` | 服务 |
| `/resources`、`/resources/[type]` | 资源（catalogs/certificates/drawings）+ 下载门禁 |
| `/news`、`/news/[slug]` | 新闻 |
| `/about`、`/about/[section]` | 关于（profile/culture/history/honors） |
| `/careers`、`/careers/[slug]` | 职位 |
| `/contact` | 联系 |
| `/api/download/send-code`、`/api/download/verify` | 下载验证 |

### 3.2 数据实体与字段要点

- **产品三级**：`productTabs`（id: growth/auxiliary/diamonds/materials）→ `categories` → `models`（model/image/**frames360**/specs/features/manualUrl，中英文字段）。
- **行业** `industries`：challenges/solutions/products/cases + 中英。
- **资源** `resources`：type + items（slug/title/format/size/date/**downloadUrl**，`#`=无文件灰显）。
- **新闻** `news`：title/category/date/excerpt/content[]/featured + 中英。
- **关于** `about`：content/highlights/timeline/certifications。
- **职位** `careers`：department/location/salary/type + 职责/要求/福利 + 中英。
- **i18n**：`config/i18n.ts` 全站 UI 文案 zh/en，localStorage 持久化（key：`左文科技-locale`）。

### 3.3 动态功能实现要点

- **360 旋转**：`ThreeSixtyViewer` 接收 `imagePathTemplate`（`/images/360/{slug}/Frame{index}.png`）+ `totalFrames`，帧图已存在于 `public/images/360/zw-10d/` 等。
- **下载门禁**：表单（姓名/公司/手机/邮箱）→ `/api/download/send-code` 发验证码（**开发模式无 SMTP，返回 devCode**）→ `/api/download/verify` 校验 → `markDownloadVerified` 写 localStorage 7 天有效。
- **配色**：`tailwind.config.ts` 定义 `primary`（#CC0000 红色系）、`accent`（#C0C0C0 银色）、`dark`（#111111）；少量组件硬编码色值（如 Hero 的 `bgGradient: from-[#800000]...`）需迁移。

---

## 4. 技术决策记录（ADR）

### ADR-001：沿用 Next.js 单仓库演进，而非独立后端
- **状态**：采纳（2026-08-30）
- **背景**：前端已是 Next.js 14 全栈，16 页静态数据。
- **决策**：在现有项目增加 `/admin` 后台 + 数据库 + API，单仓库单部署。
- **理由**：复用组件/类型/部署；官网更新频率低，避免双系统运维；SSR/SSG 利于 SEO。
- **代价**：前后端耦合；需注意 `/admin` 与前台构建隔离。

### ADR-002：PostgreSQL + Prisma
- **状态**：采纳（建议，待确认）
- **决策**：生产 PostgreSQL 15+；ORM 用 Prisma 5（类型安全、迁移、开发可切 SQLite）。
- **理由**：双域（阿里云 RDS / 美国 RDS 从库）需成熟关系库；Prisma 迁移保证两端 schema 一致。

### ADR-003：配色用 CSS 变量注入实现后台可改
- **状态**：采纳（建议）
- **决策**：`tailwind.config.ts` 颜色改引用 `rgb(var(--color-*))`；根布局 SSR 从 `theme_config` 注入 `:root` 变量。
- **理由**：SSR 首屏即生效，无需客户端二次渲染闪烁；改动面集中在 config + 布局。
- **注意**：需迁移组件硬编码色值清单（见 3.3）。

### ADR-004：新闻 AI 内容一律草稿审核后发布
- **状态**：采纳（强制）
- **决策**：采集+大模型处理结果只入**草稿**，人工审核后发布。
- **理由**：合规红线与内容质量要求；避免 AI 错误/风险内容直接上线。

### ADR-005：S3 兼容存储统一抽象（OSS/S3）
- **状态**：采纳（建议）
- **决策**：上传/存储层统一 S3 SDK，国内 OSS、海外 S3/MinIO 仅环境变量差异。
- **理由**：满足双域镜像部署，代码零差异。

### ADR-006：后台增加「系统更新」功能模块
- **状态**：采纳（2026-08-30 用户需求）
- **决策**：后台导航增加「系统更新」菜单，含版本信息、更新日志(Changelog)、系统状态监控、维护操作（缓存清理/手动备份/重建索引）、环境信息。
- **数据**：新增 `system_versions`（版本表）、`system_update_logs`（更新日志表）。
- **权限**：仅 admin 可访问。
- **阶段**：M7-06（2 工作日）。

### ADR-007：后台通用功能块统一封装（多页面复用）
- **状态**：采纳（2026-08-31）
- **决策**：后台多个内容模块（产品/新闻/行业/职位/关于/服务/资源）共用的「多语言字段 + 富文本翻译 + SEO/GEO + 数组编辑器 + 一键翻译」统一入口：
  - 字段配置驱动：`lib/admin-form.ts` 的 `FieldConfig`（name/label/kind/autoTranslate/jsonFields...）。
  - 表单样板收敛：`lib/use-admin-form.ts` `useAdminForm`（form/handleChange/多语言值读写/fieldMap）。
  - 渲染：`components/admin/MultiLangFormField.tsx`（text/textarea/richtext/jsonArray/stringArray 自动分派）。
  - 整页翻译 fieldMap 由 `buildTranslateFieldMap(fields)` 自动生成，不再手写。
- **字段命名约定（硬约束）**：zh = 基础名（`name`）；其他 = 基础名+首字母大写（`nameEn/nameJa/nameKo/nameFr/nameAr`）。全站一致，勿破坏。
- **淘汰**：`MultiLangField.tsx`（仅 zh/en）与 `MultiLangFieldAdapter.tsx`（过渡件）不再用于新代码。
- **详情**：`docs/frontend/shared-components-guide.md`；记忆索引见根目录 `AGENTS.md`。

### ADR-008：内容模块 POST/PUT 必须保存全量多语言字段
- **状态**：采纳（强制，2026-08-31 修复）
- **背景**：新闻接口曾只保存 `titleEn`，漏掉 `titleJa/Ko/Fr/Ar`、`summary*`、`content*`，导致「翻译后无法保存」——前端提示成功但刷新后内容丢失（后端静默丢弃未解构字段）。
- **决策**：任何内容模块的 POST/PUT 必须接收并写库**全部多语言字段**（含数组字段各语种）。新增字段时同步改 schema→migration→前端 FIELDS→后端解构与写库。
- **教训**：前端 `{...form}` 全量提交时，后端漏解构不报错，只丢数据——上线前按此自查各 route。

---

## 5. 已知坑点与注意事项

### 5.0 最高优先级约束（2026-08-30 用户明确）
- **前端版式、设计、视觉风格零改动**：后台开发与前端可配置化改造过程中，不得改变任何前台页面的布局、组件样式、字体、间距、交互。
- 后台只负责"内容管理能力"，不引入新的前台 UI 元素。
- 配色改造：`tailwind.config.ts` 改为 CSS 变量引用，但**默认值必须严格等于当前色值**（primary #CC0000 等），视觉零变化；后台改色是"能力"，默认不主动改。
- 内容数据化：页面从读静态数据改为读数据库，但**渲染逻辑/版式完全不变**。
- 验收标准：改造前后逐页截图对比，视觉无差异。

1. **前端静态数据与数据库双轨**：改造期间 `lib/*.ts` 保留为兜底，避免数据化过程中页面空白；上线后以 DB 为准。
2. **`tar -tf` 读取中文名 zip 会失败（GBK 编码）**：验证备份内容请用 .NET `ZipFile`（PowerShell）或直接解压，勿依赖 tar 列表（已验证）。
3. **本机为 PowerShell**：命令行不能直接用 `&&`；中文路径需用引号。
4. **下载验证码开发模式**：未配 SMTP 时 `/api/download/send-code` 返回 `devCode` 供前端展示，属临时方案；上线前必须接真实 SMTP。
5. **i18n localStorage**：语言偏好存于 `localStorage['左文科技-locale']`，调试多语言时注意清缓存/手动重置。
6. **站点语言曾被切为英文**：历史原因（用户侧操作），排查文案差异时先确认 locale 状态。
7. **后台文档与前端事实对齐**：若前端 `lib/*.ts` 结构变化，需同步更新 01-数据字典 与本节 3.x。

---

## 6. 术语表

| 术语 | 含义 |
|------|------|
| MPCVD | 微波等离子体化学气相沉积 |
| SEO | 搜索引擎优化 |
| GEO | 生成式引擎优化（面向 AI 搜索/答案引擎） |
| RBAC | 基于角色的访问控制 |
| 360 帧图 | 产品 360° 旋转查看所需的连续图片帧 |
| 留资 | 下载验证时用户填写的联系方式信息 |

---

*记忆库持续维护；新增决策/坑点/事实请追加，勿覆盖历史。*
