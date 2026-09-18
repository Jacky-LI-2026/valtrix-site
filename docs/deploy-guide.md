# 左文科技网站 - 部署文档

## 目录
1. [环境要求](#环境要求)
2. [本地开发部署](#本地开发部署)
3. [生产环境部署](#生产环境部署)
4. [阿里云部署](#阿里云部署)
5. [美国服务器镜像部署](#美国服务器镜像部署)
6. [数据库配置](#数据库配置)
7. [环境变量配置](#环境变量配置)
8. [Nginx反向代理配置](#nginx反向代理配置)
9. [SSL证书配置](#ssl证书配置)
10. [系统更新与维护](#系统更新与维护)
11. [备份与恢复](#备份与恢复)
12. [常见问题](#常见问题)

---

## 环境要求

### 硬件要求
- **最低配置**: 2核CPU、4GB内存、40GB硬盘
- **推荐配置**: 4核CPU、8GB内存、100GB SSD硬盘
- **生产环境**: 8核CPU、16GB内存、200GB SSD硬盘

### 软件要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **Node.js**: 18.x 或更高版本（推荐20.x）
- **PostgreSQL**: 14.x 或更高版本（推荐16.x/17.x）
- **Nginx**: 1.18+ （生产环境反向代理）
- **PM2**: 5.x （Node.js进程管理，可选）
- **Git**: 2.x （代码版本管理）

---

## 本地开发部署

### 1. 克隆代码
```bash
git clone <仓库地址>
cd 左文科技网站及后台
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
复制 `.env.example` 为 `.env`，并修改配置：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 数据库配置
DATABASE_URL="postgresql://postgres:password@localhost:5432/zuowen_admin?schema=public"

# NextAuth配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# 高德地图API密钥
NEXT_PUBLIC_AMAP_KEY="your-amap-api-key"

# 大模型API配置（可选）
OPENAI_API_KEY="your-openai-api-key"
OPENAI_API_URL="https://api.openai.com/v1/chat/completions"
OPENAI_MODEL="gpt-3.5-turbo"
```

### 4. 初始化数据库
```bash
# 生成Prisma客户端
npx prisma generate

# 推送数据库schema
npx prisma db push

# （可选）运行数据库迁移
npx prisma migrate deploy
```

### 5. 启动开发服务器
```bash
npm run dev
```

访问: http://localhost:3000
后台管理: http://localhost:3000/admin

### 6. 创建管理员账号
首次访问后台登录页面，点击"注册"创建管理员账号，或通过数据库直接插入：
```sql
INSERT INTO users (username, password, displayName, roles, status)
VALUES ('admin', 'hashed-password', '系统管理员', '["admin"]', 'active');
```

---

## 生产环境部署

### 1. 构建生产版本
```bash
# 安装依赖
npm install

# 构建
npm run build
```

### 2. 启动生产服务器
```bash
# 方式1: 直接启动
npm start

# 方式2: 使用PM2（推荐）
npm install -g pm2
pm2 start npm --name "zuowen-website" -- start
pm2 save
pm2 startup
```

### 3. 验证部署
```bash
# 检查服务状态
pm2 status

# 查看日志
pm2 logs zuowen-website

# 测试访问
curl http://localhost:3000
```

---

## 阿里云部署

### 1. 购买云服务器
- **推荐配置**: 阿里云ECS，4核8GB，100GB SSD
- **操作系统**: Ubuntu 22.04 LTS
- **地域**: 华东1（杭州）或华南1（深圳）
- **带宽**: 5Mbps或更高

### 2. 服务器环境配置
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# 安装Nginx
sudo apt install -y nginx

# 安装PM2
sudo npm install -g pm2

# 安装Git
sudo apt install -y git
```

### 3. 数据库配置
```bash
# 切换到postgres用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE zuowen_admin;
CREATE USER zuowen WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE zuowen_admin TO zuowen;
\q

# 修改PostgreSQL配置（允许远程访问，如需要）
sudo nano /etc/postgresql/16/main/postgresql.conf
# listen_addresses = '*'

sudo nano /etc/postgresql/16/main/pg_hba.conf
# host all all 0.0.0.0/0 md5

sudo systemctl restart postgresql
```

### 4. 部署应用
```bash
# 创建应用目录
sudo mkdir -p /var/www/zuowen
sudo chown $USER:$USER /var/www/zuowen

# 克隆代码
cd /var/www/zuowen
git clone <仓库地址> .

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
nano .env
# 修改DATABASE_URL、NEXTAUTH_SECRET等

# 初始化数据库
npx prisma generate
npx prisma db push

# 构建
npm run build

# 使用PM2启动
pm2 start npm --name "zuowen-website" -- start
pm2 save
pm2 startup
```

### 5. 配置Nginx反向代理
```bash
sudo nano /etc/nginx/sites-available/zuowen
```

配置内容:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
        proxy_cache_use_stale error timeout invalid_header updating;
    }

    # 上传文件大小限制
    client_max_body_size 50M;
}
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/zuowen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. 配置SSL证书（Let's Encrypt）
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 7. 配置阿里云安全组
在阿里云控制台开放以下端口:
- 80 (HTTP)
- 443 (HTTPS)
- 22 (SSH，建议限制IP)
- 5432 (PostgreSQL，仅内网或限制IP)

---

## 美国服务器镜像部署

### 1. 选择服务器提供商
推荐:
- **DigitalOcean**: 简单易用，性价比高
- **Vultr**: 全球节点多
- **AWS EC2**: 功能强大，适合大规模
- **Google Cloud**: 全球网络好

### 2. 推荐配置
- **位置**: 美国西海岸（洛杉矶/旧金山）或东海岸（纽约）
- **配置**: 4核8GB，100GB SSD
- **系统**: Ubuntu 22.04 LTS
- **带宽**: 5Mbps或按流量计费

### 3. 部署步骤
与阿里云部署基本相同，参考[阿里云部署](#阿里云部署)章节。

### 4. 中美服务器镜像同步
如需在中美服务器之间同步数据:

#### 数据库同步
```bash
# 在主服务器导出数据库
pg_dump -h localhost -U zuowen -d zuowen_admin -F c -f backup.dump

# 传输到镜像服务器
scp backup.dump user@us-server:/tmp/

# 在镜像服务器恢复
pg_restore -h localhost -U zuowen -d zuowen_admin -c /tmp/backup.dump
```

#### 文件同步
```bash
# 使用rsync同步上传文件
rsync -avz /var/www/zuowen/public/uploads/ user@us-server:/var/www/zuowen/public/uploads/
```

#### 定时同步（Cron）
```bash
# 编辑crontab
crontab -e

# 每小时同步一次
0 * * * * /path/to/sync-script.sh
```

### 5. DNS负载均衡（可选）
使用Cloudflare或AWS Route53配置地理DNS:
- 中国用户访问阿里云服务器
- 海外用户访问美国服务器

---

## 数据库配置

### 数据库表结构
主要数据表:
- `users` - 用户表
- `products` - 产品表
- `product_categories` - 产品分类表
- `news` - 新闻表
- `resources` - 资源表
- `industries` - 行业方案表
- `services` - 服务内容表
- `careers` - 招聘职位表
- `about_sections` - 关于我们内容块表
- `site_config` - 站点配置表
- `seo_config` - SEO配置表
- `languages` - 语种表
- `menu_items` - 菜单项表
- `ai_config` - AI配置表
- `collection_tasks` - 采集任务表
- `leads` - 留言线索表
- `operation_logs` - 操作日志表

### 数据库备份
```bash
# 手动备份
pg_dump -h localhost -U zuowen -d zuowen_admin -F c -f backup_$(date +%Y%m%d).dump

# 自动备份（Cron）
0 3 * * * pg_dump -h localhost -U zuowen -d zuowen_admin -F c -f /backup/$(date +\%Y\%m\%d).dump
```

### 数据库恢复
```bash
# 停止应用
pm2 stop zuowen-website

# 恢复数据库
pg_restore -h localhost -U zuowen -d zuowen_admin -c backup.dump

# 重启应用
pm2 start zuowen-website
```

---

## 环境变量配置

完整的 `.env` 配置说明:

```env
# ========== 数据库配置 ==========
DATABASE_URL="postgresql://username:password@localhost:5432/zuowen_admin?schema=public"

# ========== NextAuth配置 ==========
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-very-long-secret-key-at-least-32-chars"

# ========== 高德地图配置 ==========
NEXT_PUBLIC_AMAP_KEY="your-amap-api-key"
NEXT_PUBLIC_AMAP_SECURITY_CODE="your-amap-security-code"

# ========== 大模型AI配置（可选） ==========
OPENAI_API_KEY="your-openai-api-key"
OPENAI_API_URL="https://api.openai.com/v1/chat/completions"
OPENAI_MODEL="gpt-3.5-turbo"

# ========== 邮件配置（下载验证用，可选） ==========
SMTP_HOST="smtp.your-email.com"
SMTP_PORT="587"
SMTP_USER="your-email@your-domain.com"
SMTP_PASS="your-email-password"
SMTP_FROM="左文科技 <noreply@your-domain.com>"

# ========== 应用配置 ==========
NODE_ENV="production"
PORT="3000"
```

**生成NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

---

## Nginx反向代理配置

### 基础配置
参考[阿里云部署 - 配置Nginx反向代理](#5-配置nginx反向代理)

### 性能优化配置
```nginx
# Gzip压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

# 浏览器缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 安全头
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
```

---

## SSL证书配置

### Let's Encrypt（免费）
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 阿里云SSL证书
1. 在阿里云控制台申请免费SSL证书
2. 下载Nginx格式证书
3. 上传到服务器 `/etc/nginx/ssl/`
4. 修改Nginx配置:
```nginx
listen 443 ssl;
ssl_certificate /etc/nginx/ssl/your-domain.pem;
ssl_certificate_key /etc/nginx/ssl/your-domain.key;
```

### 自动续期（Let's Encrypt）
```bash
# 测试续期
sudo certbot renew --dry-run

# 自动续期（Cron，已默认安装）
sudo systemctl status certbot.timer
```

---

## 系统更新与维护

### 后台系统更新功能
1. 登录后台管理系统
2. 点击左侧"系统更新"菜单
3. 检查更新: 点击"检查更新"按钮
4. 下载更新: 如有新版本，点击"下载更新"
5. 安装更新: 下载完成后，点击"安装更新"
6. 更新完成后，系统自动重启

**注意**: 更新前请务必备份数据库和重要文件！

### 手动更新
```bash
# 进入应用目录
cd /var/www/zuowen

# 拉取最新代码
git pull

# 安装新依赖
npm install

# 数据库迁移
npx prisma generate
npx prisma db push

# 重新构建
npm run build

# 重启服务
pm2 restart zuowen-website
```

### 日常维护
```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs zuowen-website --lines 100

# 监控资源使用
pm2 monit

# 清理日志
pm2 flush

# 重启服务
pm2 restart zuowen-website

# 停止服务
pm2 stop zuowen-website
```

---

## 备份与恢复

### 自动备份脚本
创建 `/var/scripts/backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup"

# 数据库备份
pg_dump -h localhost -U zuowen -d zuowen_admin -F c -f $BACKUP_DIR/database_$DATE.dump

# 上传文件备份
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/zuowen/public/uploads

# 代码备份（可选）
cd /var/www/zuowen
tar -czf $BACKUP_DIR/code_$DATE.tar.gz --exclude=node_modules --exclude=.next .

# 清理7天前的备份
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $DATE"
```

设置定时备份:
```bash
chmod +x /var/scripts/backup.sh
crontab -e
# 每天凌晨3点备份
0 3 * * * /var/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### 一键恢复
```bash
#!/bin/bash
# restore.sh - 一键恢复脚本

BACKUP_FILE=$1
if [ -z "$BACKUP_FILE" ]; then
    echo "用法: ./restore.sh <备份文件路径>"
    exit 1
fi

# 停止服务
pm2 stop zuowen-website

# 恢复数据库
pg_restore -h localhost -U zuowen -d zuowen_admin -c $BACKUP_FILE

# 重启服务
pm2 start zuowen-website

echo "恢复完成"
```

---

## 常见问题

### Q: 部署后访问502错误？
A: 检查Node.js服务是否启动:
```bash
pm2 status
pm2 logs zuowen-website
```
确认端口3000是否在监听:
```bash
netstat -tlnp | grep 3000
```

### Q: 数据库连接失败？
A: 检查:
1. PostgreSQL服务是否启动: `sudo systemctl status postgresql`
2. `.env`中的`DATABASE_URL`是否正确
3. 数据库用户权限是否正确
4. 防火墙是否开放5432端口（仅内网）

### Q: 静态资源404？
A: 重新构建:
```bash
npm run build
pm2 restart zuowen-website
```

### Q: 上传文件大小限制？
A: 修改Nginx配置:
```nginx
client_max_body_size 50M;
```
同时检查Next.js配置（`next.config.js`）中的`bodyParser`大小限制。

### Q: 如何修改端口？
A: 修改 `.env`:
```env
PORT=3001
```
同时修改Nginx反向代理的`proxy_pass`端口。

### Q: 中美服务器数据不同步？
A: 配置定时同步脚本，参考[中美服务器镜像同步](#4-中美服务器镜像同步)章节。

### Q: SSL证书过期？
A: Let's Encrypt证书自动续期，检查:
```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

### Q: 如何查看访问日志？
A: 
```bash
# Nginx访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 应用日志
pm2 logs zuowen-website
```

---

## 技术支持

部署问题请联系技术支持团队。
- 邮箱: lizaiqiang@zuowentech.com
- 公司: 北京左文科技有限公司
