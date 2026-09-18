# 行业包（Industry Pack）规范 v1.0

> 更新日期：2026-09-08　|　配套：《通用基地 + 行业包 + 能力插件》架构设计文档

行业包 = 一份可安装的资产清单 + 种子数据 + 设计令牌 + 依赖声明。**不包含程序逻辑**（逻辑在基地层与插件层），只包含数据与配置。

## 1. 目录约定

```
industry-packs/
└── <pack-slug>/
    ├── pack.json            # manifest（唯一必需）
    ├── seed/                # 种子数据（JSON，按 model 分文件）
    ├── assets/              # 静态资产（产品图/文档/PDF/STEP）
    ├── content-types/       # 可选：行业自定义内容类型定义
    └── README.md            # 包说明
```

## 2. pack.json 字段

| 字段 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `key` | ✅ | string | 包唯一标识，目录名一致（小写字母+数字+连字符） |
| `name` / `nameEn` | ✅ | string | 包名（中/英） |
| `version` | ✅ | string | 语义化版本 1.0.0 |
| `category` | ✅ | string | 行业分类（semiconductor / diamond / ...） |
| `description` | ✅ | string | 包内容说明 |
| `requiresPlugins` | ✅ | string[] | 必装插件 key（安装时校验，缺则提示可自动启用） |
| `optionalPlugins` | 否 | string[] | 推荐可选插件 |
| `languages` | ✅ | {default, enabled[]} | 语种预设（默认语种 + 启用集合） |
| `designTokens` | ✅ | object | 设计令牌：primary/accent/fontFamily/logo/favicon |
| `seedData` | ✅ | {model, file}[] | 种子数据清单（model=Prisma 模型名，file=seed/ 下相对路径） |
| `assets` | 否 | string[] | 静态资产目录清单（相对包根） |
| `uiPreset` | 否 | string | 后台界面语言预设等 |

## 3. seedData 模型约定

| model | 说明 | 关键字段 |
|---|---|---|
| productTab / productCategory | 产品 Tab / 分类 | name/nameEn.../slug/sortOrder |
| product | 产品主数据 | name/model/tabId/categoryId/多语言字段 |
| productSpec | 产品规格 | productId/label/value/多语言 |
| shopProduct | 商城商品 | productId/price/stock/specCombos/多语言 |
| industry | 行业方案 | slug/title/challenges/solutions/... |
| news / resourceItem | 新闻 / 资源 | title/description/content/多语言 |
| aboutSection | 关于我们 | section/content/多语言 |
| job / service / case / faq | 职位 / 服务 / 案例 / FAQ | 多语言字段 |
| menu | 导航 | name/url/parentId/sortOrder/isActive/多语言 |
| homeConfig | 首页配置 | banners/features/stats/cta/seo 多语言 |
| seoConfig | SEO 配置 | siteName/defaultTitle/defaultDesc/keywords |
| language | 语种预设 | code/name/isDefault/isActive |
| themeConfig | 主题 | primary/primaryLight/accent/fontFamily |

> 所有可多语言内容：中文=基础字段名，其他语种=基础名+语言首字母大写（nameEn/Ja/Ko/Fr/Ar）。
> 数组字段（jsonArray/stringArray）：seed JSON 中为数组，入库前按字段类型写入 Json。

## 4. 安装 / 卸载 / 升级

```
install  <pack-dir> --site <id>   # 校验依赖→事务导入 seed→拷贝 assets→写设计令牌→语种预设→记录
uninstall <packKey> --site <id>   # 反向删除该站点归属数据（资产与日志保留）
upgrade  <pack-dir> --site <id>   # 版本 diff 增量应用
validate <pack-dir>               # 结构/依赖/JSON 合法性校验
export   --db <DATABASE_URL> --out <dir>  # 从现有站导出内容为 seed（反向资产化）
```

## 5. 站点数据隔离

- 内容表带 `siteId`（null=全局共享，行业包安装时写入站点归属；默认站点兼容存量）
- 站点级配置存 `site_config_override`；安装记录存 `industry_pack_records`
- 安装到"默认站"时 siteId=默认站 id；多站并行按 Site 表隔离

## 6. 变更记录

- 2026-09-08 v1.0 初稿（与架构设计文档同步发布）
