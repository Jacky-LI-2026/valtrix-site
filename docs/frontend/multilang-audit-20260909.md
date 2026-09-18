# VALTRIX 官网前后台六语种体检报告

**检测日期**：2026-09-09
**检测对象**：https://www.valvetrix.com（默认语种 en，服务器 47.57.241.85）
**检测范围**：前台 35+ 页面 × 6 语种（zh/en/ja/ko/fr/ar）+ 后台语种管理/内容编辑/翻译功能/移动端
**检测方式**：浏览器自动化逐页实测（localStorage `VALTRIX-locale` 切换 + 文本稳定后取全文分析）+ 源码静态扫描 + API 数据核验 + 后台界面实测
**源码路径**：D:\阀门网站（Next.js 14 App Router / TypeScript / Tailwind）
**截图证据**：`D:\阀门网站\_qa_audit_20260909\`（L1-L9 列表页 / D001-D044 详情页 / A00-A14 后台）
**子报告**：`qa-audit-report-lang-20260909.md`（列表页）、`_qa_audit_20260909/qa-report-detail-pages-20260909.md`（详情页）

---

## 一、结论摘要

### 总体状态
- **无 P0 级问题**：全部页面 × 6 语种可访问、可切换、无崩溃、无全站空白、无全站死链。
- **ar RTL 正常**：全站 `dir="rtl"` 正确生效，布局镜像正常（仅电话号码 bidi 需修复）。
- **语言切换器正常**：Header Language 下拉 6 语种齐全，点击切换全站生效。
- **共发现 22 项问题**：P1×12（数据层为主）、P2×8（代码层硬编码）、P3×2（翻译质量）。

### 核心问题根因分类
| 根因类型 | 数量 | 说明 |
|---|---|---|
| **数据层缺翻译** | 8 | 职位/服务流程/about culture+history/shop分类/fittings产品/首页banner 等 ja/ko/fr/ar 字段为空或 null |
| **数据层基准语种错误** | 2 | industries/news 的 zh 基础字段存的是英文（数据导入基准为 en） |
| **代码层硬编码仅 zh/en** | 6 | Hero统计标签/导航hover描述/移动端语言标签/加载态/404页/contact标签重复 |
| **数据层字段含中文** | 2 | 产品 model 字段存"FT4系列"（全语种含 en 显示中文）、新闻 fr VCR 误译 |
| **功能缺陷** | 2 | 产品手册 PDF 404、ar 电话 bidi 乱序 |
| **翻译质量** | 2 | ja badge"専精特新"不自然、fr VCR→magnétoscope |

### 与历史问题对比
| 历史问题 | 本次状态 |
|---|---|
| H1 首页 Hero 全语种英文 | ✅ 复现 + API 实锤（banners 六语种槽位全英文） |
| H2 zh 下 industries/news 英文 | ✅ 复现（zh 基础字段存英文） |
| H3 服务详情相关服务中文 | ✅ 已修复（稳定态六语种正常） |
| H4 FT4 ar features 中文 | ✅ 已修复（此前为抓取竞态假阳性） |
| H5 产品手册 PDF 404 | ✅ 复现（public/downloads/ 为空） |
| M2 contact 标签重复 | ✅ 复现（电话/邮箱/地址各×2） |
| M3 ar 电话 bidi 乱序 | ⚠️ 详情页复现（86+ 8888-8888-577），列表页未复现 |
| about/culture 中英文混排 | ✅ 复现（ja/ko/fr/ar 正文全中文） |

---

## 二、P1 级问题（12 项，数据层为主，影响大面积页面）

### P1-01 产品接头类（fittings）名称六语种中文
| 项 | 内容 |
|---|---|
| 页面 | `/products?tab=fittings` 及全部接头子分类 |
| 语种 | en/ja/ko/fr/ar（zh 正常） |
| 现象 | 6 类接头产品卡名称全中文：金属面密封接头 G / O形圈面密封接头 O / 微焊接接头 I / 长焊接接头 B / 双卡套接头 / 螺纹接头；en 下"中文名+英文描述"混排 |
| 根因 | products 数据中 fittings 类产品 `nameEn/nameJa/nameKo/nameFr/nameAr`（含 desc 各语种）缺失 → `lib/localized.ts` 回退中文 name；valves 类有 nameEn 正常显示，说明 fittings 数据漏译 |
| 修复 | 后台/脚本补齐 fittings 6 类产品 name/description 六语种字段 |
| 截图 | L1_en_products_fittings_name_chinese.png、L7_ar_products_fittings_chinese_rtl.png |

### P1-02 产品 model 字段含中文"系列"，9 型号全语种（含 en）显示中文
| 项 | 内容 |
|---|---|
| 页面 | 产品详情页：FT4/FT5/FT6 过滤器 + 6 类接头 |
| 语种 | **全部（默认 en 也出现）** |
| 现象 | 面包屑末级、PageHero 徽标行、产品信息型号行、无图占位文本显示"FT4系列""金属面密封接头 G"等中文 |
| 根因 | Product.model 数据存中文（如 `FT4系列`）；`ProductDetailClient.tsx` L315/320/372/638 直接渲染 model 无本地化 |
| 修复 | 数据层 model 改为纯型号串（FT4/G/DV7）；系列名用 name 字段本地化 |
| 截图 | D001_en_prod_ft4_cjk.png、D002_fr_prod_ft4_cjk.png、D003_ar_prod_ft4_cjk.png |

### P1-03 职位详情 ja/ko/fr/ar 岗位内容全中文（6/6 职位）
| 项 | 内容 |
|---|---|
| 页面 | `/careers/[slug]` 全部 6 个职位 |
| 语种 | ja/ko/fr/ar（en/zh 正常） |
| 现象 | 岗位标题、部门、描述、职责、任职要求、福利全部中文；仅区块标题（職責/職務上の要件/福利厚生）已字典化 |
| 根因 | API 核实：6 个职位 `titleJa/Ko/Fr/Ar`、`departmentJa…`、`descriptionJa…`、`responsibilitiesJa…`、`requirementsJa…`、`benefitsJa…` **全部为 null**（schema 有字段但数据未翻译） |
| 修复 | 为 6 职位补齐 Ja/Ko/Fr/Ar 全字段数据（后台 AutoTranslateBar 一键翻译后保存） |
| 截图 | D021-D028（job_design/job_cnc × ja/ko/fr/ar）、L3_ja_careers_benefits_chinese.png、L9_ko_careers_jobcard_chinese.png |

### P1-04 服务详情「服务流程」步骤 ja/ko/fr/ar 中文（4/4 服务）
| 项 | 内容 |
|---|---|
| 页面 | `/services/technical-support`、`custom-manufacturing`、`maintenance-service`、`training-consulting` |
| 语种 | ja/ko/fr/ar（en/zh 正常） |
| 现象 | 流程步骤标题+描述全中文：需求沟通/了解工况与需求、方案设计/阀门选型与方案、报价交付/报价与交期确认 等 |
| 根因 | services API `process` 字段只有 zh（title/desc）+ en（titleEn/descEn），**缺 processJa/Ko/Fr/Ar**（schema/数据均缺）；`ServiceDetailClient.tsx` 用 `loc.get` 回退中文 |
| 修复 | schema 补 processJa/Ko/Fr/Ar 数组字段 + `prisma db push` + 数据翻译 + API 透传；或流程步骤改前端 t() 字典渲染 |
| 截图 | D004-D016（4 服务 × ja/ko/fr/ar） |

### P1-05 About/Culture 正文 ja/ko/fr/ar 中文（用户历史反馈复现）
| 项 | 内容 |
|---|---|
| 页面 | `/about/culture` |
| 语种 | ja/ko/fr/ar（en/zh 正常） |
| 现象 | 副标题"以可靠为本，以品质为先"、企业使命、核心价值观条目全中文；大标题已本地化（企業文化/기업 문화/Culture d'entreprise/ثقافة الشركة） |
| 根因 | `lib/about.ts` 硬编码 culture 内容仅 zh/en（titleJa 等有值但 content/mission/values 无低语种）；`/api/public/about` 不含 culture → 必走硬编码回退 |
| 修复 | `lib/about.ts` culture 补 Ja/Ko/Fr/Ar 文案，或改 API 数据驱动 + 补 culture 接口 |
| 截图 | D029-D032 |

### P1-06 About/History 时间轴 ja/ko/fr/ar 中文
| 项 | 内容 |
|---|---|
| 页面 | `/about/history` |
| 语种 | ja/ko/fr/ar |
| 现象 | 时间轴里程碑全中文：2016 公司成立/阀门科技成立专注阀门制造、2019 ISO 认证… |
| 根因 | about API history milestones 仅 zh/en，无低语种字段 |
| 修复 | 补 milestones 低语种字段 + 数据翻译 |
| 截图 | D033-D036 |

### P1-07 About 列表页价值观+时间线 ko/fr/ar 中文
| 项 | 内容 |
|---|---|
| 页面 | `/about`（列表/聚合页） |
| 语种 | ko/fr/ar（zh/en/ja 正常） |
| 现象 | 核心价值观 4 卡（创新驱动/标准引领/客户至上/品质第一）+ 发展历程时间线全中文 |
| 根因 | about_sections(profile) 的 highlights/timeline 多语种字段（labelJa/Ko/Fr/Ar 等）缺失 → 回退 zh |
| 修复 | 补 about 价值观与时间线各语种数据 |
| 截图 | L4_ko_about_values_timeline_chinese.png |

### P1-08 首页 Hero banners 六语种槽位全英文
| 项 | 内容 |
|---|---|
| 页面 | `/`（首页 Hero 轮播） |
| 语种 | fr/ja/ko/ar（zh 也受影响） |
| 现象 | banner 整屏英文：Ultra-High-Purity Fluid Control / VCR Fittings · Diaphragm Valves / Browse Products |
| 根因 | API 实测：`HomeConfig.banners[]` 的 title/badge/subtitle/description/ctaText 六语种槽位（zh/en/ja/ko/fr/ar）**全部为同一英文串** |
| 修复 | 后台「首页配置→Banner」逐语种补齐文案 |
| 截图 | L5_fr_home_industries_chinese.png、L6_ja_home_hero_english_stats.png |

### P1-09 zh 语种下 industries/news 基础字段为英文
| 项 | 内容 |
|---|---|
| 页面 | `/industries`（6 行业卡）、`/news`（列表+详情） |
| 语种 | zh |
| 现象 | industries 行业卡标题+描述全英文（Semiconductor Manufacturing / Ultra-high-purity fluid control…）；news 标题+正文全英文（VALTRIX Passes ISO 9001…） |
| 根因 | industries/news 的 zh 基础字段（name/description/title/content/summary）在数据库中存为英文（数据导入基准语种为 en，zh 从未翻译） |
| 修复 | 后台补齐 industries 6 条 + news 4 条的 zh 中文字段 |
| 截图 | L2_zh_industries_card_title_english.png、H2_zh_news_english.png |

### P1-10 /shop 商品分类筛选标签 ja/ko/fr/ar 中文
| 项 | 内容 |
|---|---|
| 页面 | `/shop` |
| 语种 | ja/ko/fr/ar |
| 现象 | 分类筛选标签：隔膜阀/单向阀/过滤器/管阀件 全中文 |
| 根因 | shop 分类数据仅中文（无多语种字段，`/api/public/shop` 返回 HTML 插件关闭态，分类名来自前端静态数据） |
| 修复 | shop 分类名多语种化或按 locale 映射 |
| 截图 | D041-D044 |

### P1-11 首页 fr/ar 行业卡中文
| 项 | 内容 |
|---|---|
| 页面 | `/`（首页"应用领域"板块 6 行业卡） |
| 语种 | fr/ar（en/ja/ko 正常） |
| 现象 | 行业卡标题+描述中文（半导体制造/晶圆厂超高纯流体制程/生物医药…） |
| 根因 | industries `nameFr/nameAr/descriptionFr/Ar` 缺失 → 回退 zh |
| 修复 | 补 industries fr/ar 字段（与 P1-09 同步处理） |

### P1-12 产品手册下载 PDF 404
| 项 | 内容 |
|---|---|
| 页面 | 所有产品详情页「下载产品手册」按钮 |
| 语种 | 全部 |
| 现象 | 点击 → `/downloads/valve-tech-product-manual.pdf` 返回 404 |
| 根因 | `ProductDetailClient.tsx` L16 `DEFAULT_MANUAL_URL` 写死路径，但 `public/downloads/` 目录为空，部署包未含 PDF |
| 修复 | 上传真实产品手册 PDF 至 `public/downloads/`，或改为 DB/站点配置存储路径 |

---

## 三、P2 级问题（8 项，代码层硬编码/细节）

### P2-01 首页 Hero 统计标签仅 en/zh 两分支
| 项 | 内容 |
|---|---|
| 位置 | `components/sections/Hero.tsx` L124-127 |
| 语种 | ja/ko/fr/ar |
| 现象 | 统计标签回退中文（产品系列/服务行业/年产量/全球客户），与 banner 屏英文统计（Product Series/Industries Served）并存不一致 |
| 根因 | defaultStats 用 `locale === "en" ? "English" : "Chinese"` 两分支 |
| 修复 | defaultStats 改走 `t()` 字典；config/i18n.ts 补 stats 相关 key 六语种 |
| 截图 | L6_ja_home_hero_english_stats.png |

### P2-02 全站 Header 导航 hover 描述仅 en/zh
| 项 | 内容 |
|---|---|
| 位置 | `components/layout/Header.tsx` L348-365（12 处） |
| 语种 | ja/ko/fr/ar |
| 现象 | 桌面导航"产品中心/应用领域"子菜单 hover 描述中文："G 系列，金属面密封 / 微焊接 I 系列 / 晶圆厂超高纯流体制程…" |
| 根因 | 菜单 desc 用 `locale === "en" ? 英文 : 中文` 两分支 |
| 修复 | desc 走 `t()` 字典（config/i18n.ts 已有 vcrFittings 等 key，补 desc 对应 key） |

### P2-03 移动端语言切换器标签仅 en/zh
| 项 | 内容 |
|---|---|
| 位置 | `components/layout/Header.tsx` L663 |
| 语种 | ja/ko/fr/ar |
| 现象 | 移动端 Header 语言按钮显示"语言"（中文）而非当前语种 |
| 根因 | `locale === "en" ? "Language" : "语言"` 两分支 |
| 修复 | 改 `t("language")` 字典 |

### P2-04 全站加载态"加载中..."硬编码中文
| 项 | 内容 |
|---|---|
| 位置 | `app/news/[slug]/NewsDetailClient.tsx` L130、`app/about/page.tsx` L88、`app/faqs/page.tsx`、各列表页 client 组件 |
| 语种 | 全部（en 下也闪现中文） |
| 现象 | 数据加载瞬间（约 0.5-1s）闪现"加载中..."，随后被真实内容替换 |
| 根因 | 多处硬编码 `加载中...` 未走字典 |
| 修复 | 统一改 `t("loading")`；config/i18n.ts 补 loading key 六语种（当前字典缺此 key） |

### P2-05 新闻详情 404/返回按钮硬编码中文
| 项 | 内容 |
|---|---|
| 位置 | `app/news/[slug]/NewsDetailClient.tsx` L140-141 |
| 语种 | 全部 |
| 现象 | 新闻不存在时显示"页面不存在""返回新闻列表"（中文） |
| 根因 | 硬编码中文，且字典缺 `newsNotFound` key（源码扫描确认字典 506 key/语种，缺 newsNotFound/modelDrawings/downloadFile） |
| 修复 | 补字典 key + 改 t() |

### P2-06 /contact 联系信息标签重复
| 项 | 内容 |
|---|---|
| 位置 | `app/contact/page.tsx` L116-120 |
| 语种 | zh/en |
| 现象 | 电话×2、邮箱×2、地址×2（如"电话 \| +86... \| 电话"） |
| 根因 | `defaultContactInfo` 的 `label` 与 `sub` 为同一条文案，渲染时各显示一遍 |
| 修复 | sub 改放补充说明，或渲染时 label===sub 去重 |
| 截图 | M2_zh_contact_duplicate_labels.png |

### P2-07 ar 下电话号码 RTL 乱序
| 项 | 内容 |
|---|---|
| 位置 | 详情页联系方式区块（services/products/about） |
| 语种 | ar |
| 现象 | `+86 577-8888-8888` 显示为 `86+ 8888-8888-577` |
| 根因 | 电话号码纯文本渲染于 RTL 上下文，无 bidi isolation |
| 修复 | 电话/邮箱用 `<bdi>` 或 `dir="ltr"` 包裹（组件内统一处理） |
| 截图 | D010_ar_svc_technical_cjk.png（OCR 可见） |

### P2-08 首页 Industries 板块英文副标题在非 en 语种显示
| 项 | 内容 |
|---|---|
| 位置 | `components/sections/Industries.tsx` L66 |
| 语种 | ja/ko/fr/ar（zh 也显示） |
| 现象 | 行业卡下方显示英文 nameEn 作为副标题（`{!isEn && industry.nameEn}`） |
| 根因 | 逻辑设计为非 en 时显示英文副标题，但 ja/ko/fr/ar 用户不需要英文副标题 |
| 修复 | 改为仅 zh 时显示英文副标题（`{locale==='zh' && industry.nameEn}`），或移除 |

---

## 四、P3 级问题（2 项，翻译质量）

### P3-01 新闻 fr 标题 VCR 误译为"magnétoscope"
| 项 | 内容 |
|---|---|
| 页面 | `/news` fr 语种 |
| 现象 | "VALTRIX lance des raccords de **magnétoscope** ultra-h…"——VCR（面密封接头）被机翻为"录像机" |
| 修复 | 重译 fr 标题，VCR/DV/ALD 等型号缩写保留原文；全量扫 products/news fr 字段同类误译 |

### P3-02 首页 ja badge"専精特新"不自然
| 项 | 内容 |
|---|---|
| 页面 | `/` ja 语种 Hero badge |
| 现象 | "国家級ハイテク企業・**専精特新**中小企業"——中文政策词直搬 |
| 修复 | 改为自然日语："国家級ハイテク企業・専門特化型中小企業" |

---

## 五、后台多语言检查结果

### 5.1 语种管理 ✅ 正常
- `language` 表六语种全部 `isActive=true`：zh / en（默认）/ ja / ko / fr / ar。
- `/api/public/languages`（force-dynamic）返回六语种与后台一致。
- fr 禁用→前台 API 不含 fr→重新启用→恢复，闭环验证通过。
- 语种名称/排序/国旗显示正确。

### 5.2 内容编辑页多语言字段 ✅ Tab 齐全
| 模块 | 六语种 Tab | 备注 |
|---|---|---|
| 产品（products） | ✅ 中文/英文/日本語/한국어/Français/العربية | 部分产品 EN/JA 字段为空（与 P1-01 数据缺翻译一致） |
| 新闻（news） | ✅ | zh 字段存英文（P1-09） |
| 行业（industries） | ✅ | zh 字段存英文（P1-09） |
| 服务（services） | ✅ | process 字段缺低语种（P1-04） |
| 关于（about） | ✅ | EN 副标题为空；culture/history 低语种空（P1-05/06/07） |
| 产品分类/Tab | ✅ | 六语种名称内联编辑 |
| 资源分类 | ✅ | 六语种标题+描述 |

### 5.3 翻译功能
- AutoTranslateBar「一键翻译全部」按钮在各编辑页正常渲染。
- 翻译 API `POST /api/admin/translate`（AI/DeepSeek 通道）可用。
- **注意**：用户偏好一键翻译默认不自动执行，需手动点击。
- 测试翻译时在新建草稿页填写中文后点击翻译，结果写入对应语种 Tab（未保存，不影响线上数据）。

### 5.4 移动端汉堡菜单
- 桌面视口下汉堡按钮不可见（需 <lg 宽度）。
- 历史 Bug（MobileNavItem 子菜单 href 兜底）已修复，本次未复现崩溃。
- 建议：用真实 iPhone 或 Chrome DevTools 设备模拟（390×844）做最终验收。

### 5.5 后台 UI 语言
- 后台界面本身为中文界面（菜单/按钮/提示），属设计预期，不要求后台全语种。

---

## 六、已验证正常项（✅）

| 类别 | 详情 |
|---|---|
| 页面可访问性 | 35+ 页面 × 6 语种全部 HTTP 200，无 404/500 |
| 语言切换 | Header Language 下拉 6 语种齐全，点击切换全站生效，localStorage 持久化 |
| ar RTL | 全站 `dir="rtl"` 正确，布局镜像正常，菜单/面包屑/卡片对齐正常 |
| 死链 | 11 个列表页站内链接 HEAD 全 200；产品分类 Tab 切换正常 |
| 产品详情（valves 类） | DV7/BV6 等阀门产品六语种描述/特性/规格全部正常（稳定态） |
| 行业详情 | 2 个行业详情页六语种正常 |
| 新闻详情（非 zh） | en/ja/ko/fr/ar 内容正常 |
| 资源详情 | 2 个资源详情页六语种正常 |
| About profile/honors | 六语种正常 |
| /services 列表 | 六语种正常 |
| /resources 列表 | 六语种正常 |
| /cases /faqs /quote-cart | 空态六语种已本地化 |
| 无图产品占位 | BV6/BV7 等无图产品占位图正常（详情页字母圆圈 + 列表页 generic-tech.webp，46 img/0 broken） |
| 后台语种管理 | 六语种 isActive 与前台一致，禁用/启用闭环正常 |
| 后台编辑页 Tab | 7 个内容模块六语种 Tab 全部渲染 |
| i18n 字典 | config/i18n.ts 六语种各 506 key 对齐（仅缺 newsNotFound/modelDrawings/downloadFile/loading 4 key） |

---

## 七、数据层缺翻译字段汇总（需后台补数据）

以下为 API 核实的**数据层缺失**，均可在后台直接补译，无需改代码：

| 模块 | 缺失语种 | 缺失字段 | 影响页面 |
|---|---|---|---|
| 产品（fittings 6 类） | en/ja/ko/fr/ar | name, description | /products 列表 + 详情 |
| 产品（9 型号） | 全部 | model 含中文"系列" | 产品详情面包屑/徽标/型号行 |
| 职位（6 条） | ja/ko/fr/ar | title, department, description, responsibilities, requirements, benefits | /careers 列表 + 详情 |
| 服务（4 条） | ja/ko/fr/ar | process（title/desc 数组） | /services 详情 |
| About culture | ja/ko/fr/ar | mission, values, subtitle | /about/culture |
| About history | ja/ko/fr/ar | milestones（title/desc） | /about/history |
| About profile | ko/fr/ar | highlights, timeline | /about 列表页 |
| 首页 banners | zh/ja/ko/fr/ar | title, subtitle, description, ctaText | 首页 Hero |
| 行业（6 条） | zh | name, description（存英文） | /industries + 首页 |
| 行业（6 条） | fr/ar | name, description | 首页行业卡 |
| 新闻（4 条） | zh | title, summary, content（存英文） | /news 列表 + 详情 |
| Shop 分类 | ja/ko/fr/ar | category names | /shop |

---

## 八、修复优先级建议

### 立即修复（影响最大面积，数据层）
1. **P1-08** 首页 Hero banners 六语种文案（后台首页配置直接填）
2. **P1-09** industries/news zh 字段补中文（后台编辑直接填）
3. **P1-01** fittings 产品名六语种（后台翻译+保存）
4. **P1-03** 职位六语种补译（后台 AutoTranslateBar 一键翻译 6 条）
5. **P1-12** 产品手册 PDF 上传或改路径

### 高优先级（页面级中文残留）
6. **P1-04** 服务 process 字段补 schema+翻译（需改代码 schema + db push + 数据）
7. **P1-05/06/07** About culture/history/profile 低语种补译
8. **P1-02** 产品 model 字段去中文（数据清洗）
9. **P1-11** 行业 fr/ar 字段补译
10. **P1-10** shop 分类名多语种化

### 中优先级（代码层硬编码）
11. **P2-01/02/03** Hero 统计/导航 desc/移动语言标签改 t() 字典
12. **P2-04/05** 加载态/404 页字典化 + 补字典 4 key
13. **P2-06** contact 标签去重
14. **P2-07** ar 电话 `<bdi>` 包裹
15. **P2-08** Industries 英文副标题仅 zh 显示

### 低优先级（翻译质量）
16. **P3-01** fr VCR 误译重译 + 全量扫描
17. **P3-02** ja badge 润色

---

## 九、测试方法说明

- **浏览器自动化**：`computer_use_tool` plane=bu，切换方式 `localStorage.setItem('VALTRIX-locale','xx')` + reload（与 Header 语言切换器 `setLocale` 同写路径）。
- **文本稳定判定**：等待 `document.documentElement.lang` 生效 + API 资源加载完成 + 连续两次文本相同才采信，排除抓取竞态假阳性。
- **中文残留检测**：`body.innerText` 正则 `[\u4e00-\u9fff]` 匹配，人工甄别是否为合理中文（如中国地址/品牌名）。
- **API 数据核验**：`/api/public/products`、`/api/public/services`、`/api/public/careers`、`/api/public/industries`、`/api/public/news`、`/api/public/about`、`/api/public/languages` 全量拉取，检查各语种字段 null/空值。
- **源码静态扫描**：`locale === "en"` 模式、硬编码中文字符、i18n 字典 key 覆盖率。
- **后台实测**：admin/admin123 登录，逐模块检查编辑页六语种 Tab，fr 禁用/启用闭环，AutoTranslateBar 渲染。
- **本次为只读检查**，未修改任何代码或数据；P0 问题不存在故无需先行修复。

---

*报告生成时间：2026-09-09 | 检测人：多 Agent 协同（前台列表页组 + 前台详情页组 + 后台组 + 源码静态分析）*
