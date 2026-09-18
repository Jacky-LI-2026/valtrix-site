# VALTRIX 前台列表/落地页六语种切换实测问题清单

**检测日期**：2026-09-09
**检测对象**：https://www.valvetrix.com（默认语种 en）
**检测范围**：P0 九页（`/` `/products` `/news` `/industries` `/services` `/careers` `/resources` `/about` `/contact`）+ P1 两页（`/cases` `/faqs`）× 6 语种（zh/en/ja/ko/fr/ar），共 **66 组合**
**检测方式**：浏览器自动化（BU 平面）逐页实测；`localStorage['VALTRIX-locale']` + reload 切换语种；`get_page_text()` + 正则 `[\u4e00-\u9fff]` 中文残留检测；`document.documentElement.lang/dir` 属性验证；站内链接 HEAD 状态核验；问题截图存 `_qa_audit_20260909/L*.png`
**源码定位**：D:\阀门网站（`lib/localized.ts` / `config/i18n.ts` / `components/layout/Header.tsx` / `app/*/page.tsx`）

---

## 一、结论摘要

- **无 P0 级问题**：11 个页面×6 语种全部可访问、可切换、无崩溃、无空白（undefined/null）、无全站死链。
- **共发现 14 项问题**：P1 页面级 6 项、P2 细节 7 项、P3 翻译质量 1 项。
- **核心问题集中在数据层多语言字段缺失**：
  - 非 zh 语种（ja/ko/fr/ar，部分含 en）下，产品接头名、职位福利、职位卡、about 价值观/时间线、首页行业卡出现**中文残留**——`lib/localized.ts:23-46` 取不到对应语种字段时回退中文基础字段；
  - zh 语种下则相反：**基础字段被英文填充**（/industries 行业卡、/news 新闻标题）——zh 读基础字段拿到的是英文；
  - 首页 Hero 轮播 banners 数据**六语种槽位全部为英文**（API 实测），fr/ja 下整屏英文。
- **ar RTL 正常**：11 页 `dir="rtl"` 全部正确生效，布局镜像、菜单、面包屑正常。
- **死链**：11 页站内链接 HEAD 全 200；分类切换（`/products?tab=valves|fittings`）正常；已知产品详情页 PDF 404 不在本轮列表页范围。

---

## 二、问题清单

> 截图列：`L*` 为本轮新截图（存 `_qa_audit_20260909/`）；`H*`/`M*` 为早前会话截图（同目录）。

### P1 页面级（6 项）

