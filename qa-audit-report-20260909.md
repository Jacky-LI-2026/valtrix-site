# VALTRIX 前台全站严格检测报告

**检测日期**：2026-09-09
**检测范围**：https://www.valvetrix.com 全部前台页面（66 个 URL）
**检测方式**：Node.js 全站爬虫（死链接/图片/状态码）+ 浏览器实测（多语言/视觉/控制台错误，约 54 个页面×语种组合）
**语种覆盖**：en / zh 全量（22 页×2），ja / ko / fr / ar 抽查（5 页×4）
**源码定位**：D:\阀门网站

---

## 结论摘要

- **页面可用性**：66/66 页面全部 HTTP 200，无页面崩溃、无 500、无 [object Object]/undefined。
- **死链接**：1 个（产品手册 PDF 404，影响 17 个产品详情页下载按钮）。
- **多语言**：核心问题集中在**数据层**——zh 基础字段被英文填充（新闻/行业/关于/资源 4 大模块），首页 Hero 全语种槽位均为英文；另有 1 处代码 bug（相关服务丢弃多语言字段）。
- **RTL（ar）**：`dir="rtl"` 全部正确生效，布局镜像正常，仅电话号码 bidi 乱序。
- **SEO**：sitemap.xml 全部 469 个 URL 域名错误（valtrix.example.com），对搜索引擎完全失效。
- **控制台**：favicon.ico 404（每页噪音）、resources 页 403×4、产品页 PDF 404。

---

## 一、高严重度问题（6 项）

### H1. 首页 Hero 区在 zh/ja/ko/fr/ar 五个语种下全部为英文

| 项 | 内容 |
|---|---|
| 页面 | `/`（首页） |
| 语种 | zh / ja / ko / fr / ar |
| 类型 | 内容缺失（数据层） |
| 问题原文 | 标题 `Ultra-High-Purity Valves & Fittings`、副标题 `Diaphragm Valves • Pressure Reducers • Filters`、描述整段英文、按钮 `View Products`、底部统计标签 `Product Series / Industries Served / He Leak Tested / Cleanroom Class` |
| 根因 | `HomeConfig.banners[].title/subtitle/ctaText/badge` 与 `stats[].label` 的 `{zh,en,ja,ko,fr,ar}` 对象**所有语种槽位都填的是英文**（API 实测 `banner-1.title.zh = "Ultra-High-Purity Fluid Control Expert"`）。渲染层 `components/sections/Hero.tsx:62-77` pickLang 逻辑正确，取到的就是英文。另 `Hero.tsx:124-127` defaultStats 仅 en/zh 两分支，ja/ko/fr/ar 回退中文 |
| 修复点 | ① 后台「首页配置 → Banner/数据统计」逐语种补齐文案；② `Hero.tsx` defaultStats 改走 `t()` 字典 |
| 证据 | `_qa_audit_20260909/H1_zh_home_hero_english.png` |

### H2. zh 语种下新闻/行业/关于/资源四大模块正文整段英文残留

| 项 | 内容 |
|---|---|
| 页面 | `/news`、`/news/valtrix-iso9001-certified`、`/industries`、`/industries/semiconductor`、`/about`、`/about/profile`、`/about/history`、`/about/honors`、`/resources`、`/resources/manual`、首页 About/行业卡片区 |
| 语种 | zh |
| 类型 | 内容缺失（数据层） |
| 问题原文 | 新闻标题 `VALTRIX Passes ISO 9001 Certification` + 英文摘要；行业卡片 `Semiconductor Manufacturing / Ultra-high-purity fluid control for wafer fabs`；about/profile 三大段英文；history 标题 `Milestones` + 英文正文；honors 标题 `Quality & Certifications` + 英文正文；资源 `VALTRIX Product Catalog 2026 / VCR Face Seal Fittings Guide` |
| 根因 | **数据层**——zh 基础字段被英文填充（站点以英文为基准内容，zh 字段从未翻译）。API 实测 `news.title(zh)="VALTRIX Expands Production..."`、`industries.name(zh)="Semiconductor Manufacturing"`、`about_sections.title(zh)="Milestones"`。`lib/localized.ts:23-46` 对 zh 直接读基础字段 → 英文。非渲染 bug |
| 修复点 | 补齐各模块 zh 字段翻译（后台逐条或批量翻译脚本）；注意 `contentJa/Ko/Fr/Ar` 反而已有翻译，说明数据导入时基准语种搞反了 |
| 证据 | `_qa_audit_20260909/H2_zh_news_english.png`、`H2_zh_about_profile_english.png` |

