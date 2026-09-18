# 左文科技企业官网 · 后台管理系统 数据字典

> 文档编号：ZW-BACKEND-01
> 版本：v1.0
> 日期：2026-08-30
> 说明：数据库统一使用 PostgreSQL；ORM 采用 Prisma（开发环境可用 SQLite 等价表结构）。所有内容表均含中英文字段、通用审计字段与软删除字段。

---

## 0. 约定

- **主键**：所有表使用 `id BIGSERIAL PRIMARY KEY`（或 Prisma `@id @default(autoincrement())`）。
- **审计字段**（每表标配）：
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `created_by BIGINT`（关联 users.id，可为空）
  - `updated_by BIGINT`
  - `deleted_at TIMESTAMPTZ`（软删除标记，NULL=未删除）
- **软删除**：除审计/日志类外，内容表一律软删除（`deleted_at`），避免误删。
- **slug 唯一性**：所有公开内容表 `slug` 建唯一索引（中英文 slug 分开用 `slug_en` 或由后台自动生成）。
- **locale 约定**：中文字段名不带后缀；英文字段名带 `_en` 后缀。
- **金额/数值**：金额用 `DECIMAL`，整数用 `INT`，比率/小数值用 `NUMERIC`。

---

## 1. 用户与权限域

### 1.1 users 用户表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| username | VARCHAR(50) | ✅ | - | 登录名，唯一 |
| email | VARCHAR(100) | ✅ | - | 邮箱，唯一（登录也可用） |
| password_hash | VARCHAR(255) | ✅ | - | bcrypt 哈希 |
| display_name | VARCHAR(50) | ✅ | - | 显示名称 |
| avatar_url | VARCHAR(500) | - | NULL | 头像 URL |
| status | SMALLINT | ✅ | 1 | 1=启用 0=禁用 |
| last_login_at | TIMESTAMPTZ | - | NULL | 最近登录 |
| last_login_ip | VARCHAR(45) | - | NULL | 最近登录 IP |
| created_at | TIMESTAMPTZ | ✅ | now() | 创建时间 |
| updated_at | TIMESTAMPTZ | ✅ | now() | 更新时间 |
| deleted_at | TIMESTAMPTZ | - | NULL | 软删除 |

**索引**：`UNIQUE(username)`、`UNIQUE(email)`

### 1.2 roles 角色表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| code | VARCHAR(30) | ✅ | - | 角色编码（admin / editor），唯一 |
| name | VARCHAR(50) | ✅ | - | 角色名称 |
| description | VARCHAR(255) | - | NULL | 描述 |
| is_system | BOOLEAN | ✅ | false | 系统内置角色不可删 |
| created_at / updated_at / deleted_at | - | - | - | 审计 |

**索引**：`UNIQUE(code)`
**种子数据**：`admin`（超级管理员）、`editor`（内容维护人员）

### 1.3 permissions 权限表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| code | VARCHAR(50) | ✅ | - | 权限编码，如 `product.create` |
| name | VARCHAR(50) | ✅ | - | 权限名称 |
| group | VARCHAR(30) | ✅ | - | 分组（product/news/resource/user/system...） |
| description | VARCHAR(255) | - | NULL | 描述 |

**索引**：`UNIQUE(code)`

### 1.4 role_permissions 角色权限关联

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | ✅ | 主键 |
| role_id | BIGINT | ✅ | 关联 roles.id |
| permission_id | BIGINT | ✅ | 关联 permissions.id |
| created_at | TIMESTAMPTZ | ✅ | 创建时间 |

**索引**：`UNIQUE(role_id, permission_id)`

### 1.5 user_roles 用户角色关联

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | ✅ | 主键 |
| user_id | BIGINT | ✅ | 关联 users.id |
| role_id | BIGINT | ✅ | 关联 roles.id |
| created_at | TIMESTAMPTZ | ✅ | 创建时间 |

**索引**：`UNIQUE(user_id, role_id)`

---

## 2. 内容域（核心）

### 2.1 product_tabs 产品系列表（一级目录）

