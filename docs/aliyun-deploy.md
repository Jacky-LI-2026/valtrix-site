# 左文科技企业官网 — 阿里云服务器部署文档

> 适用系统：Ubuntu 22.04 LTS / CentOS 7+
> 技术栈：Next.js 14 (App Router) + React 18 + TypeScript + Prisma + PostgreSQL 14+ + Nginx + PM2
> 包管理：pnpm
> 文档版本：2026-09-01

---

## 一、服务器准备

### 1.1 服务器选型建议

| 配置 | 推荐 | 说明 |
|------|------|------|
| CPU | 2核 及以上 | Next.js 构建需要内存，2核起步 |
| 内存 | 4GB 及以上 | 构建时峰值约 2GB，4GB 更稳 |
| 系统盘 | 40GB SSD | 系统 + 项目 + 数据库 + 备份 |
| 带宽 | 3Mbps 及以上 | 企业站访问量不大，3Mbps 够用 |
| 操作系统 | Ubuntu 22.04 LTS | 本文以 Ubuntu 为例 |

### 1.2 安全组配置（阿里云控制台）

入方向放行以下端口：

| 端口 | 协议 | 来源 | 用途 |
|------|------|------|------|
| 22 | TCP | 0.0.0.0/0 | SSH 远程连接（建议限制为你的 IP） |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 3000 | TCP | 127.0.0.1 | Next.js 应用（仅本地访问，Nginx 反代） |
| 5432 | TCP | 127.0.0.1 | PostgreSQL（仅本地访问） |

> 注意：3000 和 5432 不要对公网开放，只允许本地访问。

### 1.3 连接服务器

```bash
ssh root@你的服务器IP
```

---

## 二、环境依赖搭建

### 2.1 系统更新

```bash
apt update && apt upgrade -y
```

### 2.2 安装 Node.js 18+（推荐 20 LTS）

```bash
# 安装 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证
node -v   # 应输出 v20.x.x
npm -v    # 应输出 10.x.x
```

### 2.3 安装 pnpm

```bash
npm install -g pnpm

# 验证
pnpm -v   # 应输出 9.x.x
```

### 2.4 安装 PostgreSQL 14+

```bash
# Ubuntu 22.04 默认源自带 PostgreSQL 14
apt install -y postgresql postgresql-contrib

# 启动并设置开机自启
systemctl start postgresql
systemctl enable postgresql

# 验证
psql --version
```

### 2.5 创建数据库和用户

```bash
# 切换到 postgres 用户
su - postgres

# 进入 PostgreSQL 命令行
psql

# 在 psql 中执行以下 SQL：
CREATE USER zuowen WITH PASSWORD '你的数据库密码';
CREATE DATABASE zuowen_website OWNER zuowen ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE zuowen_website TO zuowen;

# 退出 psql
\q

# 退回 root
exit
```

> 记下数据库密码，后续配置 DATABASE_URL 时需要。

### 2.6 安装 Nginx

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# 验证（浏览器访问服务器IP应看到 Nginx 欢迎页）
nginx -v
```

### 2.7 安装 PM2（进程管理）

```bash
npm install -g pm2
pm2 -v
```

---

## 三、项目文件上传

### 方式一：SCP 上传（推荐，适合首次部署）

在**本地电脑**的项目目录（`D:\企业网站`）执行：

```powershell
# 打包项目（排除 node_modules、.next、backups、.git）
cd D:\企业网站
tar -czf zuowen-website.tar.gz --exclude=node_modules --exclude=.next --exclude=backups --exclude=.git --exclude=项目备份 .
```

然后上传到服务器：

```bash
scp zuowen-website.tar.gz root@你的服务器IP:/opt/
```

在服务器上解压：

```bash
mkdir -p /opt/zuowen-website
cd /opt
tar -xzf zuowen-website.tar.gz -C /opt/zuowen-website
cd /opt/zuowen-website
ls -la  # 确认文件完整
```

### 方式二：Git 克隆（推荐，适合后续更新）

如果代码托管在 Git 仓库（GitHub/Gitee/阿里云 Code）：

```bash
apt install -y git
cd /opt
git clone 你的仓库地址 zuowen-website
cd zuowen-website
```

### 方式三：后台一键备份恢复（数据迁移用）

如果是从其他服务器迁移，可在**原服务器后台** `/admin/backup` 导出 JSON 备份，上传到新服务器后通过 `/admin/deploy` 的恢复功能导入数据（详见第六章）。

---

## 四、环境变量配置

### 4.1 创建 .env 文件

```bash
cd /opt/zuowen-website
cp .env.local .env.production  # 如果有 .env.local 可参考
# 或者直接新建
nano .env
```

### 4.2 必须配置的环境变量

```env
# ===== 数据库（必填）=====
DATABASE_URL="postgresql://zuowen:你的数据库密码@localhost:5432/zuowen_website?schema=public"

