# VALTRIX 后台「能力插件」入口缺失 — 根因分析（只读诊断）

- 诊断时间：2026-09-10
- 诊断范围：本地代码 `D:\阀门网站` + 本地库 `zuowen_valve` + 线上服务器 `47.57.241.85:/var/www/valtrix`（均只读）
- 诊断方式：文件读取 + SQL SELECT + SSH 只读查询；**未做任何修改**
- 结论先行：**「插件启停中心 / API 网关」入口被权限码 `plugin:view` 挡住，而该权限码在 permissions 表中根本不存在**，因此任何角色（含 admin 57 权限全量）都无法拥有它，`hasPerm('plugin:view')` 恒为 false → 这两个菜单项永远隐藏。

---

## 1. 侧边栏插件分组渲染逻辑

文件：`D:\阀门网站\components\admin\AdminSidebar.tsx`

### 1.1 「能力市场」分组静态定义（第 80-91 行）

```tsx
{
  label: '能力市场',
  href: '/admin/plugins',
  icon: <Puzzle size={18} />,
  children: [
    { label: '插件启停中心', href: '/admin/plugins', permission: 'plugin:view' },          // ← 依赖 plugin:view
    { label: 'API 网关',     href: '/admin/gateway',  permission: 'plugin:view' },          // ← 依赖 plugin:view
    { label: 'AI 开关矩阵',  href: '/admin/ai-features', permission: 'ai:config' },         // ← 依赖 ai:config
    { label: 'AI 自动运营',  href: '/admin/ai-autopilot', permission: 'ai:config', plugin: 'ai-autopilot' },
    { label: 'AI 建站向导',  href: '/admin/ai-site-wizard', permission: 'ai:config', plugin: 'ai-autopilot' },
  ],
},
```

### 1.2 渲染条件（第 269-284 行）

```tsx
const visibleMenu = menuItems.map((item) => {
  // 能力市场分组：静态子项 + 动态插件入口（勾选显示在侧边栏的已启用插件）
  if (item.href === '/admin/plugins' && item.children && dynamicPluginChildren.length > 0) {
    const staticChildren = item.children.filter((c) => hasPerm(c.permission) && pluginOn(c.plugin))
    const extra = dynamicPluginChildren.map((c) => ({ ...c }))
    return { ...item, children: [...staticChildren, ...extra] }
  }
  if (item.children) {
    const visChildren = item.children.filter((c) => hasPerm(c.permission) && pluginOn(c.plugin))
    return { ...item, children: visChildren }
  }
  return item
}).filter((item) => {
  if (item.children) return item.children.length > 0        // ← 分组自身：只要还有 ≥1 个子项就显示
  return hasPerm(item.permission) && pluginOn(item.plugin)
})
```

- 分组整体是否显示：**只要求 children.length > 0**，不依赖 `plugin:view`、`isSuperAdmin` 或租户模式。
- 子项条件逐条拆解：

| 子项 | 权限条件 | 插件条件 | 结论（admin 当前会话） |
|---|---|---|---|
| 插件启停中心 | `hasPerm('plugin:view')` | 无 | **恒 false（权限码不存在）→ 隐藏** |
| API 网关 | `hasPerm('plugin:view')` | 无 | **恒 false → 隐藏** |
| AI 开关矩阵 | `hasPerm('ai:config')` | 无 | true（admin 已授予 ai:config）→ 显示 |
| AI 自动运营 | `hasPerm('ai:config')` | `pluginOn('ai-autopilot')` | true（ai-autopilot 默认启用）→ 显示 |
| AI 建站向导 | `hasPerm('ai:config')` | `pluginOn('ai-autopilot')` | true → 显示 |

### 1.3 两个关键辅助函数

```tsx
// 权限判断（无 permission 声明的菜单项默认可见）
const hasPerm = (p?: string) => {
  if (!p) return true
  return userPerms.includes(p)                 // userPerms = session.user.permissions（数组）
}

// 插件启停 + 侧边栏显隐过滤（加载失败则全部显示，不阻塞）
const pluginOn = (p?: string) => {
  if (pluginMeta === null || !p) return true
  const m = pluginMeta.get(p)
  return !!m && m.showInSidebar !== false
}
```

- `userPerms` 来自 `session.user.permissions`（第 161 行 `user?.permissions`）。
- `pluginMeta` 来自 `fetch("/api/admin/plugins?mode=enabled")`（第 170-179 行）；fetch 失败时 `pluginMeta=null` → 所有 `pluginOn()` 返回 true（不阻塞显示）。

### 1.4 动态插件入口（第 240-267 行）

