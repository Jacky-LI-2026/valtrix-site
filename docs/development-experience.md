# 左文科技企业官网 — 开发经验总结（规则/记忆/标准/方法）

> 本文档沉淀本项目（Next.js 14 + Prisma + PostgreSQL + 六语种 CMS + SSH 部署）自开发以来
> 的经验、坑点与方法论，供后续开发/维护/扩展直接复用。配套可执行能力见同名 Skill
> `zuowen-web-maintenance`（Agent 工作用）；详细逐日记录见 `AGENTS.md`。

---

## 一、环境与命令标准（本机 Windows + PowerShell）

| 场景 | 标准命令 | 说明 |
|---|---|---|
| 开发启动 | `pnpm dev` | 端口 3000 |
| 类型检查 | `npx tsc --noEmit` | **必须清零**才可保证生产 `pnpm build` 通过（生产 build 全量检查 tsc/lint） |
| 生产构建 | `pnpm build` | 服务器/本地均可 |
| 日常部署 | `node scripts/_deploy_incremental.js` | md5 对比只传变化文件；schema 变化自动 prisma generate+db push；源码变化自动 build+pm2 restart |
| 首部署/大版本 | `node scripts/_make_deploy_package.js` → `_deploy_new_package.js` | 整包部署 |
| 数据库迁移 | `npx prisma db push` + `npx prisma generate` | 改 schema 后必须重启 dev server（运行中进程缓存旧 Prisma Client） |

**硬性约定**：
- 本机 PowerShell：**不能直接用 `&&`**，需 `;` 或分条；中文路径加引号。
- 改 schema 后：`prisma db push` → `prisma generate` → **重启 dev server**，否则「翻译后无法保存」。
- 编辑含中文的代码文件时 Edit 工具可能报 "Native execution failed"，改用 node 脚本替换（文件多为 CRLF，正则注意 `\r?\n`）。
- 本地 `npx tsc --noEmit` 是生产 build 的「先行哨兵」，改完代码先过 tsc。

---

## 二、多语言机制标准（本项目最复杂、坑最多）

### 2.1 字段命名约定（全站硬约束）
- 中文（默认语种）用基础名 `name`；其他语种 = 基础名 + 语言首字母大写：`nameEn/Ja/Ko/Fr/Ar`。
- 系统内日文代号**统一 `ja`**（字段后缀 `Ja`）；`jp` 只出现在两处适配，禁止改动：
  1. `app/api/admin/translate/route.ts` 的 `baiduLangCodes.ja='jp'`（百度 API 强制）；
  2. `components/layout/Header.tsx` 的 `localeCodes.ja="JP"`（UI 国别徽标）。
- 数组字段（jsonArray/stringArray）在 form 中是 **JSON 字符串**：提交前 `serializeJsonFields` 解析为数组、加载时 `deserializeJsonFields` 转字符串；翻译时必须识别 JSON 走逐项翻译。
- 语种集合：zh/en/ja/ko/fr/ar（后台「语种管理」可禁用某语种）。

### 2.2 前后台统一入口
- **前端**：`lib/localized.ts` → `createLocalizedGetter(locale)` → `loc.get(obj,field)` / `loc.getArray` / `loc.getText`（数组 join 空格，兼容 string[]|string）。禁止再写 `isEn ? xEn : x`（切 ja/ko/fr/ar 时永远显示中文）。
- **后台表单**：`MultiLangFormField` + `useAdminForm` + `AutoTranslateBar` + `SeoGeoConfig`，字段配置集中在各模块 `_fields.ts`。
- **后台内容 API**：POST/PUT **必须全量接收并写库全部多语言字段**——前端 `{...form}` 全量提交，后端漏解构的字段会被**静默丢弃**（提示成功但刷新丢失）。

### 2.3 翻译通道与优先级
| 通道 | 状态 | 语言码 | 备注 |
|---|---|---|---|
| 小牛 NIU | ✅ 可用 | `fr` 等标准码 | `.env.local` 有 key；间隔 ~750ms |
| 百度 | ❌ 欠费 54004 | `jp/kor/ara` | 免费版 QPS≈1，超限 54003 退避重试 |
| MyMemory | ✅ 兜底 | `de=` 配额参数 | 需反解 `&quot;` 等实体 |
| 火山 | ❌ 未开通服务 | — | 认证通过但 TranslationList 恒空 |
| DeepSeek AI | ❌ 未配 key | — | 后台「翻译设置」可选，需用户填 key |