| # | 页面 URL | 语种 | 类型 | 具体位置 | 截图 | 根因推测 | 修复建议 |
|---|---|---|---|---|---|---|---|
| 1 | `/products?tab=fittings`（及 fittings 全部子分类） | en/ja/ko/fr/ar | 中文残留+混排 | 产品卡名称：金属面密封接头 G / O形圈面密封接头 O / 微焊接接头 I / 长焊接接头 B / 双卡套接头 / 螺纹接头；en 下"中文名+英文描述"混排，ja/ko/fr/ar 下"中文名+中文描述" | `L1_en_products_fittings_name_chinese.png`、`L7_ar_products_fittings_chinese_rtl.png` | products 数据中 fittings 6 类产品 `nameEn/nameJa/nameKo/nameFr/nameAr`（含 desc 各语种）缺失/为空 → `lib/localized.ts:23-46` 回退中文 `name`；而 valves 类产品有 `nameEn`（实测 DV3 等显示英文），说明 fittings 数据漏译 | 后台/脚本补齐 fittings 6 类产品 name/description 六语种字段；阀门类可作对照模板 |
| 2 | `/industries` | zh | 中文残留（zh 显示英文） | 6 张行业卡标题+描述为英文：`Semiconductor Manufacturing / Ultra-high-purity fluid control for wafer fabs`…，仅标题/按钮为中文 | `L2_zh_industries_card_title_english.png` | industries 基础字段 `name(zh)/description(zh)` 存的是英文（数据导入基准语种为 en，zh 从未翻译）→ zh 模式 `loc.get` 读基础字段即英文 | 补齐 industries 六条记录 zh 字段 |
| 3 | `/careers` | ja/ko/fr/ar | 中文残留 | "加入 VALTRIX 的理由"下福利项 12 条全中文：成长空间 / 完善的培训体系和晋升通道 / 福利保障 / 五险一金 / 带薪年假 / 节日福利 / 定期体检 / 有竞争力薪酬 / 行业领先的薪资水平 / 绩效奖金和项目奖励 / 团队氛围 / 专业和谐… | `L3_ja_careers_benefits_chinese.png` | jobs 数据 `benefitsJa/Ko/Fr/Ar` 缺失 → 回退 zh | 补 jobs benefits 各语种 |
| 4 | `/careers` | ko/fr/ar | 中文残留 | 职位卡整卡中文：工艺工程师（机加工）/ 制造部 / 温州 / 全职 / 3年以上 / 大专及以上 / 职责描述 / 技能标签（工艺设计、数控编程、工装夹具），仅薪资与按钮为对应语种 | `L9_ko_careers_jobcard_chinese.png` | jobs `name/department/location/type/responsibilities/requirements` 各语种字段缺失 → 回退 zh | 补职位六语种字段；岗位名建议"工艺工程师（机加工）→ Process Engineer (Machining)"式规范译名 |
| 5 | `/about` | ko/fr/ar | 中文残留 | 核心价值观 4 卡（创新驱动/标准引领/客户至上/品质第一）+ 发展历程时间线（公司成立/阀门科技成立/专注阀门制造/认证…/产能扩充/二期生产基地投产/年产能…万台）全中文 | `L4_ko_about_values_timeline_chinese.png` | about_sections(profile) 的 highlights/timeline 多语种字段（`labelJa/Ko/Fr/Ar` 等）缺失 → 回退 zh | 补 about 价值观与时间线各语种 |
| 6 | `/`（首页） | fr/ja/ko/ar | 中文残留（实为英文残留） | Hero 轮播 banner 屏整屏英文：`Ultra-High-Purity Fluid Control / Ultra-High-Purity Fluid Control Expert / VCR Fittings · Diaphragm Valves · Pressure Reducers / VALTRIX designs and manufactures… / Browse Products`，仅第二个按钮为对应语种 | `L5_fr_home_industries_chinese.png`、`L6_ja_home_hero_english_stats.png` | `HomeConfig.banners[]` 六语种槽位全部为英文（API 实测 banner-1：`title/badge/subtitle/description/ctaText` 的 zh/en/ja/ko/fr/ar 全为英文）→ 任意非 en 语种取到的都是英文 | 后台「首页配置→Banner」逐语种补齐文案 |

### P2 细节（7 项）

