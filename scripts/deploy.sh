#!/bin/bash
# ============================================================
# 左文科技企业官网 — 阿里云一键部署脚本
# 适用系统：Ubuntu 22.04 LTS
# 使用方法：
#   1. 将项目上传到 /opt/zuowen-website
#   2. chmod +x deploy.sh
#   3. sudo ./deploy.sh
# ============================================================

set -e

# ===== 配置项（请根据实际情况修改）=====
PROJECT_DIR="/opt/zuowen-website"
DOMAIN="your-domain.com"          # 替换为你的域名
DB_NAME="zuowen_website"
DB_USER="zuowen"
DB_PASS="ChangeMe_StrongPassword123"  # 替换为强密码
APP_PORT=3000
NODE_VERSION="20"

# ===== 颜色输出 =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ===== 0. 前置检查 =====
info "===== 0. 前置检查 ====="
[ "$(id -u)" -ne 0 ] && error "请使用 root 用户运行此脚本"
[ ! -d "$PROJECT_DIR" ] && error "项目目录不存在: $PROJECT_DIR，请先上传项目文件"
[ ! -f "$PROJECT_DIR/package.json" ] && error "项目目录中未找到 package.json"

# ===== 1. 系统更新 =====
info "===== 1. 系统更新 ====="
apt update && apt upgrade -y

# ===== 2. 安装 Node.js =====
info "===== 2. 安装 Node.js $NODE_VERSION ====="
if ! command -v node &> /dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt install -y nodejs
fi
node -v && npm -v

# ===== 3. 安装 pnpm =====
info "===== 3. 安装 pnpm ====="
if ! command -v pnpm &> /dev/null; then
  npm install -g pnpm
fi
pnpm -v

# ===== 4. 安装 PostgreSQL =====
info "===== 4. 安装 PostgreSQL ====="
if ! command -v psql &> /dev/null; then
  apt install -y postgresql postgresql-contrib
  systemctl start postgresql
  systemctl enable postgresql
fi

# 创建数据库和用户
info "创建数据库和用户..."
su - postgres -c "psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';\"" 2>/dev/null || warn "用户可能已存在"
su - postgres -c "psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER ENCODING 'UTF8';\"" 2>/dev/null || warn "数据库可能已存在"
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;\"" 2>/dev/null || true

# ===== 5. 安装 Nginx =====
info "===== 5. 安装 Nginx ====="
if ! command -v nginx &> /dev/null; then
  apt install -y nginx
  systemctl start nginx
  systemctl enable nginx
fi
nginx -v

# ===== 6. 安装 PM2 =====
info "===== 6. 安装 PM2 ====="
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi
pm2 -v

# ===== 7. 配置环境变量 =====
info "===== 7. 配置环境变量 ====="
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  cat > .env << EOF
# ===== 数据库 =====
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"

# ===== NextAuth =====
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="https://$DOMAIN"

# ===== 邮件服务（请自行配置）=====
SMTP_HOST=""
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER=""
SMTP_PASS=""
MAIL_FROM=""
MAIL_FROM_NAME="左文科技"

# ===== 百度翻译（请自行配置）=====
BAIDU_TRANSLATE_APPID=""
BAIDU_TRANSLATE_KEY=""

# ===== 火山翻译（请自行配置）=====
VOLCENGINE_ACCESS_KEY_ID=""
VOLCENGINE_SECRET_ACCESS_KEY=""
EOF
  info ".env 文件已生成，请编辑补充邮件和翻译配置"
else
  warn ".env 文件已存在，跳过生成"
fi

# ===== 8. 安装依赖 =====
info "===== 8. 安装项目依赖 ====="
cd "$PROJECT_DIR"
pnpm install

# ===== 9. 数据库初始化 =====
info "===== 9. 数据库初始化 ====="
npx prisma generate
npx prisma db push

