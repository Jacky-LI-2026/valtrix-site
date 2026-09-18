# UNILOK 精密工业风模板 — 开发规范

## 模板标识
- slug: `unilok-industrial`
- 已注册到 `lib/templates/presets.ts`（T11）
- 主色: `#0F3460`（深蓝）, 点缀: `#E84C22`（橙红）, 深色: `#1A1A2E`
- 风格: 白底、洁净室质感、sharp 圆角、大字标题+小字 eyebrow、L 形角标装饰

## 切换机制
- 客户端 hook: `lib/templates/active-theme.ts` → `useActiveTemplate()` 返回 `{ template, isUnilok, isDefault }`
- `<html data-template="unilok-industrial">` 由 layout.tsx 自动注入
- `LayoutWrapper` 根据 `isUnilok` 切换 Header/Footer
- 页面级切换：客户端组件内 `useActiveTemplate()` 判断后条件渲染

## 组件目录
所有新模板组件放在 `components/theme-unilok/` 下，**不得修改** `components/layout/` 和 `components/sections/` 下的现有文件。

## 数据 API（全部来自现有公共 API，勿硬编码）
- 导航菜单: `GET /api/public/menus?locale=xx` → `{ success, data: [{name,url,description,children:[...]}] }`
- Logo: `GET /api/public/site-config?key=logo`
- 站点名: `GET /api/public/site-config?key=siteName`
- 产品(含tabs/categories/models/specs): `GET /api/public/products` → useProductTabs() hook
- 新闻: `GET /api/public/news`
- 行业: `GET /api/public/industries`
- 服务: `GET /api/public/services`
- 语种列表: `useI18n()` from `@/lib/i18n`
- 多语言取值: `createLocalizedGetter(locale)` from `@/lib/localized` → `loc.get(obj,'name')` / `loc.getText(obj,'description')`

## 多语言
- 六语种: zh/en/ja/ko/fr/ar
- 所有文本走 `useI18n()` 的 `t(key)` 字典（config/i18n.ts），新增 key 需六语种全齐
- 动态内容（产品名/新闻标题等）用 `loc.get()` / `loc.getText()`
- ar 语种 RTL 已由 I18nProvider 处理（`dir="rtl"`），注意 `rtl-flip` class 用于箭头图标

## UNILOK 设计语言（从 unilok.com 提取）
1. **Hero**: 全宽图片轮播，左侧叠加文字 — 小字 uppercase eyebrow + 大号粗体标题（行高紧凑），底部圆点指示器
2. **Who We Are**: 左侧大标题（带换行），右侧要点列表，白底
3. **Capabilities**: 4 列卡片网格，橙红色线框图标 + 标题 + 描述，卡片间细分割线
4. **Products**: 产品分类网格，白底卡片，hover 时橙红边框/下划线
5. **Industries**: 应用领域，大图+文字叠加或图标网格
6. **News**: 横向卡片列表，日期+标题+摘要，右侧 "MORE" 链接
7. **CTA**: 深蓝底白字，"Product inquiry" 风格，右侧箭头
8. **Footer**: 深灰/深蓝底，多列链接 + 公司信息 + 版权
9. **装饰元素**: L 形角标（左上红→右下橙渐变）、技术图纸线稿叠加、细边框

## 通用样式约定
- 容器: `container mx-auto px-4 max-w-7xl`
- 区块间距: `py-20 lg:py-28`（spacious）
- 标题: `text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight`
- Eyebrow: `text-xs font-semibold uppercase tracking-widest text-primary`
- 卡片: `border border-gray-200 bg-white hover:border-primary transition-colors`
- 按钮主色: `bg-primary text-white hover:bg-primary-dark px-6 py-3`
- 按钮轮廓: `border border-primary text-primary hover:bg-primary hover:text-white`
- 价格: **不展示价格**，若有价格字段直接隐藏或显示 "询价"

## 必须复用的现有能力
- `useI18n()` — 语言切换/字典
- `createLocalizedGetter()` — 多语言字段取值
- `useProductTabs()` — 产品数据（`@/lib/api/useProducts`）
- `locales`, `type Locale` — 语种定义（`@/config/i18n`）
- CSS 变量: `var(--color-primary)` 等已由 tailwind `primary`/`accent`/`dark` 色板映射

## 文件命名
- `components/theme-unilok/Header.tsx`
- `components/theme-unilok/Footer.tsx`
- `components/theme-unilok/Hero.tsx`
- `components/theme-unilok/WhoWeAre.tsx`
- `components/theme-unilok/Capabilities.tsx`
- `components/theme-unilok/ProductShowcase.tsx`
- `components/theme-unilok/Industries.tsx`
- `components/theme-unilok/NewsSection.tsx`
- `components/theme-unilok/CTASection.tsx`
- `components/theme-unilok/PageHero.tsx`（内页顶部横幅）
- `components/theme-unilok/ProductCard.tsx`（产品卡片）

## 验证标准
- `npx tsc --noEmit` 0 错误
- 不修改现有默认模板文件（components/layout/*, components/sections/*, app/*/page.tsx 除了必要的条件渲染入口）
- 六语种切换无中文残留（动态内容用 loc.get，静态文案用 t()）
- 响应式：桌面 lg+ / 平板 md / 移动 <md 均正常
- 默认模板零回归（切换回 t2-industrial 后完全正常）