### H3. en 语种下 /services/technical-support「Related Services」卡片全中文（代码 bug）

| 项 | 内容 |
|---|---|
| 页面 | `/services/technical-support` |
| 语种 | en |
| 类型 | 程序代码 bug |
| 问题原文 | `Related Services` 英文标题下，三张卡片全中文：`定制加工 \| 特殊材质与超高纯表面处理定制`、`维护与备件 \| 高纯系统检修与备件供应`、`培训与咨询 \| 安装、焊接与维护专业培训`，按钮却是英文 `Learn more` |
| 根因 | `app/services/[slug]/ServiceDetailClient.tsx:80` `setRelatedServices(rec.map((x)=>({slug,title:x.title,subtitle:x.subtitle})))` **丢弃了全部多语言字段**（titleEn/Ja/Ko/Fr/Ar 未透传），第 382 行 `loc.get(s,"title")` 在 en 下查 `titleEn` 为 undefined → 回退中文 |
| 修复点 | 映射保留完整对象：`setRelatedServices(rec.map(x => ({...x})))` 或显式带 `titleEn/titleJa/.../subtitleEn/...` |
| 证据 | `_qa_audit_20260909/H3_en_related_services_chinese_v2.png` |

### H4. ar 语种下产品详情 features 中文残留（数据缺失）

| 项 | 内容 |
|---|---|
| 页面 | `/products/filters/ft4-mr4-s15`（可能波及其他产品） |
| 语种 | ar |
| 类型 | 内容缺失（数据层） |
| 问题原文 | `滤芯0.5μm`、`316L/EP可选` |
| 根因 | FT4 的 `featuresAr=[]`（空数组），`lib/localized.ts:55-78` getLocalizedArrayField 回退 zh（中文） |
| 修复点 | 补 FT4 featuresAr，并全量扫描 31 个产品的 featuresAr/featuresKo/featuresJa/featuresFr 是否有空缺 |
| 证据 | `_qa_audit_20260909/H4_ar_ft4_features_chinese.png` |

### H5. 产品手册下载 PDF 404（所有产品详情页）

| 项 | 内容 |
|---|---|
| 页面 | 全部 31 个产品详情页（下载按钮） |
| 语种 | 全语种 |
| 类型 | 内容缺失 + 死链接 |
| 问题 | `https://www.valvetrix.com/downloads/valve-tech-product-manual.pdf` → **404** |
| 根因 | `app/products/[tab]/[id]/ProductDetailClient.tsx:16` 硬编码 `DEFAULT_MANUAL_URL="/downloads/valve-tech-product-manual.pdf"`；`public/downloads/` 目录存在但**为空**，手册文件从未放置；各型号 `model.manualUrl` 未配置 |
| 修复点 | ① 上传真实 PDF 到 `public/downloads/` 并随部署发布；② 或为各型号配置 `manualUrl`；③ 该链接出现在全部产品详情页下载按钮，影响面大，优先处理 |
| 影响页面 | 17 个产品详情页在 HTML 中含此链接（爬虫确认），控制台均报 404 |

### H6. sitemap.xml 全部 URL 域名错误（SEO 完全失效）

| 项 | 内容 |
|---|---|
| 页面 | `/sitemap.xml` |
| 类型 | 配置/代码 bug |
| 问题 | sitemap.xml 内 **469 处 URL 全部写成 `https://www.valtrix.example.com/...`**，实际应为 `https://www.valvetrix.com`。搜索引擎抓取后所有 URL 指向不存在域名 |
| 根因 | `app/sitemap.ts:5` 硬编码 `const baseUrl = "https://www.valtrix.example.com"`；同一错误域名还散落于 14 个文件：`lib/seo.ts:99`（canonical）、`app/robots.ts`、`app/sitemap-images.xml/route.ts`、`app/llms.txt/route.ts`、`app/news/[slug]/page.tsx`、`app/products/[tab]/[id]/page.tsx`、`app/services/[slug]/page.tsx`、`lib/seo/baidu-push.ts`、`app/api/admin/email-marketing/route.ts` 等 |
| 修复点 | 将 `valtrix.example.com` 全量替换为 `valvetrix.com`，建议统一收敛到 `NEXT_PUBLIC_SITE_URL` 环境变量，避免散落硬编码；重新部署后验证 sitemap.xml |