# 初始化管理员（如果有 seed 脚本）
if [ -f prisma/seed.ts ]; then
  info "执行数据库种子数据..."
  npx tsx prisma/seed.ts || warn "seed 执行失败，请手动检查"
fi

# ===== 10. 构建生产版本 =====
info "===== 10. 构建生产版本 ====="
# 如果内存不足，自动增加 swap
if [ $(free -m | awk '/^Mem:/{print $2}') -lt 4096 ]; then
  warn "内存不足 4GB，自动增加 4GB swap..."
  if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi

pnpm build

# ===== 11. PM2 启动 =====
info "===== 11. PM2 进程管理 ====="
mkdir -p "$PROJECT_DIR/logs"

cat > "$PROJECT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'zuowen-website',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p $APP_PORT',
    cwd: '$PROJECT_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production' },
    error_file: '$PROJECT_DIR/logs/pm2-error.log',
    out_file: '$PROJECT_DIR/logs/pm2-out.log',
  }]
};
EOF

pm2 delete zuowen-website 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true
info "PM2 已配置开机自启"

# ===== 12. Nginx 反向代理 =====
info "===== 12. Nginx 反向代理配置 ====="
cat > /etc/nginx/sites-available/zuowen-website << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    client_max_body_size 50M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/zuowen-website /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
info "Nginx 配置完成"

# ===== 13. 自动备份脚本 =====
info "===== 13. 配置自动备份 ====="
mkdir -p /opt/backups
cat > /opt/zuowen-website/scripts/auto-backup.sh << 'BACKUP_EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
PROJECT_DIR="/opt/zuowen-website"

# 数据库备份
pg_dump -U zuowen -h localhost zuowen_website > $BACKUP_DIR/db_$DATE.sql 2>/dev/null

# 项目文件备份
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
  --exclude=node_modules --exclude=.next --exclude=backups --exclude=项目备份 \
  -C /opt zuowen-website 2>/dev/null

# 保留最近 30 天
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete 2>/dev/null
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete 2>/dev/null

echo "[$(date)] 备份完成: $DATE" >> $BACKUP_DIR/backup.log
BACKUP_EOF
chmod +x /opt/zuowen-website/scripts/auto-backup.sh

# 添加定时任务（每天凌晨3点）
(crontab -l 2>/dev/null | grep -v auto-backup; echo "0 3 * * * /opt/zuowen-website/scripts/auto-backup.sh") | crontab -
info "自动备份已配置（每天凌晨3点）"

# ===== 14. 防火墙 =====
info "===== 14. 防火墙配置 ====="
if command -v ufw &> /dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable || warn "防火墙启用失败，请手动配置"
fi

# ===== 15. 验证 =====
info "===== 15. 部署验证 ====="
sleep 3

# 检查 PM2 状态
pm2 status | grep zuowen-website

# 检查端口
if netstat -tlnp 2>/dev/null | grep -q ":$APP_PORT"; then
  info "应用端口 $APP_PORT 正常监听"
else
  warn "应用端口未监听，请检查日志: pm2 logs zuowen-website"
fi

# 检查 Nginx
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
  info "Nginx 正常响应"
else
  warn "Nginx 响应异常，请检查配置"
fi

echo ""
echo "============================================================"
info "部署完成！"
echo ""
echo "后续步骤："
echo "  1. 编辑 $PROJECT_DIR/.env 补充邮件和翻译 API 配置"
echo "  2. 配置域名解析 A 记录指向本服务器 IP"
echo "  3. 申请 HTTPS 证书: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "  4. 访问 https://$DOMAIN 验证网站"
echo "  5. 访问 https://$DOMAIN/admin 登录后台"
echo ""
echo "常用命令："
echo "  pm2 status              # 查看应用状态"
echo "  pm2 logs zuowen-website # 查看日志"
echo "  pm2 restart zuowen-website # 重启应用"
echo "  systemctl status nginx  # 查看 Nginx 状态"
echo "============================================================"
