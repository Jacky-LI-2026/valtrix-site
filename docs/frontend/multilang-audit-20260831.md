# 前台多语种体检报告（2026-08-31）

> 依据用户三项要求：① 详细分析前台各页面多语种显示情况（静态页+动态页）；② 前后台数据要联动；③ 缺翻译的补翻译保存并前台验证。
> 语种：zh/en/ja/ko/fr/ar（fr 在语种管理中禁用，但 schema 字段齐全，不影响）。

## 一、前台页面清单与多语种实现方式

| 页面 | 类型 | 数据源 | 多语种实现 | 状态 |
|------|------|--------|-----------|------|
| `/`（首页） | 静态页 | home-config + 各模块首屏 + i18n 字典 | Hero/Stats 用 `pickLang` 读多语言对象；Products/About/Industries/Services 区用 `loc.get/getArray`；导航/CTA 用 `t()` 字典 | ✅ 数据+静态字典全联动 |
| `/products` | 动态页 | `/api/public/products` | `loc.get`（tab.name/category.name/model.name/description/specs.label/value） | ✅ 代码改造完成；数据部分补译（见缺口①） |
| `/products/[tab]/[id]` | 动态页 | 同上 | `loc.get` 全字段 | ✅ 同上 |
| `/industries` + `/[slug]` | 动态页 | `/api/public/industries` | `loc.get/getArray`（name/tagline/description/challenges/solutions/products/cases） | ✅ 数据全语种已补译并验证 |
| `/news` + `/[slug]` | 动态页 | `/api/public/news` | `loc.get`（title/summary/content） | ✅ 已验证 |
| `/services` + `/[slug]` | 动态页 | `/api/public/services` | `loc.get/getArray`（title/subtitle/description/features/process） | ✅ 数据已补译并验证 |
| `/resources` + `/[type]` | 动态页 | `/api/public/resources` | 分类 title/description、条目标题 `loc.get` | ✅ 条目标题已补译并验证；分类标题受 schema 限制（见缺口③） |
| `/careers` + `/[slug]` | 动态页 | `/api/public/careers` | `loc.get/getText/getArray`（title/department/description(数组)/responsibilities/requirements/benefits） | ✅ 数据已补译并验证 |
| `/about` + `/[section]` | 动态页 | `/api/public/about` | `loc.get/getArray`（content 三形态兼容/highlights/timeline/certifications） | ✅ 数据已补译并验证 |
| `/contact` | 半静态页 | site-config + i18n 字典 | 地址列表 `loc.getArray`、联系信息、表单字段 `t()` 字典 | ✅ 表单/字典联动；地址无 ja 数据（可后补） |
| Header/Footer | 全站组件 | menus + site-config + i18n 字典 | 菜单按 locale 取 `/api/public/menus?locale=xx`；搜索数据 `loc.get`；Footer 地址 `loc.getArray` | ✅ 已验证 |

## 二、已补翻译的数据（脚本写入数据库）

| 模块 | 补译范围 | 语种 | 验证 |
|------|---------|------|------|
| industries（6 个行业） | name/tagline/description/challenges/solutions/products/cases | ja/ko/ar | ✅ 列表页+详情页 ja 实测通过 |
| careers（6 个职位） | title/department/location/type/salary/experience/education/tags/description/responsibilities/requirements/benefits | ja/ko/ar | ✅ 详情页 ja 实测通过 |
| services（4 个） | title/subtitle/description/features/process | ja/ko/ar | ✅ 详情页 ja 实测通过 |
| resources（15 个条目） | title/description | ja/ko/ar | ✅ 列表页 ja 实测通过 |
| about（profile/culture/history/honors） | title/subtitle/content 块 | ja/ko/ar | ✅ 详情页 ja 实测通过 |
| news（已翻译条目） | title/summary/content | ja/ko/ar | ✅ 列表/详情 ja 实测通过 |
| products（已翻译 4 个型号） | name/subtitle/summary/description/specs.label/value | ja/ko/ar | ✅ ZW-15D 详情页 ja 实测通过 |
| 首页配置 | banner/features/stats 对象内嵌字段 + cta/seo 后缀字段 | en/ja/ko/fr/ar | ✅ 首页 ja 实测通过 |

## 三、剩余缺口（按优先级）

1. **products 大部分型号缺 ja/ko/ar**（14/16 型号）：MyMemory 免费接口今日配额耗尽（429，`NEXT AVAILABLE IN 18 HOURS`），中途中断。已翻译的 4 个型号（ZW-15D/ZW-10D/ZW-100B/ZW-Rough-S 等）name/description/specs 日文正常；**所有型号的 features 数组也待补**（脚本已更新支持，见恢复路径）。
2. **ProductTab / ProductCategory 无 ja/ko/ar schema 字段**（只有 nameEn）：产品列表页 tab 名、分类名在 ja/ko/ar 下回退中文。若要支持，需给 `product_tabs`/`product_categories` 增加 nameJa/Ko/Ar 字段并 `prisma db push`。
3. **ResourceCategory 分类标题/描述无 ja/ko/ar 字段**（只有 titleEn/descriptionEn）：资源列表页分类标题在 ja/ko/ar 下回退中文。同上需加字段。
4. **静态区块标题**（如"岗位职责/任职要求/应用场景/行业概述/需要帮助？/服务特性/服务流程"等详情页小节标题）仍为中文：属 i18n 静态字典层，当前 `isEn ? 英文 : 中文` 只覆盖 zh/en 两语。若要全语种，需把这些标题改为 `t()` 字典键并扩充 config/i18n.ts。
5. **about 数据**：`content` 块兼容三形态逻辑已上线，历史空壳数组已修复；contact 地址仅中文（SiteConfig contact_info 无多语言地址数据）。

## 四、已修复的衍生问题

- **jewelry.nameEn/taglineEn、equipment-rd-engineer.titleEn 被污染**为"[翻译结果] xxx"，已重新翻译覆盖为正确英文。
- **about profile/honors 的 contentJa/Ko/Ar 为空壳数组**（heading/paragraphs 全空），已用中文 content 重新翻译生成有效内容。

## 五、恢复路径

- **产品补译**：MyMemory 配额恢复后运行
  `node scripts/translate-products-multilang.js`（已支持跳过已有字段续跑 + features 数组）。
- **tab/分类多语言**：需加 schema 字段（见缺口②③）后，再扩展脚本补译。
- **静态文案全语种**：config/i18n.ts 扩充 t() 字典 + 各详情页小节标题改 t() 引用。

## 六、验证方式

- 前台 locale 切换：`localStorage.setItem('左文科技-locale','ja')` + 刷新（浏览器实测）。
- 数据层：`/api/public/*` 全量透传，无后端改动。
- 类型检查：`npx tsc --noEmit` 仅存量错误，本次改动文件无新增错误。
