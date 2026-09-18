#!/bin/bash
# ============================================================
# 左文科技企业官网 - 服务器资源监控脚本（Linux 生产环境）
# 监控 CPU / 内存 / 磁盘 / 负载 / 进程 / 服务健康，达到阈值时告警
# 建议 crontab 每 5 分钟执行：
#   crontab -e 加入：
#   */5 * * * * /bin/bash /var/www/zuowen/scripts/monitor.sh
# ============================================================

PROJECT_DIR="/var/www/zuowen"
ALERT_FILE="/tmp/zuowen-alert-sent"   # 防止重复告警的标记文件
ALERT_COOLDOWN=1800                   # 告警冷却（秒），避免刷屏
# 告警渠道：可替换为钉钉/企业微信/飞书 webhook（示例为飞书）
ALERT_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/你的WEBHOOK"
LOG_FILE="/var/log/zuowen-monitor.log"

now=$(date '+%Y-%m-%d %H:%M:%S')

# ---------- 阈值配置（按服务器规格调整） ----------
CPU_THRESHOLD=85        # CPU 使用率 % 告警阈值
MEM_THRESHOLD=85        # 内存使用率 % 告警阈值
DISK_THRESHOLD=80       # 磁盘使用率 % 告警阈值
LOAD_THRESHOLD=4        # 1分钟负载（核数）告警阈值

send_alert() {
    local msg="$1"
    echo "$now [ALERT] $msg" >> "$LOG_FILE"
    # 冷却去重
    if [ -f "$ALERT_FILE" ]; then
        local age=$(( $(date +%s) - $(stat -c %Y "$ALERT_FILE") ))
        [ $age -lt $ALERT_COOLDOWN ] && return
    fi
    touch "$ALERT_FILE"
    # 发送到飞书（无 webhook 时仅记录日志）
    if [ "$ALERT_WEBHOOK" != "https://open.feishu.cn/open-apis/bot/v2/hook/你的WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" -H 'Content-Type: application/json' \
            -d "{\"msg_type\":\"text\",\"content\":{\"text\":\"[左文官网告警] $now\\n$msg\"}}" >/dev/null 2>&1
    fi
}

echo "$now [INFO] 开始监控" >> "$LOG_FILE"

# 1. CPU 使用率
cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
cpu=${cpu%.*}
[ -z "$cpu" ] && cpu=0
if [ "$cpu" -gt "$CPU_THRESHOLD" ]; then
    send_alert "CPU 使用率过高: ${cpu}% (阈值 ${CPU_THRESHOLD}%)"
fi

# 2. 内存使用率
mem=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
if [ "$mem" -gt "$MEM_THRESHOLD" ]; then
    send_alert "内存使用率过高: ${mem}% (阈值 ${MEM_THRESHOLD}%)"
fi

# 3. 磁盘使用率（根分区）
disk=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$disk" -gt "$DISK_THRESHOLD" ]; then
    send_alert "磁盘使用率过高: ${disk}% (阈值 ${DISK_THRESHOLD}%)"
fi

# 4. 系统负载
load=$(cat /proc/loadavg | awk '{print $1}')
load_int=${load%.*}
if [ "$load_int" -ge "$LOAD_THRESHOLD" ]; then
    send_alert "系统负载过高: ${load} (阈值 ${LOAD_THRESHOLD})"
fi

# 5. 服务健康（Next.js 端口 3000）
if ! curl -sf -o /dev/null --max-time 10 http://localhost:3000; then
    send_alert "网站服务不可访问 (http://localhost:3000 无响应)！"
    # 可选：自动重启（生产环境谨慎使用，建议仅记录告警人工处理）
    # cd "$PROJECT_DIR" && pm2 restart zuowen-website
fi

# 6. 进程占用 TOP5（写入日志，不告警）
echo "$now [INFO] CPU TOP5:" >> "$LOG_FILE"
ps aux --sort=-%cpu | head -6 | tail -5 >> "$LOG_FILE"

# 7. 每分钟资源概况记录（便于回溯）
echo "$now [INFO] CPU=${cpu}% MEM=${mem}% DISK=${disk}% LOAD=${load}" >> "$LOG_FILE"

echo "$now [INFO] 监控完成" >> "$LOG_FILE"