> 对应前端 `productTabs`（长晶设备 / 配套设备 / 培育钻石 / 金刚石功能材料）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| slug | VARCHAR(50) | ✅ | - | 唯一标识（growth/auxiliary/diamonds/materials） |
| name | VARCHAR(50) | ✅ | - | 名称（长晶设备） |
| name_en | VARCHAR(80) | ✅ | - | 英文名称 |
| sort_order | INT | ✅ | 0 | 排序（升序） |
| status | SMALLINT | ✅ | 1 | 1=启用 0=禁用 |
| created_at / updated_at / deleted_at | - | - | - | 审计 |

**索引**：`UNIQUE(slug)`

### 2.2 product_categories 产品分类表（二级目录）

> 对应前端 `ProductCategory`（如：MPCVD长晶设备 / QC检测设备 / 激光切割机 / 培育钻石毛坯...）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| tab_id | BIGINT | ✅ | - | 关联 product_tabs.id |
| slug | VARCHAR(50) | ✅ | - | 唯一标识 |
| name | VARCHAR(50) | ✅ | - | 名称 |
| name_en | VARCHAR(80) | ✅ | - | 英文名称 |
| icon | VARCHAR(30) | - | NULL | 图标名（lucide 图标名） |
| description | VARCHAR(500) | - | NULL | 描述 |
| description_en | VARCHAR(800) | - | NULL | 英文描述 |
| sort_order | INT | ✅ | 0 | 排序 |
| status | SMALLINT | ✅ | 1 | 启用状态 |
| 审计字段 | - | - | - | - |

**索引**：`UNIQUE(slug)`、`INDEX(tab_id)`

### 2.3 products 产品型号表

> 对应前端 `ProductModel`（ZW-10C、ZW-Colorlarity 等）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| category_id | BIGINT | ✅ | - | 关联 product_categories.id |
| slug | VARCHAR(50) | ✅ | - | 唯一标识（zw-10c） |
| model | VARCHAR(30) | ✅ | - | 型号 code（ZW-10C） |
| name | VARCHAR(80) | ✅ | - | 产品名称 |
| name_en | VARCHAR(120) | ✅ | - | 英文名称 |
| image | VARCHAR(500) | - | NULL | 主图 URL |
| images | JSONB | - | '[]' | 图集（URL 数组） |
| frames360 | JSONB | - | NULL | 360 配置 `{template, totalFrames, startIndex}` |
| description | VARCHAR(500) | - | NULL | 简述 |
| description_en | VARCHAR(800) | - | NULL | 英文简述 |
| detail_content | TEXT | - | NULL | 详情长文（支持分段/富文本） |
| detail_content_en | TEXT | - | NULL | 英文详情 |
| manual_url | VARCHAR(500) | - | NULL | 产品手册下载 URL（NULL/# 时按钮灰显） |
| manual_url_en | VARCHAR(500) | - | NULL | 英文手册 URL |
| features | JSONB | - | '[]' | 特性列表 |
| features_en | JSONB | - | '[]' | 英文特性列表 |
| meta_title | VARCHAR(120) | - | NULL | SEO 标题 |
| meta_description | VARCHAR(300) | - | NULL | SEO 描述 |
| sort_order | INT | ✅ | 0 | 排序 |
| status | SMALLINT | ✅ | 1 | 1=上架 0=下架 |
| 审计字段 | - | - | - | - |

**索引**：`UNIQUE(slug)`、`INDEX(category_id)`、`INDEX(model)`

### 2.4 product_specs 产品规格表

> 对应前端 `ProductModel.specs`（键值对，如 光源=标准氙灯）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| product_id | BIGINT | ✅ | - | 关联 products.id |
| label | VARCHAR(50) | ✅ | - | 规格名（光源） |
| label_en | VARCHAR(50) | ✅ | - | 英文规格名 |
| value | VARCHAR(100) | ✅ | - | 规格值 |
| value_en | VARCHAR(100) | ✅ | - | 英文规格值 |
| sort_order | INT | ✅ | 0 | 排序 |

**索引**：`INDEX(product_id)`

### 2.5 industries 应用领域表