| # | 页面 URL | 语种 | 类型 | 具体位置 | 截图 | 根因推测 | 修复建议 |
|---|---|---|---|---|---|---|---|
| 7 | `/`（首页） | ja/ko/fr/ar | 混排/不一致 | Hero 统计标签两套并存且均未本地化：第 1 屏中文（产品系列/服务行业/年产量/全球客户），banner 屏英文（Product Series/Industries Served/He Leak Tested/Cleanroom Class） | `L6_ja_home_hero_english_stats.png` | `components/sections/Hero.tsx:124-127` defaultStats 仅 en/zh 两分支，ja/ko/fr/ar 回退中文；banner stats 为英文数据 | defaultStats 改走 `t()` 字典；banner stats 补多语种 |
| 8 | `/news` | zh | 中文残留（zh 显示英文） | 列表标题+摘要全英文：`VALTRIX Passes ISO 9001 Certification / VALTRIX Expands Production with New ISO 4 Cleanroom…`，UI（新闻资讯/阅读全文）为中文 | 文本证据（另见早前 `H2_zh_news_english.png`） | news 基础字段 `title(zh)/summary(zh)` 存英文 | 补 news 各条 zh 字段 |
| 9 | `/news` | fr | 翻译质量 | 标题 `VALTRIX lance des raccords de magnétoscope ultra-h…`（VCR 被误译为"magnétoscope=录像机"） | 文本证据 | 机翻把产品缩写 VCR（面密封接头）当"视频录像机" | 重译 fr 标题，VCR/DV/ALD 等型号缩写保留原文；建议全量扫 products/news fr 字段同类误译 |
| 10 | 全部列表页（/about /news /resources /cases /products 等） | en/ja/ko/fr/ar | 中文残留（瞬态） | 数据加载瞬间闪现"加载中..."（约 0.5-1s，随后被真实内容替换；en 下同样闪现中文） | 文本证据 | 各列表/详情 client 组件硬编码 `加载中...`（`app/*/page.tsx` 多处） | 统一改走 `t("loading")` 字典（config/i18n.ts 补 loading key 六语种） |
| 11 | `/contact` | zh/en | 混排/重复 | 联系信息标签重复：电话×2、邮箱×2、地址×2（如"电话 \| +86 577-8888-8888 \| 电话"）；工作时间×1 | 本轮 count 复核（电话/邮箱/地址各 2 次）+ 早前 `M2_zh_contact_duplicate_labels.png` | `app/contact/page.tsx:116-120` `defaultContactInfo` 的 `label` 与 `sub` 为同一条文案，渲染时各显示一遍 | `sub` 改放补充说明，或渲染时 label===sub 去重 |
| 12 | 全站 Header（所有页面） | ja/ko/fr/ar | 中文残留 | 桌面导航"产品中心/应用领域"子菜单 hover 描述为中文："G 系列，金属面密封 / 微焊接 I 系列 / 手动、气动系列 / 晶圆厂超高纯流体制程…" | 源码证据 | `components/layout/Header.tsx:348-365` 菜单 desc 仅 `locale === "en" ? 英文 : 中文` 两分支 | desc 走 `t()` 字典 |
| 13 | `/`（首页） | fr/ar | 中文残留 | 首页"应用领域"板块 6 张行业卡标题+描述中文（半导体制造/晶圆厂超高纯流体制程/生物医药/可清洗可排空的制药流体系统…），en/ja/ko 正常 | 文本证据 | industries `nameFr/nameAr/descriptionFr/Ar` 缺失 → 回退 zh；首页 `components/sections/Industries.tsx` 用 `loc.get` | 补 industries fr/ar 字段 |

### P3 翻译质量（1 项）

| # | 页面 URL | 语种 | 类型 | 具体位置 | 截图 | 根因推测 | 修复建议 |
|---|---|---|---|---|---|---|---|
| 14 | `/`（首页） | ja | 混排（翻译质量） | Hero badge `国家級ハイテク企業・専精特新中小企業`——"専精特新"为中文政策词直搬，非自然日语 | 文本证据 | `config/i18n.ts` heroBadge 的 ja 值 | 改为自然日语（如"国家級ハイテク企業・専門特化型中小企業"） |

---

## 三、按严重度统计

| 严重度 | 数量 | 编号 |
|---|---|---|
| P0（全站性崩溃/空白/死链） | 0 | — |
| P1（页面级） | 6 | #1-#6 |
| P2（细节） | 7 | #7-#13 |
| P3（翻译质量） | 1 | #14 |
| **合计** | **14** | |

## 四、按页面统计

| 页面 | 问题数 | 编号 |
|---|---|---|
| `/`（首页） | 4 | #6 #7 #13 #14 |
| `/products` | 1 | #1 |
| `/news` | 2 | #8 #9 |
| `/industries` | 1 | #2 |
| `/services` | 0 | ✅ 全语种正常 |
| `/careers` | 2 | #3 #4 |
| `/resources` | 0 | ✅ 全语种正常 |
| `/about` | 1 | #5 |
| `/contact` | 1 | #11 |
| `/cases` | 0 | ✅ 空态正常 |
| `/faqs` | 0 | ✅ 空态正常 |
| 全站性 | 2 | #10 #12 |

