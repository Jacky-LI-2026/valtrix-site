# VALTRIX 网站内容图片完整性检测报告

- **检测日期**：2026-09-08
- **检测范围**：本地 DB（postgresql://localhost:5432/zuowen_valve）、服务器文件（47.57.241.85 /var/www/valtrix/public）、线上站点（https://www.valvetrix.com/）
- **检测方法**：SQL 查询 DB 图片字段 → SSH 核对服务器文件是否存在 → curl 核对线上页面与图片 HTTP 状态码 → 对照前端渲染源码确认是否使用图片字段

---

## 0. 结论摘要（TL;DR）

| 指标 | 数值 |
|------|------|
| DB 引用的图片路径总数（去重） | 25（uploads/oem 18 + uploads/home 3 + placeholders 4） |
| **破图（线上 404）** | **5 处**（news 4 条 + about id=1，全部指向不存在的 /placeholders/*.webp） |
| 图片文件真实缺失（DB 有路径、服务器无文件） | 4 个文件（placeholders 下 4 个 webp），被 5 条记录引用 |
| 图片路径为空/NULL | 0 处 |
| 占位图引用（/placeholders/） | 5 处，全部 404 |
| uploads 图片文件缺失 | 0（18+3 全部存在且线上 200） |
| **阻断图片展示的严重问题** | **产品详情页全部 500**（.next 构建产物损坏，pm2 崩溃循环） |
| 图标/配图质量问题 | services 4 条图标映射全失效；14 个产品复用其他产品图；5 个行业借用产品图 |

**优先级排序**：
1. **P0**：产品详情页 500（所有产品封面图无法展示）→ 修复 .next 构建/重启部署
2. **P0**：news 4 条 + about 1 条破图（404）→ 上传真实配图或改指向存在的占位图
3. **P1**：services 图标全部回退默认（icon 值与前端映射不匹配）
4. **P2**：产品/行业图片复用、张冠李戴（建议逐条配真实图）
5. **P3**：oem 目录 9 个 GBK 中文名重复孤儿文件（清理）

---

## 1. 缺失图片清单（DB 有值但线上 404 / 路径指向不存在的文件）

**说明**：以下 5 条记录的图片字段全部指向 `/placeholders/industry-*.webp`，服务器 `/var/www/valtrix/public/placeholders/` 目录中**不存在**这 4 个文件，线上 curl 均返回 **404**，前台页面渲染时直接破图。

| 模块(表) | 记录ID | 记录名称/标题 | 字段名 | 当前值(路径) | 问题类型 | 建议配图主题 |
|----------|--------|---------------|--------|--------------|----------|--------------|
| news | 5 | VALTRIX Passes ISO 9001 Certification | coverImage | /placeholders/industry-semiconductor.webp | 文件不存在 / 线上404 | ISO 9001 认证证书/审核现场照片 |
| news | 6 | Semiconductor CapEx Recovery Drives Demand for High-Purity Fluid Systems | coverImage | /placeholders/industry-energy.webp | 文件不存在 / 线上404 | 半导体晶圆厂产线/洁净室场景 |
| news | 7 | VALTRIX Launches Ultra-High-Purity VCR Fittings for Semiconductor Fabs | coverImage | /placeholders/industry-optics.webp | 文件不存在 / 线上404 | VCR 接头产品实拍图 |
| news | 8 | VALTRIX Expands Production with New ISO 4 Cleanroom | coverImage | /placeholders/industry-machining.webp | 文件不存在 / 线上404 | ISO 4 洁净室/检测实验室实景 |
| about_sections | 1 | About VALTRIX（profile） | image | /placeholders/industry-machining.webp | 文件不存在 / 线上404 | 公司总部/无尘室装配线实景 |

**修复建议**（二选一）：
- 上传 4 张真实配图，命名与 DB 中路径一致（`/placeholders/industry-semiconductor.webp` 等），直接补到服务器对应目录；或
- 修改 DB 中 5 条记录的图片字段，指向已存在的占位图（如 `/placeholders/industry-default.webp`、`/placeholders/generic-tech.webp`、`/placeholders/about.webp`，均线上 200），再逐步替换为真实图。

---

## 2. 已有图片但文件不存在（DB 有路径、服务器无文件）

| 模块 | 记录 | 字段 | 路径 | 服务器检查 | 线上状态 |
|------|------|------|------|-----------|---------|
| news | 5/6/7/8 | coverImage | /placeholders/industry-semiconductor.webp 等 4 个 | **不存在**（placeholders 目录无此 4 文件） | 404 |
| about_sections | 1 | image | /placeholders/industry-machining.webp | **不存在** | 404 |

> **除此之外，uploads 目录引用全部真实存在**：products 31 条 coverImage 涉及的 17 个 `/uploads/oem/*` 文件、industries 6 条涉及的 6 个图片、about_sections 2/3/4 的 3 张、home_config banners 3 张（hero-cleanroom.jpg / hero-products.jpg / hero-building.jpg）——服务器文件全部存在，线上全部 200。

---

## 3. 占位图统计（/placeholders/ 路径）

| 项目 | 数量 |
|------|------|
| DB 中引用 `/placeholders/` 路径的记录 | **5 处**（news 4 + about_sections 1） |
| 其中指向**不存在**文件的引用 | **5 处**（全部） |
| 服务器 placeholders 目录现有文件 | 9 个（about.webp / generic-tech.webp / industry-default.webp / industry-marine-offshore.webp / industry-metallurgy-mining.webp / industry-natural-gas.webp / industry-petrochemical.webp / industry-power.webp / industry-water-treatment.webp） |
| 现存占位图线上状态 | 全部 200 |

> 结论：DB 引用的 4 个占位图文件名与服务器实际存在的 9 个文件**完全不匹配**，属"引用预设名但从未上传"的遗留问题。前台代码中另有 `/placeholders/generic-tech.webp`（news 无图兜底）与 `/placeholders/industry-default.webp`（products 列表兜底）引用，这两个文件存在、线上 200，不受影响。

---

## 4. 服务器 uploads 目录文件清单（按子目录统计）

### uploads/oem/ —— 33 个文件
**ASCII 命名（24 个，DB 引用其中 17 个）**：
```
BE.jpg  bsm-mr4.jpg  BT.jpg  cv3-fmr4.jpg  cv3-mr4.jpg
dv12a-mr4.jpg  dv12a-smr4.jpg  dv22a-mr8.jpg
ft4-mr4.png  ft5-mr4.jpg
GG_1.jpg  GG_2.jpg  GJ_13.png  GJ_1.jpg  GJ_3.png  GJ_8.png
GMN_1.png  GN_2.png
IE-TB8.jpg  IE-TB8.png  IT-TB8-TB8-TB4_1.png  IT-TB8-TB8-TB4_2.png
pre1-mr4.jpg  prt1-mr4.jpg
```
**GBK 中文命名（9 个，与 ASCII 文件字节一致 = 重复上传的孤儿文件，DB 未引用）**：
```
单向阀CV3-FMR4.jpg   单向阀CV3-MR4.jpg
过滤器FT4-MR4.png
隔膜阀DV12A-MR4.jpg  隔膜阀DV12A-SMR4.jpg  隔膜阀DV12A-SMR4_2.jpg
隔膜阀DV22A-FMR8.jpg 隔膜阀DV22A-MR8.jpg  隔膜阀DV22A-MR8_2.jpg
```
> 9 个中文名文件与对应 ASCII 文件大小完全一致（如 `隔膜阀DV12A-MR4.jpg`=dv12a-mr4.jpg=4,178,514 字节），属后台以中文文件名上传产生的重复文件，建议清理。

### uploads/home/ —— 3 个文件（全部被引用且正常）
```
hero-building.jpg   hero-cleanroom.jpg   hero-products.jpg
```
### 合计：uploads 下 36 个文件，无缺失。

---

## 5. 线上页面与图片 URL 核对结果

### 5.1 页面状态
| 页面 | 状态 |
|------|------|
| /（首页） | 200 |
| /products（产品列表） | 200 |
| **/products/[tab]/[slug]（产品详情，抽样 6 个）** | **500** ⚠️ |
| /industries + /industries/semiconductor 等详情 | 200 |
| /services + /services/technical-support | 200 |
| /news + /news/valtrix-iso9001-certified | 200 |
| /about | 200 |