> 对应前端 `lib/industries.ts`

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| slug | VARCHAR(50) | ✅ | - | 唯一标识（jewelry/semiconductor...） |
| name | VARCHAR(50) | ✅ | - | 名称 |
| name_en | VARCHAR(80) | ✅ | - | 英文名称 |
| tagline | VARCHAR(200) | - | NULL | 标语 |
| tagline_en | VARCHAR(300) | - | NULL | 英文标语 |
| description | TEXT | - | NULL | 描述 |
| description_en | TEXT | - | NULL | 英文描述 |
| challenges | JSONB | - | '[]' | 挑战列表 |
| challenges_en | JSONB | - | '[]' | 英文挑战列表 |
| solutions | JSONB | - | '[]' | 解决方案 `[{title,desc,title_en,desc_en}]` |
| products | JSONB | - | '[]' | 相关产品列表 |
| products_en | JSONB | - | '[]' | 英文产品列表 |
| cases | JSONB | - | '[]' | 案例 `[{title,desc,title_en,desc_en}]` |
| image | VARCHAR(500) | - | NULL | 主图 |
| faq | JSONB | - | '[]' | FAQ `[{q,a}]`（GEO 优化） |
| meta_title | VARCHAR(120) | - | NULL | SEO |
| meta_description | VARCHAR(300) | - | NULL | SEO |
| sort_order | INT | ✅ | 0 | 排序 |
| status | SMALLINT | ✅ | 1 | 启用状态 |
| 审计字段 | - | - | - | - |

**索引**：`UNIQUE(slug)`

### 2.6 services 服务页面表

> 对应前端 `/services/*`（ODM定制/MPCVD配套/技术支持/售后服务）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| slug | VARCHAR(50) | ✅ | - | 唯一标识（odm/mpcvd/technical-support/after-sales） |
| name | VARCHAR(50) | ✅ | - | 名称 |
| name_en | VARCHAR(80) | ✅ | - | 英文名称 |
| tagline | VARCHAR(200) | - | NULL | 标语 |
| tagline_en | VARCHAR(300) | - | NULL | 英文标语 |
| hero_image | VARCHAR(500) | - | NULL | 头图 |
| content | JSONB | - | '[]' | 区块内容 `[{heading,heading_en,paragraphs,paragraphs_en}]` |
| features | JSONB | - | '[]' | 特性/流程列表 |
| process | JSONB | - | '[]' | 流程步骤 `[{title,desc}]` |
| faq | JSONB | - | '[]' | FAQ |
| meta_title / meta_description | - | - | NULL | SEO |
| sort_order / status / 审计 | - | - | - | - |

**索引**：`UNIQUE(slug)`

### 2.7 resource_categories 资源分类表

> 对应前端 `resourceCategories`（catalogs 产品样本 / certificates 证书 / drawings 图纸）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| type | VARCHAR(30) | ✅ | - | 唯一标识（catalogs/certificates/drawings） |
| title | VARCHAR(50) | ✅ | - | 标题 |
| title_en | VARCHAR(80) | ✅ | - | 英文标题 |
| description | VARCHAR(500) | - | NULL | 描述 |
| description_en | VARCHAR(800) | - | NULL | 英文描述 |
| icon | VARCHAR(30) | - | NULL | 图标名 |
| sort_order / status / 审计 | - | - | - | - |

**索引**：`UNIQUE(type)`

### 2.8 resources 资源条目表

> 对应前端 `ResourceItem`（产品样本/证书/图纸条目，含下载）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| category_id | BIGINT | ✅ | - | 关联 resource_categories.id |
| slug | VARCHAR(80) | ✅ | - | 唯一标识 |
| title | VARCHAR(150) | ✅ | - | 标题 |
| title_en | VARCHAR(200) | ✅ | - | 英文标题 |
| description | VARCHAR(500) | - | NULL | 描述 |
| description_en | VARCHAR(800) | - | NULL | 英文描述 |
| format | VARCHAR(30) | - | NULL | 格式（PDF/DWG/STEP...） |
| size | VARCHAR(20) | - | NULL | 大小（4.4 MB） |
| publish_date | DATE | - | NULL | 发布日期 |
| download_url | VARCHAR(500) | - | NULL | 下载 URL（NULL/#=无文件灰显） |
| file_asset_id | BIGINT | - | NULL | 关联 media_assets.id（可选） |
| need_verify | BOOLEAN | ✅ | true | 是否需下载验证 |
| download_count | INT | ✅ | 0 | 下载次数 |
| sort_order / status / 审计 | - | - | - | - |