## 五、ar RTL 专项结果

- 11 个页面在 ar 下 `document.documentElement.dir="rtl"` 全部正确（js 逐页验证），`lang="ar"`。
- 布局镜像正常：`L7_ar_products_fittings_chinese_rtl.png`（分类 Tab 从右排布、卡片右对齐）、`L8_ar_contact_rtl.png`（面包屑/标题/信息卡 RTL 正常）。
- ar 下中文残留（产品名/职位卡等）与 #1-#5 同源，非 RTL 布局问题。
- 电话号码 bidi（早前报告 M3：`+86-8888-8888 577` 乱序）：本轮 `/contact` ar 截图 OCR 顺序正常，**未复现**，建议保留一次人工复核。
- 长文本撑破布局：fr/ja 长文案页（/about、/contact）未发现溢出。

## 六、死链专项结果

- 11 个页面（en 基准，链接跨语种一致）：页面内全部站内 `<a>` 链接 HEAD 请求 **200，无 404**。
- 分类切换：`/products` 点击 Fittings/Valves Tab → URL 变 `/products?tab=…`，列表正常切换，无 404。
- 已知遗留（非本轮列表页范围）：产品详情页"下载手册"按钮指向 `/downloads/valve-tech-product-manual.pdf` → 404（早前报告 H5）。

## 七、与早前报告（qa-audit-report-20260909.md）对比

| 状态 | 项目 |
|---|---|
| 复现 | H1（首页 Hero 全语种英文，本轮 fr/ja 实锤 + API 证据）；H2（zh 下 /industries、/news 英文，本轮进一步确认）；M2（/contact 电话/邮箱/地址标签重复） |
| 未复现/改善 | M3（ar 电话 bidi 乱序，本轮顺序正常）；H3/H5 属详情页未在本轮范围 |
| 新发现 | #1 /products fittings 产品名全语种中文（早前报告未覆盖 fittings tab）；#3/#4 /careers 福利与职位卡中文（早前报告未测 ja/ko/fr/ar 列表页）；#5 /about ko/fr/ar 价值观+时间线中文；#9 /news fr VCR 误译；#7 首页两套统计标签不一致 |
| 确认正常 | /services、/resources、/cases、/faqs 六语种；/contact ja/ko/fr/ar；/about zh/ja；/industries ja/ko/fr/ar；/news en/ja/ko/ar |

## 八、测试方法说明

- 浏览器自动化（`computer_use_tool` plane=bu），切换方式：`bu.js("localStorage.setItem('VALTRIX-locale','xx')")` + reload（与 Header 语言切换器 `setLocale` 同写路径，UI 点击切换已单独实测通过：Language 下拉 6 语种正常、点"日本語"后全站变 ja）。
- 每页×语种：加载完成后等待 3-6s 取最终态，用 `get_page_text()` 正则检测中文残留、`lang/dir` 验证语种与 RTL、DOM 查空元素/undefined/null、站内链接 HEAD 核验死链。
- 截图：`_qa_audit_20260909/L1-L9.png`（详见问题清单"截图"列），命名 `L{序号}_{语种}_{页面}_{关键词}.png`。

## 九、建议修复优先级

1. **立即**（数据层，影响最大面积）：#1 产品接头名六语种、#6 首页 Hero banners 六语种、#2/#8 zh 基础字段英文（industries/news）。
2. **高**（页面级中文残留）：#3 #4 #5（careers 福利/职位卡、about 价值观/时间线）。
3. **中**：#10 加载态字典化、#11 contact 标签去重、#12 导航 hover 描述字典化。
4. **低**：#9 VCR 误译重译、#13 fr/ar 行业卡、#14 ja badge 润色。