```tsx
if (pluginMeta) {
  pluginMeta.forEach((m) => {
    if (m.showInSidebar === false) return
    if (m.isContentSection || m.planned) return
    if (STATIC_SIDEBAR_PLUGIN_KEYS.has(m.key)) return
    if (m.adminUrls && m.adminUrls.length > 0) {
      dynamicPluginChildren.push({ label: m.name, href: m.adminUrls[0].href, pluginKey: m.key, children: ... })
    } else if (m.adminUrl) {
      dynamicPluginChildren.push({ label: m.name, href: m.adminUrl, pluginKey: m.key })
    }
  })
}
```

动态入口**没有 permission 字段** → `hasPerm(undefined)=true`，只要插件启用 + showInSidebar 就显示。

### 1.5 分组是否会被整体隐藏？

不会。即使两个 `plugin:view` 子项消失，「AI 开关矩阵」仍显示（ai:config 已授予），且大量动态插件入口（AI 智能客服/翻译/SEO/采集/邮件营销/统计/报价/会员/多站点等，默认启用）也会追加进该分组。**因此用户看到的是"能力市场分组还在，但里面的插件启停中心/API 网关不见了"，即"能力插件入口缺失"。**

---

## 2. 权限核查结果（本地 + 线上一致）

### 2.1 permissions 表：不存在任何 plugin 权限码

```
SELECT id, code, name, module FROM permissions WHERE code ILIKE '%plugin%' ...  → 0 行
permissions 总数 = 57（admin 关联 57、editor 关联 25）
```

57 个权限码全量：product:view/create/edit/delete、news:view/create/edit/delete/publish、resource:view/edit、config:site/theme/home、system:user/role/log/backup/update、collect:manage、**ai:config**、industry:view/manage、service:view/manage、career:view/manage、about:view/manage、menu:view/manage、lead:view/manage、download-lead:view/manage、analytics:view、language:view/manage、page-hero:view/manage、template:view/manage、deploy:view/manage、guide:view、smtp:view/manage、translate-config:view/manage、seo:view/manage、auto-collection:view/manage、license:view/manage、notification:view、setup:view。

**缺失清单（侧边栏引用但权限表不存在）：`plugin:view`（用于插件启停中心、API 网关）。**
代码中 `plugin:view` 仅在 AdminSidebar.tsx 第 85、86 行被引用（grep 全仓确认）。

### 2.2 角色关联

- roles：`1 admin`、`2 editor`。
- role_permissions：admin=57（全量）、editor=25。
- users：仅 1 个 `admin`（admin@zuowentech.com），`user_roles` → admin 角色。
- admin 拥有 `ai:config`（id=21）但**不可能拥有 plugin:view**（表里没有这条码）。

### 2.3 权限如何进入会话（auth.ts 第 46-49 行）

```ts
const roles = user.userRoles.map((ur) => ur.role.name)
const permissions = user.userRoles.flatMap((ur) =>
  ur.role.rolePermissions.map((rp) => rp.permission.code)
)
```

`session.user.permissions` 完全由 `permissions 表 → role_permissions` 组装。**权限码不存在 → 任何用户永远拿不到 → hasPerm('plugin:view') 恒 false。**（JWT 策略：旧 token 还会缓存旧 permissions，改权限后需重新登录才刷新。）

### 2.4 种子脚本同样缺失

- `prisma/seed.ts` permissionsData（21 项）无 plugin:view；
- `scripts/seed-permissions.js` NEW_PERMS（30 项）无 plugin:view —— **此前"修复权限表"跑的就是这个脚本，它补齐了 industry/service/career 等码并让 admin 全量关联，但从未包含 plugin:view，所以插件入口从未被修出来。**

---

## 3. 插件状态核查（site_config.plugin_state）

```
SELECT "configKey", "configValue" FROM site_config WHERE "configKey"='plugin_state';
→ {"mall": {"config": {}, "enabled": false}, "visit-booking": {"config": {}, "enabled": false}}
```

- 状态存储：`lib/plugins/store.ts` → `site_config.plugin_state`（JSON，`{ [key]: { enabled, config, name?, showInSidebar? } }`）。
- 读取：`getPluginState()` 直查 DB，无缓存（服务端每次查）；启用判断 `entry ? !!entry.enabled : manifest.defaultEnabled`。
- 当前仅显式停用 `mall`、`visit-booking`；其余插件均走 `registry.ts` 的 `defaultEnabled`（绝大多数 true；显式 defaultEnabled=false 的仅 ai-video/applet/ai-recommend/customer-portal）。
- 多租户：`tenants`/`sites` 表均为空，`site_config_override` 无数据，**不存在租户级插件开关影响**；侧边栏站点视角选择器只切换内容归属，与插件入口无关。
- 结论：**插件状态不是本次入口缺失的原因**（ai-autopilot 默认启用，AI 自动运营/建站向导可显示；动态插件入口多数可显示）。

