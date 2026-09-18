# 左文科技企业官网 — 静态资源 CDN 加速方案

> 适用场景：生产环境（阿里云/腾讯云），加速 `/_next/static/` 与 `/uploads/` 静态资源，降低源站带宽压力、提升全球/全国访问速度。

## 一、为什么用 CDN

- 当前架构：前台 CSR，页面 HTML 由 Nginx 反代 Next.js 动态生成；**静态资源（JS/CSS/图片）占流量的 90% 以上**。
- CDN 把这些静态资源缓存到边缘节点，用户就近读取，源站带宽压力大幅下降，首屏速度提升明显。
- 数据库/API 请求（`/api/public/*`）已通过 `lib/api-cache.ts` 加了 `s-maxage` 缓存头，**CDN 也会缓存这些 API 响应**，进一步降低源站负载。

## 二、推荐方案（阿里云 OSS + CDN，成本最低）

### 1. 开通服务
- 阿里云控制台 → OSS（对象存储）→ 创建 Bucket（地域选离用户近的，如华东/华南）
- 开通 CDN（内容分发网络），按量付费

### 2. 上传静态资源（构建后自动同步）
在项目根目录创建脚本 `scripts/sync-cdn.js`，或直接手动上传：

```bash
# 构建
pnpm build

# 安装 ossutil（阿里云官方工具）
curl -L https://gosspublic.alicdn.com/ossutil/2.0.2-beta.0701.20220722/ossutil64.zip -o ossutil.zip
unzip ossutil.zip && chmod +x ossutil64

# 配置凭证（access-key-id / access-key-secret / endpoint）
./ossutil64 config

# 同步 _next/static 到 OSS（排除 .html，静态资源不带哈希的单独处理）
./ossutil64 sync .next/static/ oss://your-bucket/_next/static/ --delete
```

### 3. 配置 CDN 加速域名
- CDN → 域名管理 → 添加域名：`cdn.example.com`
- 源站类型：OSS 域名，选择刚创建的 Bucket
- 缓存配置：
  - `/_next/static/*` → TTL 365 天（文件名带哈希，内容永不变）
  - `/uploads/*` → TTL 7 天
  - `/api/public/*` → TTL 按响应的 Cache-Control（默认 5 分钟，尊重源站）
- 回源 HOST：`example.com`
- HTTPS 证书：为 cdn.example.com 申请免费证书

### 4. 修改 Nginx / 前端资源前缀
方式 A（推荐）：Nginx 层把静态资源反代到 CDN（`docs/nginx-zuowen.conf` 中已预留注释）：

```nginx
location /_next/static/ {
    proxy_pass https://cdn.example.com/_next/static/;
    expires 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

方式 B：前端全局前缀（需 Next.js 配置 assetPrefix）：
```js
// next.config.js
const nextConfig = {
  assetPrefix: process.env.CDN_PREFIX || '',
  // 注意：assetPrefix 会让 _next/static 指向 CDN，本机开发不设置该变量
}
```

### 5. 上传文件（/uploads）也走 CDN
后台富文本/商品图上传到 `public/uploads`，发布时同样 sync 到 OSS 并走 CDN 前缀。若图片是运行时上传（不走构建），建议改为直接上传到 OSS（API 改造），此处不再展开。

## 三、验证

```bash
# 1. 确认 CDN 命中缓存
curl -I https://cdn.example.com/_next/static/xxx.js
# 应返回 x-cache: HIT / hit from ...

# 2. 确认 API 缓存头
curl -I https://example.com/api/public/languages
# 应返回 Cache-Control: public, s-maxage=3600, stale-while-revalidate=3600
```

## 四、费用预估（仅供参考）
- OSS：存储量小（上传文件+构建产物，通常 <2GB），费用可忽略
- CDN：按流量计费，国内约 0.24 元/GB（高峰期），低峰更便宜；对小型企业官网月流量几 GB~几十 GB 时成本很低
- 域名备案：CDN 加速域名需要 ICP 备案（阿里云可代备案）

## 五、注意事项
1. `_next/static` 文件名带内容哈希，**可以无限期缓存**，更新版本后新哈希自然回源。
2. `/uploads` 下图片若被替换（同名覆盖），CDN 旧缓存最长 7 天，若需立即生效可在 CDN 控制台刷新 URL。
3. API 使用 `stale-while-revalidate`：CDN 在过期后先返回旧数据、异步回源刷新，保证后台改数据 5 分钟内前台可见。