**索引**：`UNIQUE(slug)`、`INDEX(category_id)`

### 2.9 news_categories 新闻分类表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| slug | VARCHAR(30) | ✅ | - | 唯一标识 |
| name | VARCHAR(30) | ✅ | - | 分类名（公司新闻/产品动态/技术动态） |
| name_en | VARCHAR(50) | ✅ | - | 英文分类名 |
| sort_order / status / 审计 | - | - | - | - |

**索引**：`UNIQUE(slug)`

### 2.10 news 新闻表

> 对应前端 `lib/news.ts`；支持采集生成（草稿态）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| category_id | BIGINT | ✅ | - | 关联 news_categories.id |
| slug | VARCHAR(120) | ✅ | - | 唯一标识（自动生成） |
| title | VARCHAR(200) | ✅ | - | 标题 |
| title_en | VARCHAR(300) | - | NULL | 英文标题 |
| excerpt | VARCHAR(500) | - | NULL | 摘要 |
| excerpt_en | VARCHAR(800) | - | NULL | 英文摘要 |
| content | JSONB | ✅ | '[]' | 正文段落数组 |
| content_en | JSONB | - | '[]' | 英文正文段落数组 |
| cover_image | VARCHAR(500) | - | NULL | 封面图 |
| tags | JSONB | - | '[]' | 标签（大模型打标） |
| featured | BOOLEAN | ✅ | false | 是否精选 |
| publish_date | TIMESTAMPTZ | - | NULL | 发布日期（可定时） |
| source_type | VARCHAR(20) | - | 'manual' | manual=手动采集=采集 |
| source_url | VARCHAR(500) | - | NULL | 采集来源 URL |
| source_name | VARCHAR(100) | - | NULL | 采集来源名称 |
| ai_generated | BOOLEAN | ✅ | false | 是否大模型生成/加工 |
| status | SMALLINT | ✅ | 0 | 0=草稿 1=已发布 2=已下架 |
| meta_title / meta_description | - | - | NULL | SEO |
| view_count | INT | ✅ | 0 | 浏览量 |
| 审计字段 | - | - | - | - |

**索引**：`UNIQUE(slug)`、`INDEX(category_id)`、`INDEX(status)`、`INDEX(publish_date)`、`INDEX(source_url)`

### 2.11 about_sections 关于我们分节表

> 对应前端 `lib/about.ts`（profile 简介 / culture 文化 / history 历程 / honors 资质）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| slug | VARCHAR(50) | ✅ | - | 唯一标识（profile/culture/history/honors） |
| title | VARCHAR(50) | ✅ | - | 标题 |
| title_en | VARCHAR(80) | ✅ | - | 英文标题 |
| subtitle | VARCHAR(200) | - | NULL | 副标题 |
| subtitle_en | VARCHAR(300) | - | NULL | 英文副标题 |
| content | JSONB | - | '[]' | 区块 `[{heading,heading_en,paragraphs,paragraphs_en}]` |
| highlights | JSONB | - | '[]' | 高亮数据 `[{label,label_en,value,value_en}]` |
| timeline | JSONB | - | '[]' | 时间线 `[{year,title,title_en,desc,desc_en}]` |
| certifications | JSONB | - | '[]' | 资质证书 `[{name,name_en,issuer,issuer_en,year}]` |
| image | VARCHAR(500) | - | NULL | 配图 |
| sort_order / status / 审计 | - | - | - | - |

**索引**：`UNIQUE(slug)`

### 2.12 jobs 职位表