### 5.2 图片 URL 状态（curl -I/-o NUL 实测）
| 分组 | 结果 |
|------|------|
| /uploads/oem/* 18 个（DB 全部引用） | 全部 **200** |
| /uploads/home/* 3 个 | 全部 **200** |
| /placeholders/industry-semiconductor.webp 等 4 个 | 全部 **404** ⚠️ |
| /placeholders/ 现存 9 个（抽查 about/generic-tech/industry-petrochemical） | 200 |
| /images/logo.png | 200 |
| /downloads/*（资源文件 6 个，服务器核实存在） | 存在 ✓ |

### 5.3 公开 API 透传确认（线上 /api/public/*）
- home-config：banners[].image → /uploads/home/hero-*.jpg（存在 ✓）
- industries：image → /uploads/**（存在 ✓）
- news：coverImage → /placeholders/industry-*.webp（**404** ⚠️）
- about：sections[0].image → /placeholders/industry-machining.webp（**404** ⚠️）；sections 2/3/4 → /uploads/**（存在 ✓）
- products：coverImage/image → /uploads/oem/*（存在 ✓）
- services：无 image 字段（仅 icon）
- resources：无图片字段（fileUrl 为 PDF/STEP，文件存在 ✓）

---

## 6. 其他发现（非破图，但影响展示质量/需关注）

### 6.1 ⚠️ 产品详情页全部 500（P0，阻断产品图展示）
- 线上 `/products/[tab]/[slug]` 全部返回 500，页面无法打开 → 产品封面图无法查看。
- 服务器 pm2 错误日志根因：
  - `TypeError: Cannot read properties of undefined (reading 'entryCSSFiles')`（app-page.runtime.prod.js）——.next 构建产物与运行不一致（疑似增量部署后构建目录损坏/陈旧 chunk）。
  - 伴生 `Cannot find module '/var/www/valtrix/.next/server/pages/_error.js'`（App Router 无 pages 错误页，500 时错误处理二次失败）。
- pm2 进程名 `valtrix` 崩溃循环（检查时 uptime 26s、重启 9 次）。
- **修复方向**：服务器重新 `pnpm build` 后 `pm2 restart valtrix`（或整包重部署），并验证产品详情恢复 200。图片文件本身（/uploads/oem/dv12a-mr4.jpg 等）均存在，不是图片缺失导致。

### 6.2 services 图标全部失效（P1，UI 问题）
- DB `services.icon` 值：`support / custom / maintenance / training`。
- 前端 `iconMap` 键：`Settings / Microwave / Wrench / Headphones / FlaskConical / ShieldCheck`。
- **4 条全部不匹配 → 一律回退默认齿轮（Settings）图标**，服务卡片/详情页图标区分度丢失。
- 修复：改 DB icon 值为前端映射键（如 support→Headphones、custom→Settings、maintenance→Wrench、training→FlaskConical），或前端 iconMap 补充 4 个新键。

### 6.3 产品图片复用/张冠李戴（P2，14/31 条）
| 产品ID | 名称 | 当前图（原属） | 建议 |
|--------|------|----------------|------|
| 16 | 微焊接四通 | IT-TB8-TB8-TB4_1.png（三通图） | 配四通实拍图 |
| 27 | O 形圈面密封接头 O 系列 | GG_1.jpg（金属垫片图） | 配 O 形圈密封接头图 |
| 28 | CF 法兰焊接接头 | GJ_1.jpg（长焊接接管图） | 配 CF 法兰图 |
| 29 | 低压大流量隔膜阀 | dv22a-mr8.jpg（中流量隔膜阀图） | 配低压大流量型号图 |
| 30 | 高压小流量隔膜阀 | dv12a-mr4.jpg（手动低压隔膜阀图） | 配对应型号图 |
| 31 | 高压中流量隔膜阀 | dv12a-mr4.jpg | 配对应型号图 |
| 32 | 中压中流量隔膜阀 | dv22a-mr8.jpg | 配对应型号图 |
| 33 | 高压弹簧隔膜阀 | dv12a-mr4.jpg | 配对应型号图 |
| 34 | 原子层沉积隔膜阀 | dv12a-mr4.jpg | 配 ALD 专用阀图 |
| 35 | 小流量灵敏减压阀 | prt1-mr4.jpg（联接式膜片减压阀图） | 配灵敏减压阀图 |
| 36 | 大流量灵敏减压阀 | prt1-mr4.jpg | 配灵敏减压阀图 |
| 37 | 小流量灵敏减压阀 | pre1-mr4.jpg（小流量减压阀图） | 配灵敏减压阀图 |
| 38 | 大流量灵敏减压阀 | pre1-mr4.jpg | 配灵敏减压阀图 |
| 39 | 不锈钢滤芯过滤器 | ft4-mr4.png（粉末烧结过滤器图） | 配不锈钢滤芯图 |

### 6.4 行业图片借用产品图（P2，5/6 条）
| 行业ID | 行业 | 当前图 | 建议 |
|--------|------|--------|------|
| 8 | Biopharmaceutical | ft5-mr4.jpg（陶瓷滤芯过滤器图） | 生物制药洁净产线/发酵罐场景 |
| 9 | LED & Display | ft4-mr4.png（粉末烧结过滤器图） | LED/显示面板产线场景 |
| 10 | Solar & Photovoltaic | bsm-mr4.jpg（波纹管计量阀图） | 光伏电池片产线场景 |
| 11 | Hydrogen Energy | GJ_1.jpg（长焊接接管图） | 氢能电解槽/加氢站场景 |
| 12 | Research Laboratories | IE-TB8.png（微焊接弯头图） | 实验室气路/科研院所场景 |
| （7 半导体使用 hero-cleanroom.jpg 无尘室图，主题匹配 ✓） | | | |

### 6.5 其他
- products `images`（多图 JSON 数组）全部为空——详情页仅单图展示，如需相册可后续补充。
- resource_items 无封面字段（仅 PDF/STEP 文件），资源卡片无需图片 ✓。
- product_tabs / product_categories 无图片字段（纯文字分类）✓。

---

## 7. 总结

- **共 5 处破图**（news 4 + about 1），全部源于 /placeholders/ 下 4 个文件缺失（占位图 5 处引用全部 404），是本次审计发现的唯一"图片文件不存在"问题。
- **uploads 目录 36 个文件 100% 完整**，产品/行业/首页/关于（2-4 节）的图片引用全部正常（线上 200）。
- **最严重问题不是缺图，而是产品详情页 500**（构建产物损坏 + pm2 崩溃循环），阻断全部产品图展示，应优先处理。
- 质量层面：services 图标映射失效（4/4）、产品图复用（14/31）、行业图借用产品图（5/6）、oem 目录 9 个 GBK 重复孤儿文件，建议按 P1→P3 逐步优化。

---
*报告生成：2026-09-08 · 检测脚本临时文件位于 scripts/_img_audit_tmp/（可删除）*
