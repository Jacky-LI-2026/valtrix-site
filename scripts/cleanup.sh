#!/bin/bash
# ============================================================
# 左文科技企业官网 - 日志与临时文件清理脚本（Linux 生产环境）
# 建议通过 crontab 每天执行：
#   crontab -e 加入：
#   0 3 * * * /bin/bash /var/www/zuowen/scripts/cleanup.sh >> /var/log/zuowen-cleanup.log 2>&1
# ============================================================

# 项目根目录（按实际部署路径修改）
PROJECT_DIR="/var/www/zuowen"
# 日志保留天数
KEEP_DAYS=14
# 临时文件保留天数
TMP_KEEP_DAYS=3
# 备份保留份数（升级备份/完整备份只保留最近 N 份）
KEEP_BACKUPS=10

echo "===== 清理开始 $(date '+%Y-%m-%d %H:%M:%S') ====="

# 1. Next.js 构建缓存与运行时缓存
rm -rf "$PROJECT_DIR/.next/cache" 2>/dev/null
echo "[OK] 已清理 .next/cache"

# 2. 项目日志（dev_server.log 等）
find "$PROJECT_DIR" -maxdepth 2 -name "*.log" -mtime +$KEEP_DAYS -delete 2>/dev/null
echo "[OK] 已删除 $KEEP_DAYS 天前的 *.log"

# 3. 系统 Nginx 日志（日志轮转交给 logrotate 更专业，这里兜底）
find /var/log/nginx -name "*.log" -mtime +$KEEP_DAYS -delete 2>/dev/null
echo "[OK] 已清理 $KEEP_DAYS 天前的 Nginx 日志"

# 4. PM2 日志（保留 20MB 上限由 pm2 配置控制，这里按天清理）
pm2 flush >/dev/null 2>&1 && echo "[OK] PM2 日志已刷新"

# 5. 临时文件
find /tmp -name "deploy-*.zip" -mtime +$TMP_KEEP_DAYS -delete 2>/dev/null
find /tmp -name "deploy-package.zip" -delete 2>/dev/null
find "$PROJECT_DIR/tmp" -type f -mtime +$TMP_KEEP_DAYS -delete 2>/dev/null
rm -rf "$PROJECT_DIR/tmp/deploy-uploads"/* 2>/dev/null
echo "[OK] 已清理临时文件"

# 6. 数据库备份只保留最近 N 份（backups 目录）
cd "$PROJECT_DIR/backups" 2>/dev/null && {
  ls -t full_backup_*.zip 2>/dev/null | tail -n +$((KEEP_BACKUPS+1)) | xargs -r rm -f
  ls -t backup-*.json 2>/dev/null | tail -n +$((KEEP_BACKUPS*3)) | xargs -r rm -f
  ls -t pre-upgrade-*.json 2>/dev/null | tail -n +$((KEEP_BACKUPS*3)) | xargs -r rm -f
  echo "[OK] 备份已清理，保留最近 $KEEP_BACKUPS 份"
}

# 7. 清理 npm/pnpm 缓存（可选，能释放大量空间，但会拖慢下次安装）
# npm cache clean --force 2>/dev/null

echo "===== 清理完成 $(date '+%Y-%m-%d %H:%M:%S') ====="