> 对应前端 `lib/careers.ts`

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| slug | VARCHAR(80) | ✅ | - | 唯一标识 |
| title | VARCHAR(100) | ✅ | - | 职位名称 |
| title_en | VARCHAR(150) | - | NULL | 英文职位名 |
| department | VARCHAR(50) | ✅ | - | 部门 |
| department_en | VARCHAR(80) | - | NULL | 英文部门 |
| location | VARCHAR(50) | ✅ | - | 地点 |
| location_en | VARCHAR(80) | - | NULL | 英文地点 |
| type | VARCHAR(30) | ✅ | - | 类型（全职/实习） |
| type_en | VARCHAR(50) | - | NULL | 英文类型 |
| salary | VARCHAR(50) | - | NULL | 薪资范围 |
| salary_en | VARCHAR(80) | - | NULL | 英文薪资 |
| experience | VARCHAR(50) | - | NULL | 经验要求 |
| experience_en | VARCHAR(80) | - | NULL | 英文经验 |
| education | VARCHAR(50) | - | NULL | 学历要求 |
| education_en | VARCHAR(80) | - | NULL | 英文学历 |
| tags | JSONB | - | '[]' | 标签 |
| tags_en | JSONB | - | '[]' | 英文标签 |
| description | TEXT | - | NULL | 职位描述 |
| description_en | TEXT | - | NULL | 英文描述 |
| responsibilities | JSONB | - | '[]' | 职责列表 |
| responsibilities_en | JSONB | - | '[]' | 英文职责 |
| requirements | JSONB | - | '[]' | 要求列表 |
| requirements_en | JSONB | - | '[]' | 英文要求 |
| benefits | JSONB | - | '[]' | 福利列表 |
| benefits_en | JSONB | - | '[]' | 英文福利 |
| open | BOOLEAN | ✅ | true | 是否在招 |
| sort_order / status / 审计 | - | - | - | - |

**索引**：`UNIQUE(slug)`

---

## 3. 线索与留资域

### 3.1 leads 联系表单/留言表

> `/contact` 表单提交

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| name | VARCHAR(50) | ✅ | - | 姓名 |
| company | VARCHAR(100) | - | NULL | 公司 |
| email | VARCHAR(100) | - | NULL | 邮箱 |
| phone | VARCHAR(30) | - | NULL | 手机 |
| subject | VARCHAR(150) | - | NULL | 主题 |
| message | TEXT | ✅ | - | 留言内容 |
| source | VARCHAR(30) | - | NULL | 来源页面 |
| ip | VARCHAR(45) | - | NULL | 来源 IP |
| status | SMALLINT | ✅ | 0 | 0=新 1=已处理 |
| handled_by | BIGINT | - | NULL | 处理人 |
| handled_at | TIMESTAMPTZ | - | NULL | 处理时间 |
| created_at | TIMESTAMPTZ | ✅ | now() | 提交时间 |

**索引**：`INDEX(status)`、`INDEX(created_at)`

### 3.2 download_leads 下载留资表

> 下载验证通过后记录（满足「一次验证多次下载」的统计与留资需求）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| name | VARCHAR(50) | ✅ | - | 姓名 |
| company | VARCHAR(100) | - | NULL | 公司 |
| phone | VARCHAR(30) | ✅ | - | 手机 |
| email | VARCHAR(100) | ✅ | - | 邮箱（小写） |
| resource_id | BIGINT | - | NULL | 关联 resources.id |
| resource_name | VARCHAR(150) | - | NULL | 下载的资源名（冗余） |
| verified_at | TIMESTAMPTZ | ✅ | now() | 验证通过时间 |
| verified_count | INT | ✅ | 1 | 该次验证后下载次数 |
| ip | VARCHAR(45) | - | NULL | IP |
| user_agent | VARCHAR(300) | - | NULL | UA |

**索引**：`INDEX(email)`、`INDEX(resource_id)`、`INDEX(verified_at)`

### 3.3 verify_codes 邮箱验证码表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| email | VARCHAR(100) | ✅ | - | 邮箱 |
| code | CHAR(6) | ✅ | - | 6 位验证码（哈希存储） |
| purpose | VARCHAR(20) | ✅ | 'download' | 用途（download/contact/...） |
| expires_at | TIMESTAMPTZ | ✅ | - | 过期时间（发送后 5 分钟） |
| used | BOOLEAN | ✅ | false | 是否已使用 |
| send_count | INT | ✅ | 0 | 发送次数（限流） |
| last_sent_at | TIMESTAMPTZ | - | NULL | 上次发送时间 |
| created_at | TIMESTAMPTZ | ✅ | now() | 创建时间 |

**索引**：`INDEX(email, purpose)`、`INDEX(expires_at)`

---

## 4. 配置域

### 4.1 site_config 站点配置表（键值）

