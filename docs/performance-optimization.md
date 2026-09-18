# 左文科技企业官网 — 性能优化方案

> 日期：2026-09-02
> 目标：减少服务器压力、提升访问速度、保障高并发稳定

## 一、当前架构分析

- **前台**：全部为客户端渲染（`"use client"`），页面 HTML 由 Next.js 动态生成，数据通过 `/api/public/*` fetch 获取。
- **数据库**：PostgreSQL，Prisma 5.22 访问。
- **部署形态**：当前本地开发（Windows），生产计划部署阿里云 + Nginx + PM2。

### 架构结论
> 因为前台是 CSR 而非 SSR/SSG，**「Next.js 静态生成(SSG)/ISR」对本项目直接收益有限**（页面 HTML 本身不含业务数据，数据都在客户端 fetch）。真正有效的优化是**给 API 加缓存层**，让浏览器/CDN 复用数据响应，从而降低数据库和源站压力。若要进一步 SSG/ISR，需把页面改为服务端组件 + `generateStaticParams`（大改动，见文末"进阶"）。

## 二、已完成的优化

### 1. API 响应缓存层（核心优化，已上线 ✅）
- 新建 `lib/api-cache.ts`：统一的 `cachedJson(data, strategy)`，按数据变化频率设置 `Cache-Control`。
- 14 个公开 API 全部接入，策略：

| 数据 | API | 缓存策略 |
|------|-----|----------|
| 语种/菜单 | languages, menus | `s-maxage=3600`（1小时强缓存） |
| 首页/站点/页面配置 | home-config, site-config, page-config | `s-maxage=300` + SWR 1h |
| 产品/行业/服务/关于/资源/职位 | products, industries, services, about, resources, careers | `s-maxage=300` + SWR 1h |
| 新闻（含自动采集） | news | `s-maxage=60` + SWR 5min |

- 效果：
  - **浏览器重复访问**：同一请求不重复打源站（SWR 允许后台异步刷新）。
  - **Nginx/CDN**：`s-maxage` 让共享缓存层也生效，进一步减负。
  - 后台改数据后最多 5 分钟前台可见（SWR 机制），不会永久缓存。

### 2. 数据库连接池优化（✅ 已上线）
- 统一 Prisma 单例：删除 5 处 `new PrismaClient()`（site-config/menus/page-config/home-config/admin page-config），全部改为 `import { prisma } from "@/lib/prisma"` 复用全局实例，避免每个 API 各自开连接池导致连接数爆炸。
- `lib/prisma.ts` 生产环境通过 `DATABASE_URL?connection_limit=N` 控制连接数（见文件注释）。
- 生产高并发建议接 PgBouncer（文档已记录）。

### 3. 顺带修复
- `app/careers/[slug]/page.tsx`：修复重复的 `}, [params.slug]);` 导致的编译错误。
- `app/api/public/news/route.ts`：`norm()` 参数类型放宽 `string | null`，消除类型错误。

## 三、待部署项（生产环境执行）

### 4. Nginx gzip + 缓存（已提供配置文件）
- 文件：`docs/nginx-zuowen.conf`
- 包含：gzip 压缩、`_next/static` 一年长缓存、uploads 7 天缓存、安全头、反向代理、HTTPS。
- 部署：拷贝到 `/etc/nginx/conf.d/`，替换域名和证书路径，`nginx -t && systemctl reload nginx`。

### 5. CDN 加速静态资源（方案文档）
- 文件：`docs/cdn-acceleration.md`
- 阿里云 OSS + CDN，加速 `/_next/static/` 与 `/uploads/`。
- API 缓存头已兼容 CDN（`s-maxage` 生效）。

### 6. 日志/临时文件清理（已提供脚本）
- Linux：`scripts/cleanup.sh`（crontab 每天凌晨 3 点执行）
- Windows：`scripts/cleanup.ps1`（任务计划程序）
- 清理：`.next/cache`、超期 `*.log`、`/tmp` 部署包、`tmp/deploy-uploads`、保留最近 10 份备份。

### 7. 服务器资源监控（已提供脚本）
- Linux：`scripts/monitor.sh`（crontab 每 5 分钟，CPU/内存/磁盘/负载/服务健康，超阈值发飞书告警）
- Windows：`scripts/monitor.ps1`（任务计划程序，已实测正常）
- 建议阈值：CPU 85%、内存 85%、磁盘 80%、负载=核数。

## 四、部署后验证清单

```bash
# 1. gzip 生效
curl -I -H "Accept-Encoding: gzip" https://yourdomain.com/
# 应返回 Content-Encoding: gzip

# 2. 静态资源长缓存
curl -I https://yourdomain.com/_next/static/chunk.js
# 应返回 cache-control: max-age=31536000, immutable

# 3. API 缓存头
curl -I https://yourdomain.com/api/public/languages
# 应返回 Cache-Control: public, s-maxage=3600

# 4. 连接池
# 观察 PostgreSQL：SELECT count(*) FROM pg_stat_activity; 确认连接数受控

# 5. 监控生效
cat /var/log/zuowen-monitor.log
```

## 五、进阶优化（可选，后续按需实施）

1. **页面级 SSG/ISR**：将低频页面（关于、服务、行业列表等）改为服务端组件 + `generateStaticParams` + `revalidate`，HTML 直接静态化。工作量大，涉及前台组件重构。
2. **图片体积**：富文本上传图片已计划压缩为 webp；`next/image` 已开启优化。
3. **数据库索引**：对高频查询字段（news.slug、products 关联等）检查 EXPLAIN 补充索引。
4. **前端包体积**：`next/dynamic` 动态加载 360 查看器等重型组件，减少首屏 JS。
5. **PgBouncer**：高并发生产接入事务级连接池。
6. **监控大盘**：接 Prometheus + Grafana（或云厂商云监控）。

## 六、文件清单

| 文件 | 说明 |
|------|------|
| `lib/api-cache.ts` | 新增，API 缓存工具 |
| `lib/prisma.ts` | 修改，单例+连接池注释 |
| `app/api/public/*` (14个) | 修改，接入 cachedJson |
| `app/api/admin/page-config/route.ts` | 修改，Prisma 单例 |
| `docs/nginx-zuowen.conf` | 新增，Nginx 配置 |
| `docs/cdn-acceleration.md` | 新增，CDN 方案 |
| `scripts/cleanup.sh` / `cleanup.ps1` | 新增，清理脚本 |
| `scripts/monitor.sh` / `monitor.ps1` | 新增，监控脚本 |
| `app/careers/[slug]/page.tsx` | 修复编译错误 |
| `app/api/public/news/route.ts` | 修复类型错误 |
