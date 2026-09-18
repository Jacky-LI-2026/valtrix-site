import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * 小程序/APP 对接文档生成
 * GET /api/admin/applet/docs —— 返回系统开放接口清单 + 生成指引（Markdown 文本，可直接保存/复制）
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const row = await prisma.siteConfig.findUnique({ where: { configKey: 'applet_config' } })
  const cfg = (row?.configValue && typeof row.configValue === 'object' ? row.configValue : {}) as any
  const site = await prisma.site.findFirst({ where: { isDefault: true } })
  const siteName = site?.name || '企业官网'

  const content = `# ${cfg.appName || siteName} — 小程序/APP 对接文档

> 生成时间：${new Date().toLocaleString('zh-CN')}
> 目标平台：${cfg.platform === 'weapp' ? '微信小程序' : 'H5 App（可打包 Android/iOS）'}
> 建议技术栈：uni-app（Vue 3）+ 本系统开放 API（REST/JSON），一套代码发布微信小程序 / H5 / App。

## 一、通用接入约定
- 接口地址：https://你的域名/api/public/*
- 数据格式：JSON（UTF-8），时间字段为 ISO 8601 字符串
- 多语言：全部内容接口支持 ?locale=zh|en|ja|ko|fr|ar（缺省按站点默认语种）
- 站点隔离：按 Host 自动识别站点；多站点客户在请求头携带 X-Site-Id 可指定站点

## 二、内容接口清单（前台公开，无需登录）

| 模块 | 接口 | 说明 |
|------|------|------|
| 首页 | GET /api/public/home-config | 首页配置（Banner/优势/统计/CTA/SEO） |
| 站点 | GET /api/public/site-config | 站点信息/联系方式/社交 |
| 菜单 | GET /api/public/menus | 导航菜单（含多级） |
| 产品 | GET /api/public/products | 产品列表（tab/分类/型号/规格） |
| 新闻 | GET /api/public/news | 新闻列表/详情 |
| 行业 | GET /api/public/industries | 行业方案 |
| 服务 | GET /api/public/services | 服务内容 |
| 招聘 | GET /api/public/careers | 职位列表/详情 |
| 资源 | GET /api/public/resources | 手册/资料下载（含留资校验） |
| 关于 | GET /api/public/about | 公司简介/文化/荣誉/历程 |
| FAQ | GET /api/public/faqs | 常见问题 |
| 案例 | GET /api/public/cases | 成功案例 |

## 三、互动接口清单（需会员/验证）

| 功能 | 接口 | 说明 |
|------|------|------|
| 会员注册/登录 | POST /api/member/register、/api/member/login | 返回 zw_member_token（存 storage） |
| 询价车 | GET/POST /api/quote/cart* | 加入/查看询价车 |
| 提交询价 | POST /api/quote | 生成报价请求（后台审核后邮件发送报价） |
| 考察预约 | POST /api/visit-booking | 工厂参观预约 |
| 留言 | POST /api/contact | 联系表单 |
| 下载留资 | POST /api/public/download-track | 下载计数/留资 |
| 客户门户 | GET /api/portal/overview、POST /api/portal/tickets | 授权查看/工单（会员） |

## 四、生成步骤（开发者）
1. 使用 HBuilderX 创建 uni-app 项目（Vue 3 + Vite）。
2. 封装 request.js：baseURL 指向本系统域名，自动附加 locale 与 token。
3. 首页 = 首页配置接口渲染轮播/优势；列表页 = 对应模块接口分页。
4. 详情页 = 内容字段渲染（文本/富文本/图片），多语言切 locale 重取。
5. 表单页（询价/预约/留言）复用互动接口，提交后跳转成功页。
6. 微信小程序：配置 AppID（${cfg.appId || '待填'}），上传代码后提交审核。
7. H5/App：manifest.json 配置应用名（${cfg.appName || siteName}）与主题色（${cfg.themeColor || '#CC0000'}），云端打包。

## 五、注意事项
- 富文本内容为 HTML，小程序端需用 rich-text 组件渲染。
- 图片地址为绝对 URL，直接使用；如需防盗链请后台配置。
- 分页统一 page/pageSize 参数，返回 total 字段。
- 所有提交类接口建议开启后台验证码/防刷（插件：验证码）。

---
文档由「小程序/APP 端」插件自动生成。`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('小程序APP对接文档')}.md`,
    },
  })
}