# ===== NextAuth（必填）=====
NEXTAUTH_SECRET="这里填一个随机字符串，至少32位"
NEXTAUTH_URL="https://你的域名"

# ===== 邮件服务（可选，用于留言通知）=====
SMTP_HOST="smtp.qq.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="你的邮箱@qq.com"
SMTP_PASS="你的邮箱授权码"
MAIL_FROM="你的邮箱@qq.com"
MAIL_FROM_NAME="左文科技"

# ===== 百度翻译（可选，后台多语言翻译用）=====
BAIDU_TRANSLATE_APPID="你的百度翻译APPID"
BAIDU_TRANSLATE_KEY="你的百度翻译密钥"

# ===== 火山翻译（可选）=====
VOLCENGINE_ACCESS_KEY_ID="你的火山AK"
VOLCENGINE_SECRET_ACCESS_KEY="你的火山SK"
```

> 生成 NEXTAUTH_SECRET 的方法：
> ```bash
> openssl rand -base64 32
> ```

### 4.3 保存退出

nano 中按 `Ctrl+O` 保存，`Ctrl+X` 退出。

---

## 五、安装依赖、构建、数据库初始化

### 5.1 安装依赖

```bash
cd /opt/zuowen-website
pnpm install
```

> 首次安装可能需要 2-5 分钟，取决于服务器性能和网络。

### 5.2 生成 Prisma Client

```bash
npx prisma generate
```

### 5.3 推送数据库表结构

```bash
npx prisma db push
```

> 这会根据 `prisma/schema.prisma` 在数据库中创建所有表。
> 如果是全新数据库，表结构会被创建；如果表已存在，会同步新增的字段。

### 5.4 初始化管理员账号

```bash
npx tsx prisma/seed.ts
```

> 如果 seed 脚本中有默认管理员账号，会被创建。如果没有，需要手动在数据库中插入或通过注册页面创建。

### 5.5 构建生产版本

```bash
pnpm build
```

> 构建过程需要 2-5 分钟，内存不足 4GB 可能会失败。如果失败，可增加 swap 分区：
> ```bash
> fallocate -l 4G /swapfile
> chmod 600 /swapfile
> mkswap /swapfile
> swapon /swapfile
> echo '/swapfile none swap sw 0 0' >> /etc/fstab
> ```

### 5.6 启动测试

```bash
pnpm start
# 应输出：Ready started server on 0.0.0.0:3000
```

按 `Ctrl+C` 停止，接下来用 PM2 管理。

---

## 六、数据导入（从其他服务器迁移）

### 6.1 从原服务器导出数据

在原服务器后台 `/admin/backup` 点击"创建备份"，下载生成的 JSON 文件（如 `backup-2026-09-01T10-13-21-324Z.json`）。

### 6.2 上传备份文件到新服务器

```bash
scp backup-2026-09-01T10-13-21-324Z.json root@新服务器IP:/opt/zuowen-website/backups/
```

### 6.3 通过后台恢复数据

1. 确保新服务器应用已启动（`pnpm start` 或 PM2）
2. 浏览器访问 `http://新服务器IP:3000/admin/deploy`
3. 在"恢复"区域选择上传的备份文件
4. 点击"恢复数据库"
5. 等待完成，检查数据是否完整

### 6.4 手动导入（备选方案）

如果后台恢复不可用，可写一个临时脚本导入：

```bash
cd /opt/zuowen-website
nano scripts/import-backup.js
```

```js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('backups/backup-xxx.json', 'utf8'));
  for (const [model, records] of Object.entries(data.data)) {
    const table = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
    if (!table) continue;
    await table.deleteMany();
    for (const record of records) {
      await table.create({ data: record });
    }
    console.log(`导入 ${model}: ${records.length} 条`);
  }
}
main().finally(() => prisma.$disconnect());
```

```bash
node scripts/import-backup.js
```

---

## 七、PM2 进程管理

### 7.1 创建 ecosystem 配置文件

```bash
cd /opt/zuowen-website
nano ecosystem.config.js
```

```js
module.exports = {
  apps: [{
    name: 'zuowen-website',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    cwd: '/opt/zuowen-website',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/opt/zuowen-website/logs/pm2-error.log',
    out_file: '/opt/zuowen-website/logs/pm2-out.log',
  }]
};
```

### 7.2 创建日志目录并启动

```bash
mkdir -p /opt/zuowen-website/logs
pm2 start ecosystem.config.js
pm2 save                    # 保存进程列表
pm2 startup                 # 设置开机自启（按提示执行输出的命令）
```

### 7.3 常用 PM2 命令

```bash
pm2 status                  # 查看状态
pm2 logs zuowen-website     # 查看实时日志
pm2 restart zuowen-website  # 重启
pm2 stop zuowen-website     # 停止
pm2 delete zuowen-website   # 删除
```

