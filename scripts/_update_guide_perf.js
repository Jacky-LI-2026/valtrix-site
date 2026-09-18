const fs = require('fs');

const guidePath = 'docs/使用文档.md';
let content = fs.readFileSync(guidePath, 'utf8');

// 如果已有性能优化章节则跳过
if (content.includes('## 性能优化')) {
  console.log('已有性能优化章节，跳过');
  process.exit(0);
}

const newSection = `

---

## 性能优化

> 2026-09-02 上线。目标：减少服务器压力、提升访问速度、保障高并发稳定。
> 详细方案见 \`docs/performance-optimization.md\`。

### 1. API 响应缓存层（已生效）

前台页面为客户端渲染，数据通过公开 API 获取。为避免每个请求都实时查询数据库，公开 API 已统一加入缓存头（\`lib/api-cache.ts\`）：

| 数据 | 缓存策略 |
|------|----------|
| 语种 / 菜单 | 1 小时强缓存 |
| 首页 / 站点 / 页面配置 | 5 分钟 + 异步刷新（SWR） |
| 产品 / 行业 / 服务 / 关于 / 资源 / 职位 | 5 分钟 + 异步刷新（SWR） |
| 新闻（含自动采集） | 1 分钟 + 异步刷新 |

- 效果：浏览器 / CDN 复用响应，不再每次打数据库。
- 后台修改数据后最多 5 分钟前台可见（SWR 异步刷新机制，不会永久缓存）。
- **注意**：如果后台修改了数据，前台没立刻变化，这是正常的，等缓存过期（最多 5 分钟）自动刷新；急用可重启服务强制清缓存。

### 2. 数据库连接池优化（已生效）

- 所有 API 统一使用 Prisma 全局单例（\`@/lib/prisma\`），避免每个 API 各自开连接池导致连接数爆炸。
- 生产环境连接数控制：在 \`.env\` 的 \`DATABASE_URL\` 后追加 \`&connection_limit=10\`（按机器配置调整）。
- 高并发场景可接 PgBouncer（事务级连接池，见文档）。

### 3. Nginx gzip 压缩与缓存（生产部署用）

配置文件：\`docs/nginx-zuowen.conf\`

- gzip 压缩：文本 / JS / CSS / JSON 等，减少传输体积 60-80%。
- 静态资源长缓存：\`/_next/static/\` 一年（文件名带哈希，内容永不变）。
- uploads 图片缓存 7 天、字体一年。
- HTTPS 强制跳转、安全响应头。

**部署步骤**：
1. 拷贝到服务器 \`/etc/nginx/conf.d/zuowen.conf\`
2. 把 \`example.com\` 替换为真实域名，\`ssl_certificate\` 换成证书路径
3. 执行 \`nginx -t\` 校验，\`systemctl reload nginx\` 生效

### 4. CDN 加速静态资源（生产部署用）

方案文档：\`docs/CDN加速方案.md\`

- 使用阿里云 OSS + CDN，加速 \`/_next/static/\` 与 \`/uploads/\` 静态资源。
- API 缓存头已兼容 CDN（\`s-maxage\` 生效），CDN 也会缓存 API 响应。
- 按流量计费，小型企业官网成本很低。
- CDN 加速域名需要 ICP 备案。

### 5. 日志与临时文件清理

- **Linux 生产**：\`scripts/cleanup.sh\`，crontab 每天凌晨 3 点执行：
  \`\`\`bash
  crontab -e
  # 加入
  0 3 * * * /bin/bash /var/www/zuowen/scripts/cleanup.sh >> /var/log/zuowen-cleanup.log 2>&1
  \`\`\`
- **Windows 本地**：\`scripts/cleanup.ps1\`，可配合「任务计划程序」每日执行。
- 清理内容：\`.next/cache\`、超过 14 天的日志、临时部署包、保留最近 10 份备份。

### 6. 服务器资源监控

- **Linux 生产**：\`scripts/monitor.sh\`，每 5 分钟监控：
  - CPU 使用率 > 85% 告警
  - 内存使用率 > 85% 告警
  - 磁盘使用率 > 80% 告警
  - 系统负载 > 核数告警
  - 网站服务不可访问告警（可配置自动重启）
  - 超阈值通过飞书 webhook 推送告警（配置 \`ALERT_WEBHOOK\`）
  - crontab 每 5 分钟执行：\`*/5 * * * * /bin/bash /var/www/zuowen/scripts/monitor.sh\`
- **Windows 本地**：\`scripts/monitor.ps1\`，任务计划程序每 5 分钟执行，日志写入 \`logs/monitor.log\`，告警写入 \`logs/monitor-alert.log\`。

### 7. 部署后验证清单

\`\`\`bash
# gzip 生效
curl -I -H "Accept-Encoding: gzip" https://yourdomain.com/
# 应返回 Content-Encoding: gzip

# 静态资源长缓存
curl -I https://yourdomain.com/_next/static/chunk.js
# 应返回 cache-control: max-age=31536000, immutable

# API 缓存头
curl -I https://yourdomain.com/api/public/languages
# 应返回 Cache-Control: public, s-maxage=3600
\`\`\`

### 8. 关于"Next.js 静态生成 / ISR"

前台页面为客户端渲染（CSR），页面 HTML 本身不含业务数据（数据都在客户端 fetch），所以**静态生成/ISR 对当前架构直接收益有限**，暂不实施。如需进一步优化可改为服务端组件 + \`generateStaticParams\`（涉及前台组件重构，见性能优化文档"进阶优化"）。
`;

fs.writeFileSync(guidePath, content + newSection, 'utf8');
console.log('使用说明书已追加「性能优化」章节');