- **统一节流**：所有翻译请求必须走 `lib/translate-utils.ts` 全局节流 `throttleTranslate()`，否则多字段并发超限导致随机失败返回原文。
- **批量翻译脚本模式**（scripts/）：百度优先或小牛优先 + MyMemory 兜底，`节流 600-1300ms` + fetch AbortController timeout(15s)，否则挂死。

### 2.4 多语言排查路径（按优先级）
1. **某语种切不回中文**：先查 DB `language` 表（注意表名单数，@@map）`isActive`（fr 曾因 isActive=false 被禁）+ 确认 `/api/public/languages` 有 `export const dynamic="force-dynamic"`（否则生产 build 静态化，改 DB 不实时生效）。
2. **翻译后无法保存**：第一优先查 `schema.prisma` 对应模型是否缺该语种字段（Service 曾只到 En）；改完 schema 重启 dev server。
3. **某字段翻译不生效、另种生效**：优先怀疑**写回链路覆盖竞态**（旧闭包 onChangeZh/onChangeEn 二次写回覆盖其他语种）；有 `onValuesChange` 时只全量写回一次。
4. **「一键翻译全部」不生效**：AutoTranslateBar 手动按钮不依赖「自动翻译」开关；数组字段必须走 JSON 识别。

---

## 三、部署与上线标准

### 3.1 部署方式选择
| 场景 | 方式 |
|---|---|
| 日常代码/静态更新 | **增量** `scripts/_deploy_incremental.js`（秒级，只传变化文件） |
| 首部署/大版本/服务器全新 | **整包** `_make_deploy_package.js` + `_deploy_new_package.js` |
| 只改静态不重启 | 增量脚本自动判断（仅静态变化不 restart） |