---

## 4. 插件管理页面清单

### 4.1 核心管理页（全部存在）

| 页面 | 路径 | 侧边栏入口 | 入口归属分组 | 入口是否可见 |
|---|---|---|---|---|
| 插件启停中心 | `app/admin/plugins/page.tsx` ✓ | 有 | 能力市场（静态） | **不可见（缺 plugin:view）** |
| API 网关 | `app/admin/gateway/` ✓ | 有 | 能力市场（静态） | **不可见（缺 plugin:view）** |
| AI 开关矩阵 | `app/admin/ai-features/page.tsx` ✓ | 有 | 能力市场（静态） | 可见（ai:config） |
| AI 自动运营 | `app/admin/ai-autopilot/page.tsx` ✓ | 有 | 能力市场（静态） | 可见 |
| AI 建站向导 | `app/admin/ai-site-wizard/page.tsx` ✓ | 有 | 能力市场（静态） | 可见 |

> 注：`/api/admin/plugins` 的 GET/POST/PUT 仅校验 `session?.user`，**不校验 plugin:view** → 即使侧边栏入口隐藏，直接访问 `/admin/plugins` 仍可用（页面 404 不是原因）。

### 4.2 各插件子页面存在性 + 侧边栏入口来源

| 插件 key | 管理子页面（存在性） | 侧边栏入口来源 |
|---|---|---|
| ai-customer-service | settings/ai ✓、ai-knowledge ✓ | 动态（adminUrls）→ 能力市场 |
| ai-translate | translate-batch ✓、settings/translate ✓ | 动态 → 能力市场 |
| seo | settings/seo ✓ | 动态 → 能力市场 |
| content-collector | collection ✓、auto-collection-tasks ✓ | 动态 → 能力市场 |
| content-* 十栏目 | content/products、news、resources、industries、services、case、faq、careers、about、menus ✓ | 静态「内容管理」（STATIC_SIDEBAR_PLUGIN_KEYS 排除，不重复进能力市场） |
| ai-text / ai-image | settings/ai（共用）✓ | ai-text 动态 → 能力市场；ai-image 无 adminUrl → 不生成菜单 |
| ai-autopilot | ai-autopilot ✓ | 静态「能力市场」+ STATIC 排除动态 |
| email-marketing | email-marketing ✓ | 动态 → 能力市场 |
| backlink | backlinks ✓、backlinks/posts ✓ | 动态 → 能力市场 |
| analytics | analytics、funnel、heatmap、operations ✓ | 动态 → 能力市场（operations 同时有顶层「运营驾驶舱」） |
| lead | leads ✓（inquiries ✓ 为旧页） | 动态 → 能力市场 |
| quote | quotes ✓、quotes/template ✓ | 动态 → 能力市场 |
| download-leads | download-leads ✓ | 动态 → 能力市场 |
| member | members ✓、member-levels ✓ | 动态 → 能力市场 |
| mall | shop、shop/categories、shop/orders、shop/stats、shop/coupons ✓ | 动态，但 plugin_state 显式 disabled → 不显示 |
| multi-site | tenants ✓、sites ✓ | 动态 → 能力市场 |
| white-label | settings/oem ✓ | 动态 → 能力市场 |
| form-builder | forms ✓ | STATIC 排除（静态入口在站点设置？实际表单入口在能力市场静态区无——form-builder 在 STATIC_SIDEBAR_PLUGIN_KEYS，但静态菜单中未见 forms 项，属另案，非本次范围） |
| frontend-theme | templates ✓ | 动态 → 能力市场 |
| customer-portal | tickets ✓ | 默认 disabled → 不显示 |
| ai-video | ai-video ✓ | 默认 disabled → 不显示 |
| applet | applet ✓ | 默认 disabled → 不显示 |
| video-content / captcha / ai-recommend | 无 adminUrl | 不生成菜单（能力型插件） |

结论：**所有插件子页面均存在；侧边栏入口机制正常；唯一缺失的是"插件启停中心 + API 网关"这两个静态入口（plugin:view）。**

---

## 5. 前端插件状态 hook/工具