---

## 八、Nginx 反向代理配置

### 8.1 创建站点配置

```bash
nano /etc/nginx/sites-available/zuowen-website
```

```nginx
server {
    listen 80;
    server_name 你的域名 www.你的域名;

    # 上传文件大小限制
    client_max_body_size 50M;

    # gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8.2 启用配置

```bash
ln -s /etc/nginx/sites-available/zuowen-website /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default   # 删除默认站点
nginx -t                                 # 测试配置
systemctl reload nginx                   # 重载
```

### 8.3 验证

浏览器访问 `http://你的域名`，应能看到网站首页。

---

## 九、HTTPS（SSL 证书）配置

### 9.1 安装 Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 9.2 申请免费 SSL 证书

```bash
certbot --nginx -d 你的域名 -d www.你的域名
```

按提示输入邮箱、同意协议，Certbot 会自动修改 Nginx 配置并启用 HTTPS。

### 9.3 自动续期

Certbot 会自动添加定时任务，证书到期前自动续期。可手动测试：

```bash
certbot renew --dry-run
```

---

## 十、域名解析

在阿里云域名控制台添加解析：

| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| A | @ | 你的服务器IP | 10分钟 |
| A | www | 你的服务器IP | 10分钟 |

解析生效后（通常几分钟到几小时），即可通过域名访问。

---

## 十一、备份与恢复（生产环境）

### 11.1 自动备份脚本

```bash
mkdir -p /opt/backups
nano /opt/zuowen-website/scripts/auto-backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"

# 数据库备份
pg_dump -U zuowen -h localhost zuowen_website > $BACKUP_DIR/db_$DATE.sql

# 项目文件备份（排除 node_modules 和 .next）
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
  --exclude=node_modules --exclude=.next --exclude=backups \
  /opt/zuowen-website

# 保留最近 30 天的备份
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $DATE"
```

```bash
chmod +x /opt/zuowen-website/scripts/auto-backup.sh
```

### 11.2 添加定时任务

```bash
crontab -e
# 添加以下行（每天凌晨 3 点备份）
0 3 * * * /opt/zuowen-website/scripts/auto-backup.sh >> /opt/backups/backup.log 2>&1
```

### 11.3 后台备份功能

网站后台 `/admin/backup` 提供一键备份（JSON 格式），`/admin/deploy` 提供恢复功能，可直接在浏览器操作。

---

## 十二、更新部署流程

代码更新后，在服务器上执行：

```bash
cd /opt/zuowen-website
git pull                    # 或重新上传文件
pnpm install                # 如果有新依赖
npx prisma generate         # 如果 schema 有变化
npx prisma db push          # 如果 schema 有变化
pnpm build
pm2 restart zuowen-website
```

---

## 十三、常见问题排查

### 13.1 构建失败（内存不足）

```bash
# 增加 swap
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
```

### 13.2 数据库连接失败

```bash
# 检查 PostgreSQL 状态
systemctl status postgresql
# 检查 DATABASE_URL 是否正确
cat /opt/zuowen-website/.env | grep DATABASE_URL
# 测试连接
psql -U zuowen -h localhost -d zuowen_website
```

### 13.3 页面 502 Bad Gateway

```bash
# 检查 PM2 进程
pm2 status
pm2 logs zuowen-website --lines 50
# 检查端口
netstat -tlnp | grep 3000
```

### 13.4 静态资源 404

确保 Nginx 配置中 `proxy_pass` 指向正确，且 Next.js 已成功构建（存在 `.next` 目录）。

### 13.5 登录后 Session 丢失

检查 `NEXTAUTH_URL` 是否与实际访问域名一致（包括 http/https）。

### 13.6 上传文件大小限制

Nginx 配置中 `client_max_body_size` 已设为 50M，如需更大可修改后 `nginx -t && systemctl reload nginx`。

---

## 十四、部署检查清单

- [ ] 服务器安全组放行 80/443/22
- [ ] Node.js 20+ 已安装
- [ ] pnpm 已安装
- [ ] PostgreSQL 已安装并创建数据库
- [ ] Nginx 已安装
- [ ] PM2 已安装
- [ ] 项目文件已上传到 /opt/zuowen-website
- [ ] .env 文件已配置（DATABASE_URL / NEXTAUTH_SECRET / NEXTAUTH_URL）
- [ ] pnpm install 成功
- [ ] prisma generate 成功
- [ ] prisma db push 成功
- [ ] pnpm build 成功
- [ ] PM2 启动成功（pm2 status 显示 online）
- [ ] Nginx 反向代理配置正确
- [ ] 域名解析已生效
- [ ] HTTPS 证书已配置
- [ ] 后台 /admin 可正常登录
- [ ] 前台首页可正常访问
- [ ] 多语言切换正常
- [ ] 自动备份定时任务已配置