---

## 二、中严重度问题（7 项）

### M1. 加载态"加载中..."未本地化

| 项 | 内容 |
|---|---|
| 页面 | 服务/职位/行业/关于等详情页与列表页（`/services/*`、`/careers/*`、`/about/*`、`/industries/*`） |
| 语种 | en / ja / ko / fr / ar（页面加载时闪现中文） |
| 类型 | 程序代码 bug |
| 问题原文 | `加载中...` |
| 根因 | 多处硬编码中文：`app/services/[slug]/ServiceDetailClient.tsx:147`、`app/careers/[slug]/JobDetailClient.tsx:82`、`app/about/[section]/AboutSectionClient.tsx:53`、`app/careers/page.tsx:137`、`app/industries/page.tsx:70`、`app/industries/[slug]/IndustryDetailClient.tsx:164` |
| 修复点 | 统一改走 `t("loading")` 字典（`config/i18n.ts` 补 loading key，六语种全齐） |

### M2. 联系页联系信息标签重复显示

| 项 | 内容 |
|---|---|
| 页面 | `/contact` |
| 语种 | 全语种 |
| 类型 | 程序代码 bug / 数据结构 |
| 问题原文 | zh 下 `电话`×2、`邮箱`×2、`工作时间`×3（渲染为 `电话 \| +86 577-8888-8888 \| 电话`）；en 下 `Phone`×2、`Business Hours`×3 |
| 根因 | `app/contact/page.tsx:116-120` `defaultContactInfo` 的 `label` 与 `sub` 是同一条文案（`{label:t("phone"), value:"+86...", sub:t("phone")}`），渲染时 label 与 sub 各显示一遍；`site_config.contact_info` 数据结构同 |
| 修复点 | `sub` 改放真正的补充说明（如"工作日 9:00-18:00"），或渲染时 label===sub 则去重 |
| 证据 | `_qa_audit_20260909/M2_zh_contact_duplicate_labels.png` |

### M3. ar 语种 contact 电话号码 RTL 乱序

| 项 | 内容 |
|---|---|
| 页面 | `/contact` |
| 语种 | ar |
| 类型 | 程序代码 bug |
| 问题原文 | `+86 577-8888-8888` 渲染为 `+86-8888-8888 577`（数字段重排） |
| 根因 | 电话号码含空格+数字+连字符，RTL bidi 下数字段重排；`app/contact/page.tsx:117` value 未做 bidi isolate |
| 修复点 | 电话号码包裹 `<span dir="ltr">` 或 CSS `unicode-bidi: isolate` |

### M4. ja 产品特性翻译质量错误（VCR 被译成"摄像机"）

| 项 | 内容 |
|---|---|
| 页面 | `/products/diaphragm-valves/dv22a-mr8`（可能波及含 VCR 的其他产品） |
| 语种 | ja |
| 类型 | 内容质量（数据层） |
| 问题原文 | `1/2インチビデオカメラつながる`（VCR 被误译为"ビデオカメラ"=摄像机）、`手动/空気圧任意`（中文"手动"残留，应为"手動"） |
| 根因 | 产品 `featuresJa` 字段翻译质量差，VCR 作为专有名词被机翻 |
| 修复点 | 重译该型号 ja features，VCR/DV/MR 等型号缩写保留原文；全量扫描 31 个产品 featuresJa 是否有同类机翻错误 |
| 证据 | `_qa_audit_20260909/M5_ja_dv22a_features.png` |

### M5. ja/ko/ar 的 /about/profile 底部统计英文残留

| 项 | 内容 |
|---|---|
| 页面 | `/about/profile` |
| 语种 | ja / ko / ar |
| 类型 | 内容缺失（数据层） |
| 问题原文 | `6 series`（ja/ar/ko）；ko 下额外 `Product Series` 标签 |
| 根因 | about 区块 stats 数据的多语言字段未填充 |
| 修复点 | 后台补齐 about/profile 底部统计的 ja/ko/ar 文案 |

