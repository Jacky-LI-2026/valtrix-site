# VALTRIX 插件市场功能说明

> 更新时间：2026-09-10
> 适用版本：VALTRIX 后台管理系统 v1.0+
> 入口：系统运维 → 插件市场（/admin/plugins）

## 一、功能概述

插件市场是 VALTRIX 后台的能力扩展中心，支持：

1. **市场目录浏览**：内置 44 个插件 + 远程市场目录（可配置），用户可浏览、搜索、按分类筛选
2. **可选安装/启停**：用户可自主安装远程插件、启用/停用已安装插件
3. **付费插件开通**：部分插件需付费开通，未开通时启停锁定，通过兑换码激活
4. **统一管理**：已安装插件的启停、配置、编辑、管理入口集中在「已安装管理」视图

## 二、界面结构

插件市场页面（/admin/plugins）采用双视图 Tab：

### 2.1 插件市场（默认视图）

- **顶部统计**：共 N 条 · 已安装 X · 已开通付费 Y · 付费条目 Z
- **来源标识**：内置目录 / 远程目录（配置了 plugin_market_url 时）
- **搜索框**：按名称/描述/功能点搜索
- **分类筛选**：全部分类 / AI 能力 / 营销与商机 / SEO 与数据 / 内容管理 / 系统运维
- **插件卡片**：
  - 名称 + 版本 + 分类 + 来源标签（内置/远程）
  - 状态徽章（未安装/已安装/已开通）
  - 价格标签（免费 / ¥XXX 付费）
  - 描述 + 功能点列表
  - 操作按钮：安装 / 已安装✓ / 付费开通 / 已开通✓
  - 远程条目标注「功能代码待部署」

### 2.2 已安装管理

- **统计**：共 N 个已安装能力：启用 X / 停用 Y
- **状态筛选**：全部 / 已启用 / 已停用 / 规划中
- **按分类分组**：AI 能力 / 营销与商机 / SEO 与数据 / 内容管理 / 系统运维
- **插件卡片**：
  - 启停开关（绿色=已启用，灰色=已停用，琥珀色=付费未开通锁定）
  - 编辑 / 配置按钮
  - 管理入口链接（一个或多个）
  - 功能点列表 + 启用影响说明
  - 远程插件显示「卸载」按钮（内置插件不可卸载）

### 2.3 顶部操作按钮

- **远程目录配置**：配置远程市场 JSON URL
- **生成兑换码**：管理员为付费插件生成兑换码（仅 admin 角色可用）
- **API 网关管理**：跳转 /admin/gateway

## 三、远程市场目录配置

### 3.1 配置方式

1. 进入「插件市场」页面
2. 点击右上角「远程目录配置」
3. 输入远程市场 JSON URL（需 http(s) 开头）
4. 保存后系统自动拉取远程目录，失败时回退到内置目录

### 3.2 存储位置

- 配置存储在 `site_config` 表，key = `plugin_market_url`
- 空值或清除 = 使用内置目录

### 3.3 远程 JSON 格式

```json
{
  "plugins": [
    {
      "key": "ai-video-pro",
      "name": "AI 视频生成 Pro",
      "version": "1.0.0",
      "category": "ai",
      "description": "AI 视频生成专业版...",
      "features": ["文本转视频", "多风格模板", "高清输出"],
      "price": 299,
      "paid": true,
      "adminUrl": "/admin/ai-video-pro",
      "builtin": false
    }
  ]
}
```

### 3.4 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | 是 | 插件唯一标识，不可与内置插件重复 |
| name | string | 是 | 插件名称 |
| version | string | 否 | 版本号，默认 1.0.0 |
| category | string | 否 | 分类：ai/marketing/seo/data/content/system |
| description | string | 否 | 插件描述 |
| features | string[] | 否 | 功能点列表 |
| price | number | 否 | 价格（元），0 或未定义=免费 |
| paid | boolean | 否 | 是否付费插件 |
| adminUrl | string | 否 | 管理页面路径 |
| adminUrls | array | 否 | 多个管理入口 [{label, href}] |
| builtin | boolean | 否 | 是否内置（远程应为 false） |

### 3.5 缓存机制

- 远程目录拉取后内存缓存 **5 分钟**
- 可在 URL 后加 `?refresh=1` 强制刷新
- 拉取超时 8 秒，失败自动回退内置目录

## 四、插件安装与卸载

### 4.1 安装

1. 在「插件市场」视图找到目标插件
2. 点击「安装」按钮
3. 系统将插件信息写入 `site_config.plugin_state`（enabled=false）
4. 安装后出现在「已安装管理」视图，可启用/停用

### 4.2 卸载

- 仅远程插件（marketSource='remote'）可卸载
- 内置插件（builtin=true）不可卸载，只能停用
- 卸载后从 plugin_state 中移除，不再出现在已安装管理

### 4.3 技术边界

- 远程插件代表"能力开关 + 入口 + 说明"
- **功能代码仍需随部署存在**：已内置但默认停用的插件可直接安装激活
- 全新能力条目安装后需代码部署支持，卡片标注「功能代码待部署」

## 五、付费插件与兑换码

### 5.1 付费插件标识

- 插件定义中 `paid: true` + `price: XXX`
- 市场卡片显示价格（¥XXX）和「付费开通」按钮
- 已安装管理视图中，未开通的付费插件启停开关锁定（琥珀色 + 锁图标）

### 5.2 兑换码生成（管理员）

1. 点击「生成兑换码」按钮（仅 admin 角色可见）
2. 选择付费插件（下拉框列出所有 paid=true 的插件）
3. 选择有效期：30 天 / 90 天 / 365 天 / 永久 / 自定义日期
4. 点击「生成兑换码」
5. 系统生成兑换码并展示，可复制

### 5.3 兑换码格式

