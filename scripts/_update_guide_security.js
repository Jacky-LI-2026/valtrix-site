const fs = require('fs');

const guidePath = 'docs/使用文档.md';
let content = fs.readFileSync(guidePath, 'utf8');

// 如果已有安全章节则跳过
if (content.includes('## 服务器安全配置')) {
  console.log('已有服务器安全配置章节，跳过');
  process.exit(0);
}

const newSection = `

---

## 服务器安全配置

> 适用：生产服务器（阿里云 ECS / 腾讯云等 Linux 服务器）。**部署上线前务必完成**。

### 1. SSH 密钥登录，禁用密码登录

SSH 密钥比密码更安全，密钥不可暴力破解。

**本机生成密钥对**（Windows PowerShell）：
\`\`\`powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
# 一路回车，会生成 ~/.ssh/id_ed25519（私钥）和 id_ed25519.pub（公钥）
\`\`\`

**上传公钥到服务器**：
\`\`\`bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@你的服务器IP
# 或手动：把 id_ed25519.pub 内容追加到服务器 ~/.ssh/authorized_keys
\`\`\`

**禁用密码登录**（编辑服务器 \`/etc/ssh/sshd_config\`）：
\`\`\`ini
PasswordAuthentication no
PubkeyAuthentication yes
\`\`\`
保存后重启 SSH：\`systemctl restart sshd\`

> ⚠️ 确认密钥能正常登录后，再执行"禁用密码登录"这一步，防止把自己锁在门外。

### 2. 修改 SSH 默认端口（22 → 其他端口）

修改 \`/etc/ssh/sshd_config\`：
\`\`\`ini
Port 22022
\`\`\`
保存后重启 SSH，之后登录需指定端口：
\`\`\`bash
ssh -p 22022 root@你的服务器IP
\`\`\`
**记得同步更新防火墙放行新端口，并关闭 22 端口。**

### 3. 配置防火墙（ufw），只开放必要端口

以 Ubuntu 为例（ufw）：
\`\`\`bash
# 安装并启用
apt install ufw -y
ufw default deny incoming
ufw default allow outgoing

# 放行必要端口
ufw allow 22022/tcp        # SSH（你修改后的端口）
ufw allow 80/tcp            # HTTP
ufw allow 443/tcp           # HTTPS
ufw allow 3000/tcp          # 如果 Next.js 直连（建议用 Nginx 反代则不需要开）

# 启用
ufw enable
ufw status
\`\`\`

> 安全原则：**只开放对外服务需要的端口**，数据库（5432）、管理后台等不对外网开放（仅内网/白名单）。

### 4. 启用自动安全更新

**Ubuntu/Debian**：
\`\`\`bash
apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades
# 选择"是"，自动安装安全更新
\`\`\`

**CentOS/Rocky**：
\`\`\`bash
dnf install dnf-automatic -y
systemctl enable --now dnf-automatic.timer
\`\`\`

### 5. 配置 SSL 证书（Let's Encrypt 免费证书）

使用 certbot 自动申请并续期：
\`\`\`bash
# 安装 certbot + Nginx 插件
apt install certbot python3-certbot-nginx -y

# 自动申请证书并配置 Nginx HTTPS
certbot --nginx -d example.com -d www.example.com

# 测试自动续期（Let's Encrypt 证书 90 天有效）
certbot renew --dry-run
\`\`\`
申请成功后，Nginx 会自动配置 HTTPS 跳转，无需手动管理证书（自动续期）。

### 6. 定期备份数据库和重要文件

- 后台「一键部署」页面的**一键备份**可手动备份（数据库 .dump + 项目文件 .zip）。
- 建议**每日自动备份**到异地/对象存储（OSS）：
  - Linux：crontab 每日执行备份脚本（参考 \`scripts/cleanup.sh\` 所在项目备份逻辑）
  - 数据库：\`pg_dump\` 每日导出；文件：打包关键目录
  - 备份上传到阿里云 OSS / 腾讯云 COS，防止服务器硬盘故障丢数据
- 升级前系统会自动备份（backups/pre-upgrade-*.json），可作为回滚点。

### 7. 配置日志监控和告警

- 服务器资源监控：\`scripts/monitor.sh\`（CPU/内存/磁盘/服务健康，超阈值飞书告警），见「性能优化」章节。
- 系统登录日志：\`journalctl -u ssh\` 或 \`/var/log/auth.log\`，定期检查异常登录。
- 建议接入云厂商云监控（阿里云云监控 / 腾讯云云监控），配置 CPU/内存/带宽告警。
- 重要文件访问监控（可选）：\`auditd\` 审计，记录敏感文件操作。

### 8. 安全部署检查清单

- [ ] SSH 密钥登录已启用，密码登录已禁用
- [ ] SSH 端口已修改（非 22）
- [ ] 防火墙只开放必要端口（22xx/80/443）
- [ ] 自动安全更新已启用
- [ ] HTTPS 已配置（Let's Encrypt 证书）
- [ ] 数据库每日自动备份到异地
- [ ] 资源监控与日志告警已配置
- [ ] 后台管理密码为强密码（大小写+数字+符号）
- [ ] .env 文件包含数据库密码，切勿提交到代码仓库
`;

fs.writeFileSync(guidePath, content + newSection, 'utf8');
console.log('使用说明书已追加「服务器安全配置」章节');