### M6. /resources 控制台 403 × 4

| 项 | 内容 |
|---|---|
| 页面 | `/resources` |
| 语种 | en（其他语种未测） |
| 类型 | 待确认（可能是下载门控预期行为） |
| 问题 | `Failed to load resource: the server responded with a status of 403` ×4 |
| 根因 | CDP 未捕获具体 URL，可能是下载门控对资源文件/验证接口的 403（预期行为），也可能是资源文件权限问题 |
| 修复点 | 后台复核资源文件 URL 与下载门控配置；若为文件鉴权 403 属预期则可忽略，否则修正 |

### M7. en 下无效服务 URL 返回中文"服务不存在"

| 项 | 内容 |
|---|---|
| 页面 | `/services/odm`、`/services/after-sales` |
| 语种 | en（zh 下中文属正常；en 下应英文） |
| 类型 | 程序代码 bug + 配置 |
| 问题原文 | `服务不存在`、`返回服务列表` |
| 根因 | ① 这两个 slug 非有效服务（真实 slug 仅 `technical-support/custom-manufacturing/maintenance-service/training-consulting`，`/api/public/services` 实测）；② 404 文案硬编码中文 `app/services/[slug]/ServiceDetailClient.tsx:155-158`，未走 `t()` 字典 |
| 修复点 | ① 若业务需要这两个 URL 可访问，后台新增对应服务或做 slug 别名/301 重定向；② not-found 与 loading 文案字典化 |
| 证据 | `_qa_audit_20260909/H5_en_service_notfound_chinese.png` |

---

## 三、低严重度问题（5 项）

### L1. /favicon.ico 404（每页控制台噪音）

- 页面实际使用 `/icon.png`，但 Chrome 仍自动请求 `/favicon.ico` → 每页控制台一条 404。
- 修复：补一个 `public/favicon.ico` 或在 layout 加 `<link rel="icon" href="/icon.png">`。

### L2. en /about/honors 底部三个认证卡片为空模块

- 仅显示红色书签图标，无文字内容。
- 注意：此前标注"honors 认证卡片残缺已修复"，当前部署版本仍见空模块，建议复核是否为同一问题的残留或新数据缺失。

### L3. /about/culture 页面 Hero 背景图 404

- `/uploads/page-hero/culture.jpg`、`/uploads/page-hero/about-culture.jpg` 均 404。
- 页面有默认背景回退，视觉影响有限，但建议补齐图片或修正引用路径。
- 延伸：`/services/*`、`/news` 等页面的 page-hero 图建议一并核对存在性。

### L4. 部分页面 title 直接用 slug

- `/services/odm` 的 `<title>` 为 `odm`、`/services/after-sales` 为 `after-sales`（这两个本身是无效 slug）。
- 有效服务页的 title 建议后台补全 `seoTitle`，避免显示 slug。

### L5. 文案细节瑕疵

- en `/careers/valve-design-engineer` 信息项 `salary range` 全小写（其余 `Work Location`/`Job Type` 首字母大写）——字典值不统一。
- `components/layout/Header.tsx:394` about 菜单 hover 描述仅 en/zh 两分支，ja/ko/fr/ar 显示中文"成长里程碑"。

---

## 四、问题分类汇总

### 程序代码 bug（需改代码，7 项）

| 编号 | 问题 | 修复文件 |
|---|---|---|
| H3 | 相关服务丢弃多语言字段 | `app/services/[slug]/ServiceDetailClient.tsx:80` |
| H6 | sitemap 域名硬编码错误 | `app/sitemap.ts:5` + 13 个文件 |
| M1 | 加载态中文硬编码 | 6 个 Client 组件 |
| M2 | contact 标签重复 | `app/contact/page.tsx:116-120` |
| M3 | ar 电话 RTL 乱序 | `app/contact/page.tsx:117` |
| M7 | 服务 not-found 中文硬编码 | `app/services/[slug]/ServiceDetailClient.tsx:155-158` |
| L5 | 菜单描述仅 en/zh 分支 | `components/layout/Header.tsx:394` |