### 3.2 部署硬性坑点（全部已验证）
- **Windows zip 反斜杠**：PowerShell `Compress-Archive` 生成 `\` 分隔条目，Linux 解压后成单文件名 → 打包必须用 `tar -a -c -f out.zip -C dir .`（bsdtar 生成正斜杠 zip）。
- **`pnpm.onlyBuiltDependencies`**（package.json）必配：@prisma/client/@prisma/engines/prisma/esbuild/ssh2/cpu-features/unrs-resolver，否则 `pnpm install` 跳过 postinstall → Next build 必挂。
- **`pnpm install --prod` 缺 devDependencies → build 失败**：统一 `pnpm install`。
- **pm2 启动**：进程存在且 grep 到 `next start` → `pm2 delete` + `NODE_ENV=production pm2 start "node server.js"`；存在但非 next start → `pm2 restart`；不存在 → 新建。**NODE_ENV=production 必须显式设置**（`node server.js` 自定义 server，防 iPhone RSC header 500）。
- **db-check**：`grep -qE '^DATABASE_URL="?postgres'`（.env 里 URL 可能带引号）。
- **keepalive**：SSH 连接必须 `keepaliveInterval:10000, keepaliveCountMax:12`，否则大 zip（138MB）长传被防火墙断开。
- **大文件上传格式**：multipart 的 `formData.get('serverId')` 是 FormDataEntryValue，先 `String()` 再判空。
- **部署会话**在内存（session-manager.ts），服务重启丢失；start 前防并发（同 server 有 running/pending 会话返回 409）。
- **前端日志重复**：轮询闭包必须用 `useRef(logs.length)`（每次渲染新建普通对象会导致 slice 从 0 全量追加）。

### 3.3 部署后验证矩阵（必跑）
```
health: 200
/           → 200
/products   → 200
/news       → 200
/admin      → 307（登录重定向）
pm2 status  → online（node server.js）
数据库连通  → psql 可查
```
- 服务器公网 IP:3000 不可达 = 阿里云安全组未放行 3000 端口，需放行或 Nginx 80 反代。
- **域名绑定**：授权域名校验忽略端口（localhost:3000 视为 localhost）。

---

## 四、调试方法论（分类排查，避免走弯路）

### 4.1 前端兜底页崩溃（error.tsx「500 页面出了点问题」）
- **先看浏览器 console**，不要先怀疑服务器。`formatUrl` / `Cannot destructure ... undefined` = **`<Link href={undefined}>`**（Next 内置 formatUrl 解构崩溃）。
- 根因典型：接口返回的数据 children 字段是 `url` 无 `href`，移动端组件漏了 `href || url` 兜底（桌面导航有、移动抽屉漏）。
- 排查链：浏览器自动化窄视口复现 → 抓 console 报错 → 下载错误 chunk 定位 → 对照源码找 href 兜底差异。

### 4.2 iPhone 全系二级页 500（server.js 方案）
- 症状：iPhone Safari/Chrome/Edge/企业微信 + 桌面缩窄窗口点导航到二级页 500，直接输地址正常。
- 根因：Next 客户端导航 RSC 的 `Next-Router-State-Tree` header 被移动端发为畸形 → 服务端 parse 抛错 → 500。错误日志在 `/root/.pm2/logs/zuowen-web-error.log`。
- **已修**：`server.js` 自定义 server，handle 前校验该 header，畸形则删除降级整页加载。**middleware 方案已证伪**（edge runtime 在 middleware 前剥离 RSC headers）。

### 4.3 「翻译/保存」类问题
- 见「多语言排查路径」§2.4。

### 4.4 build 失败排查
- 生产 `pnpm build` 全量检查 tsc/lint：先本地 `npx tsc --noEmit` 清零。
- 常见：`eslint-disable @typescript-eslint/no-var-requires` 引用未安装规则 → 删注释行；JSX 英文双引号未转义（react/no-unescaped-entities，改中文引号）；Route 文件导出非 HTTP 方法（抽到 lib/）；隐式 any / Map 迭代 / 重复属性等 tsc 类型错误。

---

## 五、数据与备份还原标准

### 5.1 数据源
- **生产权威数据在服务器**（8.130.65.182，PostgreSQL 17.11，库 `zuowen_admin`）。本机 PG 无常驻服务、数据目录未初始化 → **备份一律从服务器 dump**。
- 跨版本迁移（本机 PG17 dump 到低版本服务器）用 **SQL 格式（--column-inserts）+ psql**，`.dump` archive 不跨版本兼容。
- psql 连 DATABASE_URL 需 `sed 's/\?schema=[^&]*//'`（psql 不识别 schema 参数）。

### 5.2 本地备份标准（已验证，2026-09-03）
备份目录：`D:\企业网站\_local_backup\<时间戳>\`，内容：
```
source.tar.gz    源码（排除 node_modules/.next/_pgsql/tmp/backups/项目备份/_backups/data/uploads/*.zip/*.dump/*.log）
database.sql     服务器 pg_dump --column-inserts --no-owner --no-privileges（生产库）
uploads.tar.gz   public/uploads（用户上传图片）
config-keys/     .env/.env.local/AGENTS.md/package.json/prisma/schema.prisma/data/license.json/docs/scripts
MANIFEST.md      清单与还原说明
```
- 备份脚本流程：`tar` 打包源码 → SSH 服务器 `pg_dump > /root/*.sql` → sftp `fastGet` 下载 → 清理服务器临时文件。
- **还原**：解压源码 + `pnpm install` + `prisma db push` + `pnpm build`；数据库 `psql -f database.sql`；图片解压到 public/。
- **安全**：备份/打包时排除 `scripts/license-keys`（RSA 私钥严禁外泄）与 `data/license.json` 可按需。

---

## 六、业务与审美规范（用户强约束，交付前自查）

| 规范 | 内容 |
|---|---|
| 区块头对齐 | 「标题 + 一句话」类型**居中**；表单/输入框类标签**左对齐**（与输入框左缘对齐）；详情/正文标题左对齐 |
| 英文标题 | **capitalize**（首字母大写，非整句大写） |
| 图片上传 | 后台所有图片上传收敛于 `/api/admin/upload`（sharp 转 WebP、大图 1600/q80 + 缩略图 400/q75）；禁止 readAsDataURL/base64 直传旁路 |
| 图片占位 | 后台未上传时用主题占位图（public/placeholders/*.webp），上传图优先 |
| 页面头部配置 | page-hero 背景图标示推荐规格（1920×600 约16:5，JPG/PNG/WebP） |
| LOGO 同步 | 后台站点配置换 Logo → 页头页脚**同时生效**（同 syncFields） |
| 用户偏好 | 对基础审美错误极度敏感；要求「修复并查类似问题」（全站同类扫描）；方案先出简版再细化 |

---

## 七、协作与记忆约定

- `AGENTS.md`（约 98KB）是本项目**长期记忆**：动代码前先读；含全部 ADR、坑点、验证记录、服务器信息。
- 每次完成功能/修复后**追加记录到 AGENTS.md**（含验证结论、坑点、部署状态），保持记忆持续可用。
- 文档索引：
  - 通用功能块规范：`docs/frontend/shared-components-guide.md`
  - 后端开发记忆库：`docs/backend/05-dev-memory.md`
  - 数据字典：`docs/backend/01-data-dictionary.md`
  - QA 回归清单：`docs/frontend/qa-checklist.md`
- 部署/翻译/备份脚本集中在 `scripts/`，命名 `_xxx.js` 前缀为一次性工具。