> 联系方式、地址、页脚、备案号、Logo、SEO 默认值等

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| key | VARCHAR(50) | ✅ | - | 配置键（contact_phone/address/icp/logo...） |
| value | TEXT | - | NULL | 配置值 |
| value_json | JSONB | - | NULL | 复杂值 |
| group | VARCHAR(30) | ✅ | 'site' | 分组 |
| description | VARCHAR(200) | - | NULL | 说明 |
| updated_at | TIMESTAMPTZ | ✅ | now() | 更新时间 |

**索引**：`UNIQUE(key)`

### 4.2 theme_config 主题配色表

> 对应前端 `tailwind.config.ts` 的 primary/accent/dark 色板；改造为 CSS 变量后由本表驱动

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| token | VARCHAR(50) | ✅ | - | CSS 变量名（color-primary） |
| value | VARCHAR(20) | ✅ | - | RGB 三元组或 HEX（204,0,0 / #CC0000） |
| group | VARCHAR(20) | ✅ | - | primary / accent / dark |
| is_active | BOOLEAN | ✅ | true | 是否启用 |
| updated_at | TIMESTAMPTZ | ✅ | now() | 更新时间 |

**索引**：`UNIQUE(token)`
**默认种子**：primary=#CC0000 全阶、accent=#C0C0C0 全阶、dark=#111111 全阶（对齐当前 tailwind.config.ts）

### 4.3 home_config 首页配置表

> Hero 轮播、统计数据、首页区块显隐

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| block | VARCHAR(30) | ✅ | - | 区块（hero/stats/sections） |
| config | JSONB | ✅ | '{}' | 区块配置（轮播数组/统计数组/显隐开关） |
| is_active | BOOLEAN | ✅ | true | 是否启用 |
| updated_at | TIMESTAMPTZ | ✅ | now() | 更新时间 |

**说明**：`block='hero'` 存轮播 `[{title,subtitle,description,cta_text,cta_link,bg_gradient}]`；`block='stats'` 存统计 `[{value,suffix,label,label_en}]`。

### 4.4 collect_sources 采集源配置表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| name | VARCHAR(100) | ✅ | - | 采集源名称 |
| url | VARCHAR(500) | ✅ | - | RSS/网页 URL |
| type | VARCHAR(20) | ✅ | 'rss' | rss / html |
| category_id | BIGINT | - | NULL | 目标新闻分类 |
| frequency_hours | INT | ✅ | 6 | 抓取频率（小时） |
| enabled | BOOLEAN | ✅ | true | 是否启用 |
| last_run_at | TIMESTAMPTZ | - | NULL | 最近抓取时间 |
| last_status | VARCHAR(50) | - | NULL | 最近状态 |
| last_error | VARCHAR(500) | - | NULL | 最近失败原因 |
| fetch_count | INT | ✅ | 0 | 累计抓取数 |
| created_at / updated_at | - | - | - | 审计 |

### 4.5 ai_config 大模型配置表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| provider | VARCHAR(20) | ✅ | 'volcengine' | volcengine / openai / custom |
| api_base | VARCHAR(500) | - | NULL | BaseURL |
| api_key_enc | TEXT | ✅ | - | API Key（加密存储） |
| model | VARCHAR(80) | ✅ | - | 模型名 |
| temperature | NUMERIC(3,2) | ✅ | 0.3 | 温度 |
| max_tokens | INT | ✅ | 2000 | 最大输出 |
| enabled | BOOLEAN | ✅ | true | 是否启用 |
| prompt_clean / prompt_translate / prompt_summary / prompt_tag | TEXT | - | NULL | 各场景 Prompt 模板 |
| updated_at | TIMESTAMPTZ | ✅ | now() | 更新时间 |

---

## 5. 系统域

### 5.1 operation_logs 操作日志表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| user_id | BIGINT | - | NULL | 操作用户 |
| username | VARCHAR(50) | - | NULL | 用户名（冗余） |
| action | VARCHAR(50) | ✅ | - | 操作（create/update/delete/publish/export） |
| resource_type | VARCHAR(30) | ✅ | - | 资源类型（product/news/user...） |
| resource_id | BIGINT | - | NULL | 资源 ID |
| summary | VARCHAR(500) | - | NULL | 操作摘要 |
| detail | JSONB | - | NULL | 变更前后值 |
| ip | VARCHAR(45) | - | NULL | IP |
| created_at | TIMESTAMPTZ | ✅ | now() | 时间 |