- **无 React hook（usePlugin 不存在）**；侧边栏用客户端 `pluginOn()` 直接读 `pluginMeta`（来自 `/api/admin/plugins?mode=enabled`）。
- 服务端工具集中在 `lib/plugins/`：`store.ts`（getPluginState / isPluginEnabled / getPluginConfig / listEnabledPlugins）、`registry.ts`（manifest）、`boot.ts` / `hooks.ts` / `capabilities.ts` / `sdk.ts` / `gateway-store.ts` / `pricing.ts`。
- `isPluginEnabled(key)`（store.ts）：查 site_config plugin_state，无记录时用 manifest.defaultEnabled。被 ai/gateway.ts、chat、ai-autopilot、ai-image、recommendations 等复用。
- **不存在"插件状态未加载导致全 false"的问题**：pluginMeta 加载失败时 pluginOn 放行（返回 true），不会反向隐藏。

---

## 6. 线上核实（47.57.241.85，只读）

与本地完全一致，排除"线上与本地版本不一致"的可能：

- `permissions` 表中 plugin 权限码：**0 行**；权限总数 57；admin=57 / editor=25；
- admin 拥有 `ai:config`，无 `plugin:view`；
- `site_config.plugin_state` = `{"mall": disabled, "visit-booking": disabled}`（与本地一致）；
- 服务器 `components/admin/AdminSidebar.tsx` 第 85-86 行同样引用 `permission: 'plugin:view'`；
- `/var/www/valtrix/app/admin/plugins/page.tsx`（22,627B）与 `app/api/admin/plugins/route.ts`（5,747B）均存在；pm2 valtrix online。

---

## 7. 根因判定

**精确根因：`plugin:view` 权限码在 permissions 表中不存在（57 条全量里没有，种子脚本也未定义），而 AdminSidebar 的「能力市场 → 插件启停中心」「能力市场 → API 网关」两个菜单项硬编码依赖 `hasPerm('plugin:view')`；admin 角色虽关联全部 57 条权限，但权限码本身缺失 → 该权限永远无法授予 → 两个入口恒隐藏。**

- 排除项：分组整体被条件包裹（否，分组只要求 ≥1 子项，AI 开关矩阵等仍在）；插件状态全 disabled（否，多数默认启用）；页面不存在（否，页面与 API 均在，直接访问可用）；租户/站点开关（否，表为空）；pluginOn 加载失败（否，失败放行）。
- 旁证：此前"修复权限表"（跑 `scripts/seed-permissions.js`）恢复了「能力市场」分组显示，是因为补上了 `ai:config` 等码；但该脚本 NEW_PERMS 从未包含 `plugin:view`，所以"插件启停中心"这个真正的插件管理入口始终没出现过。

---

## 8. 修复建议（仅建议，未执行）

**方案 A（推荐，与现有权限体系一致）：补齐 plugin 权限码并授予 admin**
1. 在 `scripts/seed-permissions.js` 的 NEW_PERMS 增加：
   - `['plugin:view', '查看插件', 'plugin', 'view']`
   - （可选）`['plugin:manage', '管理插件', 'plugin', 'manage']`
2. 在 `prisma/seed.ts` permissionsData 同步增加（保证新环境初始化一致）。
3. 执行 `node scripts/seed-permissions.js`（幂等，admin 自动全量关联；editor 不授系统级权限）。或直接 SQL：INSERT 两条权限 + INSERT role_permissions（admin 关联）。
4. 重新登录后台（JWT 会缓存旧 permissions），侧边栏「能力市场 → 插件启停中心 / API 网关」即恢复。
5. 如需更细粒度：可在 `/api/admin/plugins` 的 POST/PUT 增加 `plugin:manage` 校验（可选加固，非必须）。

**方案 B（最小改动，不新增权限码）**
- 将 AdminSidebar.tsx 第 85-86 行 `permission: 'plugin:view'` 改为已有的、admin/editor 均有的码（如 `system:update` 或去掉 permission 字段）。缺点：失去按角色控制插件管理的粒度，editor 也会看到插件中心。

**上线**：本地改完 → 增量部署（`node scripts/_deploy_incremental.js`）→ 服务器跑同一种子脚本或 SQL → 重新登录验证。线上核实已确认服务器代码与本地一致，按同一方案修复即可。

---

## 附：诊断执行记录（只读）

- 读取：AdminSidebar.tsx、lib/plugins/registry.ts、store.ts、ensure.ts、app/api/admin/plugins/route.ts、app/admin/plugins/page.tsx、auth.ts、prisma/seed.ts、scripts/seed-permissions.js、app/admin/layout.tsx。
- SQL（本地 zuowen_valve）：permissions 全量/角色关联/users/site_config/表结构；全程 SELECT/`\d`。
- SSH（47.57.241.85）：psql 只读 SELECT ×4 + grep/ls 代码文件 + pm2 status；未写入、未修改任何文件与配置。