### 内容/数据缺失（需后台补数据或翻译，6 项）

| 编号 | 问题 | 影响范围 |
|---|---|---|
| H1 | 首页 Hero 全语种英文 | 首页 5 个语种 |
| H2 | zh 基础字段存英文 | 新闻/行业/关于/资源 4 大模块 |
| H4 | ar features 空数组 | FT4 及可能其他产品 |
| H5 | 产品手册 PDF 缺失 | 全部产品详情页 |
| M4 | ja features 机翻错误 | dv22a 及可能含 VCR 的产品 |
| M5 | about/profile 统计多语种缺失 | ja/ko/ar |

### 配置/资源（3 项）

| 编号 | 问题 |
|---|---|
| M6 | resources 页 403（待确认是否预期） |
| L1 | favicon.ico 缺失 |
| L2/L3 | honors 空卡片 / culture Hero 图缺失 |

---

## 五、已全部通过的页面×语种组合

### en（22 页，除上述问题点外正常）
首页、/products、/services、/industries、/industries/semiconductor、/resources、/resources/manual、/news、/news/valtrix-iso9001-certified、/about、/about/profile、/about/culture、/about/history、/about/honors、/careers、/careers/valve-design-engineer、5 个产品详情（dv22a / vcr-gn-fmr4 / prt1-mr4 / ft4-mr4-s15 / cv3-fmr4-hp）

### zh（本地化正常的页面）
/products 及 5 个产品详情、/services、/services/technical-support、/about/culture、/careers、/careers/valve-design-engineer、/contact

### ja / ko / fr / ar（抽查通过项）
- ja：/products、/contact
- ko：/products、/products/vcr-gn-fmr4、/contact
- fr：/products、/products/prt1-mr4、/about/profile、/contact
- ar：5 个抽查页 `dir="rtl"` 全部正确生效，布局镜像正常

### 死链接检测
66/66 页面 HTTP 200，2913 次链接引用（去重 53 个唯一 URL，全部站内），除产品手册 PDF 外无死链接，33 个唯一图片全部 200。

---

## 六、检测覆盖说明

| 维度 | 覆盖情况 |
|---|---|
| 页面数量 | 66 个（首页 + 19 基础页 + 31 产品详情 + 4 新闻 + 6 行业 + 6 职位） |
| 死链接 | 全量页面 HTML `<a href>` 提取 + HTTP 验证（并发 5，间隔 200ms，外链超时 10s） |
| 图片 | 全量页面 `<img src>` 提取 + HTTP 验证 + curl 复检 |
| 多语言 | en/zh 全量 22 页；ja/ko/fr/ar 各抽查 5 页（首页+/products+1产品+/about/profile+/contact） |
| 控制台 | 逐页采集 console error + network 404/403 |
| RTL | ar 5 页 `document.documentElement.dir` 验证 + 布局观察 |
| 源码定位 | 所有代码 bug 均已 Grep 定位到具体文件和行号 |
| 数据层核验 | 公开 API（/api/public/news、/industries、/services、/resources、/home-config、/products）字段级确认根因 |

---

## 七、已知非 bug / 误报排除

- `/cases`、`/faqs` 无数据显示"暂无内容"——正常空态。
- `/shop`、`/visit-booking` 入口已隐藏——正常（插件后台 false）。
- about 页 "500" 是 `500+ Clients` 数字，非错误页。
- 产品型号（DV22A/VCR/MR8/316L 等）与规格（20.7MPa/Cv 0.65 等）在任何语种下为英文属正常技术术语。
- 爬虫初检 2 张图片 network_error，curl 复检均 HTTP 200，属瞬时网络抖动误报，已剔除。
- 图片内容错配（IT-TB8 图用作四通封面、GJ 图用作 CF 法兰封面）属内容配置问题，非死链接，已在低严重度备注。

---

## 八、优先修复建议

1. **立即（影响 SEO + 核心功能）**：H6 sitemap 域名、H5 PDF 404
2. **高优先（用户可见混排）**：H3 相关服务代码 bug（改一行）、H1/H2 数据层翻译补齐
3. **中优先**：M1 加载态字典化、M2 contact 标签去重、M7 not-found 字典化
4. **低优先**：favicon、page-hero 图片、文案细节