```
base64url(payload).base64url(HMAC-SHA256签名)
```

- payload：`{ pluginKey, exp?, issuedAt, cid? }`
- 签名密钥：环境变量 `PLUGIN_MARKET_SECRET`
- 未配置时使用默认密钥（生产环境务必配置）

### 5.4 兑换码激活

1. 在「插件市场」视图找到付费插件
2. 点击「付费开通」按钮
3. 粘贴兑换码
4. 系统校验签名、插件匹配、有效期
5. 校验通过后，插件 key 写入 `site_config.plugin_activated`
6. 启停开关解锁，可正常启用/停用

### 5.5 校验失败提示

- 格式不正确
- 签名校验失败
- 与插件不匹配
- 已过期

## 六、API 参考

所有 API 均需登录（auth() 鉴权），路径前缀 `/api/admin/plugin-market`。

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /api/admin/plugin-market | 获取市场目录（含 installedKeys/activatedKeys） | 登录 |
| POST | /api/admin/plugin-market/install | 安装插件 | 登录 |
| POST | /api/admin/plugin-market/uninstall | 卸载远程插件 | 登录 |
| POST | /api/admin/plugin-market/activate | 兑换码激活付费插件 | 登录 |
| POST | /api/admin/plugin-market/generate-code | 生成兑换码 | admin 仅 |
| GET/POST | /api/admin/plugin-market/url | 读取/保存远程市场 URL | 登录 |

### 6.1 启停 API（复用现有）

- GET `/api/admin/plugins`：已安装插件列表（含市场字段）
- POST `/api/admin/plugins`：启停插件（付费未开通返回 403）
- PUT `/api/admin/plugins`：更新插件配置

## 七、数据存储

| 存储位置 | key | 内容 |
|----------|-----|------|
| site_config | plugin_state | 插件启停状态 + 安装记录（installedAt/marketSource/price） |
| site_config | plugin_activated | 已开通付费插件 key 列表 |
| site_config | plugin_market_url | 远程市场目录 URL（可选） |

## 八、安全注意事项

1. **兑换码密钥**：生产环境务必配置 `PLUGIN_MARKET_SECRET` 环境变量，避免使用默认密钥
2. **生成权限**：`generate-code` API 仅 admin 角色可用（roles 含 admin 或权限 plugin:view/system:admin）
3. **付费防御**：启停 API 层有付费未开通防御（返回 403），即使前端绕过也无法启用
4. **远程目录清洗**：远程 JSON 经白名单字段清洗（sanitizeRemotePlugin），防止恶意字段注入
5. **兑换码验签**：使用 timingSafeEqual 防时序攻击

## 九、内置插件清单（44 个）

### AI 能力（8 个）
- ai-customer-service（AI 智能客服）
- ai-translate（AI 多语言翻译）
- ai-text（AI 文本）
- ai-image（AI 图像生成）
- ai-autopilot（AI 自动运营）
- ai-site-wizard（AI 建站向导）
- content-collector（内容采集）
- ai-features（AI 功能开关矩阵）

### 营销与商机（9 个）
- lead（询盘线索）
- quote（询价报价）
- download-leads（下载留资）
- email-marketing（EDM 邮件营销）
- member（会员中心）
- mall（在线商城）
- visit-booking（考察预约）
- form-builder（通用表单）
- customer-portal（客户门户）

### SEO 与数据（3 个）
- seo（SEO/GEO 优化）
- backlink（外链营销）
- analytics（数据统计）

### 内容管理（10 个）
- product（产品管理）
- news（新闻管理）
- industry（行业方案）
- service（服务内容）
- resource（资源下载）
- about（关于我们）
- career（职位招聘）
- case（成功案例）
- faq（常见问题）
- content-types（通用内容模型）

### 系统运维（14 个）
- site-config（站点配置）
- home-config（首页配置）
- header（页面头部）
- theme（主题配色）
- language（语种管理）
- template（模板管理）
- smtp（SMTP 邮件）
- captcha（验证码）
- multi-site（多站点/租户）
- white-label（白标 OEM）
- video-content（视频内容）
- ai-recommend（AI 推荐）
- applet（小程序）
- operations（运营驾驶舱）

## 十、付费示例插件（3 个，内置目录中）

| key | 名称 | 价格 | 说明 |
|-----|------|------|------|
| ai-video-pro | AI 视频生成 Pro | ¥299 | 高级 AI 视频生成能力 |
| advanced-seo | SEO 高级分析 | ¥199 | 深度 SEO 分析与优化建议 |
| crm-integration | CRM 客户集成 | ¥99 | 与第三方 CRM 系统对接 |

> 以上为示例远程条目，用于演示付费插件流程。实际功能代码需后续部署支持。

## 十一、常见问题

**Q: 为什么有些插件显示「功能代码待部署」？**
A: 远程市场目录中的插件可能只有元数据（名称/描述/价格），功能代码尚未随部署发布。安装后需等待代码部署才能实际使用。

**Q: 内置插件需要安装吗？**
A: 内置插件默认已在系统中，可直接在「已安装管理」中启停。市场视图中的「安装」按钮对内置插件是将其加入显式管理列表（可选操作）。

**Q: 兑换码可以重复使用吗？**
A: 兑换码与插件 key 绑定，激活后该插件即开通。同一兑换码重复激活会提示已开通（幂等）。

**Q: 如何更换远程市场源？**
A: 点击「远程目录配置」，输入新的 URL 并保存。系统会自动拉取新目录，5 分钟缓存过期后生效（或加 ?refresh=1 强制刷新）。

**Q: 付费插件停用后还需要重新开通吗？**
A: 不需要。开通状态存储在 plugin_activated 中，停用/启用不影响开通状态。只有卸载远程插件才会清除安装记录（开通状态保留）。