**索引**：`INDEX(user_id)`、`INDEX(resource_type, resource_id)`、`INDEX(created_at)`

### 5.2 media_assets 媒体资产表

> 上传的图片/360 帧图/文件统一管理（OSS/S3）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| storage_key | VARCHAR(500) | ✅ | - | 存储路径/对象键 |
| url | VARCHAR(500) | ✅ | - | 访问 URL |
| type | VARCHAR(20) | ✅ | - | image / file / frame360 |
| mime | VARCHAR(100) | - | NULL | MIME |
| size | BIGINT | - | NULL | 字节大小 |
| width / height | INT | - | NULL | 图片尺寸 |
| related_type | VARCHAR(30) | - | NULL | 关联类型（product/resource/...） |
| related_id | BIGINT | - | NULL | 关联 ID |
| created_by | BIGINT | - | NULL | 上传人 |
| created_at | TIMESTAMPTZ | ✅ | now() | 上传时间 |

**索引**：`INDEX(related_type, related_id)`

### 5.3 backup_records 备份记录表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| filename | VARCHAR(200) | ✅ | - | 备份文件名 |
| storage_key | VARCHAR(500) | ✅ | - | 存储位置 |
| size | BIGINT | - | NULL | 大小 |
| type | VARCHAR(20) | ✅ | 'auto' | auto/manual |
| status | VARCHAR(20) | ✅ | 'running' | running/success/failed |
| error | VARCHAR(500) | - | NULL | 失败原因 |
| created_at | TIMESTAMPTZ | ✅ | now() | 创建时间 |

### 5.4 system_versions 系统版本表

> 记录系统版本信息，用于系统更新模块展示当前版本与历史版本。

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| version | VARCHAR(20) | ✅ | - | 版本号（语义化，如 1.0.0） |
| release_date | DATE | ✅ | - | 发布日期 |
| build_time | TIMESTAMPTZ | - | NULL | 构建时间 |
| git_commit | VARCHAR(40) | - | NULL | Git commit hash |
| environment | VARCHAR(20) | ✅ | 'production' | production/staging/development |
| is_current | BOOLEAN | ✅ | false | 是否当前运行版本 |
| notes | TEXT | - | NULL | 版本备注 |
| created_at | TIMESTAMPTZ | ✅ | now() | 创建时间 |

**索引**：`UNIQUE(version, environment)`、`INDEX(is_current)`

### 5.5 system_update_logs 系统更新日志表（Changelog）

> 记录每次版本更新的功能变更、优化、修复内容，用于后台更新日志展示。

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | BIGSERIAL | ✅ | 自增 | 主键 |
| version_id | BIGINT | - | NULL | 关联 system_versions.id |
| version | VARCHAR(20) | ✅ | - | 版本号（冗余，便于展示） |
| change_type | VARCHAR(20) | ✅ | - | feature（新增）/ improvement（优化）/ bugfix（修复）/ security（安全） |
| title | VARCHAR(200) | ✅ | - | 变更标题 |
| description | TEXT | - | NULL | 变更详细说明 |
| module | VARCHAR(30) | - | NULL | 所属模块（product/news/theme/system...） |
| sort_order | INT | ✅ | 0 | 同版本内排序 |
| created_by | BIGINT | - | NULL | 录入人 |
| created_at | TIMESTAMPTZ | ✅ | now() | 创建时间 |

**索引**：`INDEX(version)`、`INDEX(change_type)`、`INDEX(version_id)`

---

## 6. 表间关系概览

```
users ──< user_roles >── roles ──< role_permissions >── permissions
products ──< product_specs
product_tabs ──< product_categories ──< products
resource_categories ──< resources ──< download_leads
news_categories ──< news
collect_sources ──> news（采集生成草稿）
media_assets（被 products/resources/news 引用）
verify_codes（独立）
site_config / theme_config / home_config / ai_config（独立键值/单行）
```

---

*数据字典随开发迭代更新，任何表结构变更需同步更新本文档与 05-dev-memory.md。*
