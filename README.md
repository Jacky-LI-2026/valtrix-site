# 企业官网标准模版

基于 Next.js 14 + TypeScript + Tailwind CSS 的企业官网开发模版，内置中英文双语、产品展示、新闻资讯、招聘系统、搜索功能等完整企业官网功能。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 3.4
- **图标**: lucide-react
- **动画**: framer-motion
- **国际化**: 客户端 Context + localStorage
- **包管理**: pnpm

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 3. 生产构建

```bash
pnpm build
pnpm start
```

## 品牌定制

### 修改品牌色

编辑 `tailwind.config.ts`：

```ts
colors: {
  primary: { DEFAULT: "#8B0000" },  // 主色
  accent: { DEFAULT: "#D4AF37" },   // 点缀色
}
```

### 替换 LOGO

将 LOGO 图片放到 `public/images/logo.png`

### 修改公司信息

编辑以下文件：
- `components/layout/Header.tsx` — 导航、联系方式
- `components/layout/Footer.tsx` — 页脚信息、二维码
- `config/i18n.ts` — 翻译字典中的品牌名

## 项目结构

```
app/              # 页面（App Router）
  page.tsx        # 首页
  products/       # 产品（列表 + [slug] 详情）
  services/       # 服务（ODM/MPCVD/技术支持/售后）
  industries/     # 行业（列表 + [slug] 详情）
  resources/      # 资源（列表 + [type] 分类）
  news/           # 新闻（列表 + [slug] 详情）
  about/          # 关于（总览 + [section] 子页）
  careers/        # 招聘（列表 + [slug] 详情）
  contact/        # 联系我们
components/       # 组件
  layout/         # Header / Footer
  sections/       # 首页各区块
  ui/             # PageHero / ProductGallery
config/
  i18n.ts         # 语言配置 + 翻译字典
lib/              # 数据文件
  products.ts     # 产品数据
  industries.ts   # 行业数据
  news.ts         # 新闻数据
  resources.ts    # 资源数据
  careers.ts      # 职位数据
  about.ts        # 关于子页面数据
  i18n.tsx        # I18nProvider + useI18n
public/images/    # 静态图片
```

## 核心功能

### 中英文双语

- 默认英文（可在 `config/i18n.ts` 修改 `defaultLocale`）
- 客户端切换，无刷新
- localStorage 记忆用户选择
- 所有数据文件均含中英文字段

### 产品图片画廊

- 第1张图支持鼠标拖动 360° 旋转
- 第2-6张静态图片
- 缩略图切换、左右箭头、放大功能

### 搜索功能

- Header 搜索框点击展开
- 实时搜索产品/行业/服务
- ESC 关闭、热门搜索

### SEO 优化

- 自动生成 sitemap.xml
- robots.txt
- 自定义 404 页面
- 静态生成，加载快

## 数据驱动

所有内容都从 `lib/*.ts` 数据文件读取，新增内容只需修改数据：

```ts
// lib/products.ts 示例
export const products = [
  {
    slug: "diaphragm-valves",
    name: "隔膜阀",
    nameEn: "Diaphragm Valves",
    description: "...",
    descriptionEn: "...",
    // ...
  },
];
```

## 开发新页面

1. 在 `app/` 下创建路由目录和 `page.tsx`
2. 文件顶部加 `"use client";`（如需交互）
3. 使用 `PageHero` 组件统一头部样式
4. 用 `useI18n()` 实现双语：
   ```tsx
   const { t, locale } = useI18n();
   const isEn = locale === "en";
   ```

## 备份与回退

关键节点备份在 `_backups/` 目录（已 gitignore）。

回退时从对应版本复制文件回来，执行 `pnpm install` 即可。

## 部署

推荐平台：
- **海外**: Vercel / Netlify / Cloudflare Pages
- **国内**: 阿里云 / 腾讯云（需备案）

详细说明见 `dev-knowledge-handbook.md`。

## 文档

- [开发知识手册](./dev-knowledge-handbook.md) — 完整开发流程、踩坑记录、最佳实践

## License

MIT
