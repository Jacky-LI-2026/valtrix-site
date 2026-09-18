# 插件启停 → 前台入口联动修复（2026-09-07）

## 背景
用户报 bug：后台关闭插件后前台仍显示该功能。
- 关闭「预约管理」→ 前台考察预约入口仍显示
- 关闭「在线商城」「模板展示」→ 导航栏仍显示对应链接
- 用户判定"同类 bug 应该在插件里面都有"

## 根因
前台各入口（导航菜单 / 预约按钮 / 购物车 / 悬浮按钮 / CTA 区块）硬编码渲染，
未消费公开插件状态 API（/api/public/plugins）；且 /api/public/menus 带 1 小时共享缓存，后台改动不即时生效。

## 修复（公共代码，两站 D:企业网站 / D:阀门网站 已同步）
1. **app/api/public/menus/route.ts**：服务端按插件状态过滤菜单
   - 新增 MENU_PLUGIN_MAP（前台菜单 URL 前缀 → 插件 key）：
     /shop→mall、/template-preview→frontend-theme、/visit-booking→visit-booking、
     /member→member、/forms→form-builder、/quote→quote、
     /products|news|resources|industries|services|cases|faqs|careers|about→content-* 各栏目
   - 递归过滤：命中已停用插件 → 整棵子树隐藏（避免子项被当 root 泄漏）
   - frontend-theme 同时受插件开关 + siteConfig.showTemplatePreviewMenu 控制
   - **响应改 no-store**（原 static-long 1h 缓存导致插件启停/菜单改动不即时生效）
2. **components/layout/Header.tsx**：客户端拉 /api/public/plugins
   - 桌面/移动「考察预约」按钮：visit-booking 停用隐藏
   - 购物车图标 CartEntry：mall 停用隐藏
   - menus fetch 加 { cache: "no-store" }
3. **components/layout/Footer.tsx**：「考察预约」链接 visit-booking 停用隐藏 + menus fetch no-store
4. **components/chat/FloatBookingButton.tsx**：右下角悬浮预约按钮 visit-booking 停用隐藏
5. **components/sections/CTA.tsx**：首页 CTA 区块「考察预约」按钮 visit-booking 停用隐藏
6. **components/shop/FloatShopCartButton.tsx**：右下角悬浮购物车 mall 停用隐藏
7. 已确认无需改：AI 客服浮窗（/api/chat enabled 已含 isPluginEnabled("ai-customer-service")）

## 验证（本地双站 E2E）
- 停用 mall/visit-booking/frontend-theme（写 site_config.plugin_state）：
  - 阀门站：/visit-booking 链接 0、/shop 链接 0、购物车图标 0、导航无「在线商城」
  - 企业站：预约 4 处入口全隐藏、shop 链接 0、购物车 0；frontend-theme 未停用时模板展示保留（正确）
- 恢复（删除 plugin_state / 写回默认）：两站入口全部回归显示
- 两站 tsc 0、dev 重启后 health 200
- 注意：企业站原 plugin_state 有 8 个键（默认值），测试时曾覆盖，已按默认值恢复原状
