# 增量更新服务器 · 公网部署手册

> 适用对象：**供应商（左文科技）**。把「系统更新托管服务器」（`scripts/update-server.js`）部署到一台公网 Linux 服务器上，客户部署的网站即可通过后台「系统运维 → 系统更新」在线检查、下载并应用增量更新包。
>
> 版本：2026-09-06 · 实测闭环：本地 0.1.0 → 检查 → 下载 532MB → 应用 517 文件 → 版本同步 0.2.0 ✅

---

## 一、架构总览

```
┌─────────────────────┐         ┌──────────────────────────────┐        ┌────────────────────┐
│  供应商本机（制作）    │  sftp   │  公网更新服务器（托管）         │  https │  客户网站（消费）     │
│                     │ ──────▶ │   pm2: update-server:8787     │ ◀───── │  .env 配            │
│  _make_incremental  │         │   updates/downloads/*.zip     │        │  UPDATE_SERVER_URL  │
│  _update.js 生成包    │         │   updates/updates.json       │        │  后台「系统更新」      │
└─────────────────────┘         └──────────────────────────────┘        └────────────────────┘
                                          ▲ Nginx 80/443 反代 8787
                                          │（域名 + HTTPS，推荐）
```

- 更新服务器职责极简：**只读**地提供「版本列表 JSON」+「更新包文件下载」，不写任何数据库。
- 客户侧逻辑（`lib/server/update-applier.ts`）负责解压、受控覆盖、执行迁移脚本，与托管端完全解耦。
- 更新服务器**可以不与客户网站同机**，也可同机（端口不同即可，网站 3000 / 更新 8787）。

---

## 二、前置条件

| 项 | 要求 | 说明 |
|---|---|---|
| 公网 Linux 服务器 | Ubuntu 20.04 / Debian 11+，1 核 1G 即可 | 纯文件服务，资源占用极低 |
| Node.js | ≥ 18 | `node -v` 确认 |
| pm2 | 已装 | `npm i -g pm2`；未装见下文步骤 |
| Nginx | 已装（推荐） | 提供域名 + HTTPS；无域名可只用 IP:8787 |
| 域名（可选但推荐） | 如 `updates.zuowen.com` | DNS A 记录指向服务器 IP |
| 磁盘 | 更新包总量 + 1 倍余量 | 当前示例包 532MB，建议 ≥ 2GB |

> 若使用现成的网站服务器（如 8.130.65.182）同机托管：确认 8787 端口未被占用、Nginx 已装即可，其余步骤相同。

---

## 三、服务器端部署步骤

以下命令在**公网服务器**上执行（root 或 sudo 用户）。

### 1. 创建目录结构

```bash
mkdir -p /var/www/update-server/updates/downloads
cd /var/www/update-server
```

### 2. 上传托管端文件

从**供应商本机**（`D:\企业网站`）上传两个东西到服务器 `/var/www/update-server/`：

```powershell
# 供应商本机 PowerShell 执行（Windows 自带 scp 或使用 WinSCP）
scp scripts/update-server.js root@<服务器IP>:/var/www/update-server/
scp updates/updates.json root@<服务器IP>:/var/www/update-server/updates/
scp updates/downloads/zuowen-update-0.2.0.zip root@<服务器IP>:/var/www/update-server/updates/downloads/
```

> 说明：`update-server.js` 里的路径是相对自身的（`../updates`），放到 `/var/www/update-server/` 下即可，无需改代码。

### 3. 用 pm2 托管（含开机自启）

```bash
# 若未装 pm2
npm install -g pm2

cd /var/www/update-server
pm2 start update-server.js --name update-server -- 8787
pm2 save
pm2 startup   # 按输出提示执行它给出的那条命令（含 systemd 路径），实现开机自启
```

验证：

```bash
pm2 status          # update-server 应为 online
curl http://127.0.0.1:8787/api/version/latest
```

期望返回：

```json
{"updates":[{"version":"0.2.0","releaseNotes":"...","file":"zuowen-update-0.2.0.zip","publishedAt":"2026-09-06"}],"latest":{"version":"0.2.0",...},"hasUpdate":true}
```

### 4. 防火墙放行（如启用 ufw）

```bash
ufw allow 8787/tcp
# 或云安全组控制台放行 8787（阿里云/腾讯云需在控制台「安全组」加规则）
```

> ⚠️ 阿里云等云厂商：安全组默认全关，**必须**在控制台放行 8787（或仅对 Nginx 80/443 放行，8787 只允许本机回环，见第 6 步——推荐后者）。

---

## 四、Nginx 反代 + HTTPS（推荐）

### 5. Nginx 站点配置

新建 `/etc/nginx/conf.d/update-server.conf`：

```nginx
server {
    listen 80;
    server_name updates.zuowen.com;   # 换成你的域名

    # 更新包可达 500MB+，必须放宽
    client_max_body_size 0;
    proxy_request_buffering off;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # 大文件下载不超时
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        # 下载时禁用缓冲，让浏览器看到真实下载进度
        proxy_buffering off;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

### 6. 一键 HTTPS（certbot）

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d updates.zuowen.com   # 按提示填邮箱，选择强制跳转 HTTPS
certbot renew --dry-run                  # 验证自动续期
```

> 无域名场景：跳过 5/6，直接让客户配 `UPDATE_SERVER_URL=http://<IP>:8787`（明文 HTTP，仅内网/测试可用）。

### 7. （推荐）更新服务器只读加固：内网隔离

公网只暴露 Nginx，8787 不对外：

```bash
# 1) 防火墙仅放行 80/443，不放行 8787
ufw allow 80/tcp && ufw allow 443/tcp

# 2) Nginx 里把下载也走反代（第 5 步已覆盖 / 全部路径），
#    并确认 update-server 只监听本机（可选）：
#    改 update-server.js 监听 127.0.0.1（第 93 行 "0.0.0.0" → "127.0.0.1"），pm2 restart update-server
```

> 这样公网只能通过 Nginx 访问，8787 不暴露，降低被扫描风险。文件服务本身只读、无鉴权面，风险可控。

---

## 五、客户侧配置（最终验收）

在**每个客户的网站服务器**上：

```bash
cd /var/www/<客户站点>   # 客户项目根目录
# 编辑 .env，追加：
echo 'UPDATE_SERVER_URL=https://updates.zuowen.com' >> .env
pm2 restart zuowen-web
```

后台验证：登录客户网站后台 →「系统运维 → 系统更新」→ 点击「检查更新」：

- 显示当前版本（如 0.1.0）与远程最新版本（0.2.0）
- 点击「下载并应用」→ 等待完成 → 页面提示升级成功、版本号变为 0.2.0
- 复查「检查更新」不再提示有更新（版本已同步）

---

## 六、日常发布新版本流程（供应商侧）

每次有新功能/修复要发布时：

```bash
# 1. 供应商本机：生成增量包（对比上一版本目录，自动排除 .env/node_modules/.node 二进制等）
cd D:\企业网站
node scripts/_make_incremental_update.js --version 1.1.0 --prev <上版本项目目录> --include-migration --release-notes "本次更新说明"

# 2. 把新包 + 登记文件上传到公网更新服务器
scp updates/downloads/zuowen-update-1.1.0.zip root@<IP>:/var/www/update-server/updates/downloads/
# 3. 更新登记：把 updates.json 加一条记录（version/releaseNotes/file/publishedAt）
# 4. 无需重启服务（每次请求实时读 updates.json）
```

> `--prev` 基线法：首次发布可用 `--gen-baseline updates/baseline.json` 生成指纹基线，之后用 `--baseline updates/baseline.json` 对比（更轻量，无需保留整份旧项目）。

---

## 七、安全与运维建议

| 事项 | 建议 |
|---|---|
| 更新包校验 | 客户侧已做 zip 结构/路径安全校验；供应商发布前在包内运行 `npx prisma generate && pnpm build` 自测 |
| 私钥保护 | `scripts/license-keys/`（RSA 私钥）**严禁**上传任何服务器，包括更新服务器 |
| 版本登记 | `updates.json` 只追加不删除（客户可跨多版本选择升级）；同一 version 重复发布会覆盖旧包，注意客户已装版本 |
| 磁盘监控 | 定期清理历史大包（保留最近 N 个版本）：`ls -lh /var/www/update-server/updates/downloads/` |
| 日志 | `pm2 logs update-server` 查看访问记录；建议在 Nginx access log 按域名区分 |
| 带宽 | 大包下载走对象存储 CDN 可进一步优化（S3/OSS + 预签名 URL 放入 `downloadUrl` 字段），当前直连足够 |

---

## 八、故障排查

| 现象 | 排查 |
|---|---|
| 客户「检查更新」提示未配置 | 确认客户 `.env` 有 `UPDATE_SERVER_URL` 且已 `pm2 restart`；`curl -I https://updates.zuowen.com/api/version/latest` |
| 返回 502 | Nginx 未起 / update-server 未运行（`pm2 status`）|
| 下载到一半断开 | 代理缓冲未关（`proxy_buffering off`）、`proxy_read_timeout` 太短 |
| 域名访问 404 | Nginx `server_name` 与 DNS 不一致；`nginx -t` 后 reload |
| 应用后版本号不变 | 增量包未含新 package.json（旧包）→ 用当前 `_make_incremental_update.js` 重新生成 |
| 客户应用报「迁移脚本缺失」 | 生成时未加 `--include-migration` 或 schema 无变化；确认 manifest 里 `migration` 字段指向包内脚本 |
| HTTPS 证书 | `certbot renew --dry-run` 每季度自检；续期失败多为 DNS/防火墙 |

---

## 九、验收清单（本次部署是否完成）

- [ ] `pm2 status` 中 update-server online
- [ ] `curl http://127.0.0.1:8787/api/version/latest` 返回版本 JSON
- [ ] `curl -I https://updates.zuowen.com/downloads/zuowen-update-0.2.0.zip` 返回 200
- [ ] 客户后台「检查更新」能列出 0.2.0
- [ ] 客户下载并应用成功，版本号变为 0.2.0
- [ ] 复查不再误报「有更新」
- [ ] 防火墙仅放行 80/443（8787 内网隔离）
