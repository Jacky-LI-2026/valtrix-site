const fs = require('fs');

const guidePath = 'docs/使用文档.md';
let content = '';
try {
  content = fs.readFileSync(guidePath, 'utf8');
} catch (e) {
  content = '# 使用文档\n\n';
}

const newSection = `

---

## 系统部署与更新

### 一键部署（部署到远程服务器）

**入口**：后台 → 系统部署 → 一键部署（/admin/deploy）

**用途**：将当前网站代码部署到远程服务器（如阿里云、腾讯云等），适用于生产环境发布。

**前置条件**：
1. 在「服务器管理」中添加目标服务器（IP、端口、用户名、密码或私钥、部署路径）
2. 确保远程服务器已安装 Node.js 18+、pnpm、PostgreSQL
3. 确保远程服务器防火墙开放 3000 端口（或配置 Nginx 反向代理）

**使用步骤**：
1. 进入「一键部署」页面
2. 在服务器列表中选择目标服务器
3. 点击「一键备份」先备份当前数据（数据库+文件）
4. 点击「开始部署」，系统自动执行以下步骤：
   - 备份远程服务器数据
   - 上传代码文件
   - 安装依赖（pnpm install）
   - 数据库迁移（prisma db push）
   - 构建项目（pnpm build）
   - 重启服务（PM2）
   - 验证部署结果
5. 部署过程中可查看实时日志，预计 1-2 分钟

**注意事项**：
- 部署过程中网站可能短暂不可用
- 部署失败会自动回滚到上一版本
- 生产环境建议先在测试服务器验证

### 系统更新（代码版本升级）

**入口**：后台 → 系统部署 → 系统更新（/admin/system-update）

**用途**：升级系统代码版本，支持上传升级包或在线升级。

**升级包格式**：
- .zip 压缩包，内含 manifest.json 和需要更新的文件
- manifest.json 格式：
\`\`\`json
{
  "version": "1.1.0",
  "releaseNotes": "更新说明",
  "files": ["app/page.tsx", "components/..."],
  "migration": "scripts/migrate.js"
}
\`\`\`

**方式一：上传升级包**
1. 进入「系统更新」页面
2. 点击「选择升级包」，上传 .zip 文件
3. 系统自动校验 manifest.json
4. 升级前自动备份数据库到 backups/pre-upgrade-*.json
5. 按文件列表覆盖代码（自动跳过 node_modules、.env、uploads、backups 等保护目录）
6. 如有迁移脚本则自动执行
7. 更新版本记录和升级日志
8. **重启服务使改动生效**

**方式二：在线升级**
1. 在 .env.local 中配置 UPDATE_SERVER_URL（远程更新服务器地址）
2. 点击「检查更新」，系统连接远程服务器获取最新版本
3. 如发现新版本，显示更新说明和下载地址
4. 点击「在线升级」，自动下载并执行升级流程

**升级包制作**：
\`\`\`bash
node scripts/make-upgrade-package.js <版本号> <文件列表...>
# 示例
node scripts/make-upgrade-package.js 1.1.0 app/page.tsx components/sections/Products.tsx
\`\`\`
生成的升级包在 backups/ 目录下。

**回滚方法**：
1. 升级前自动备份的数据库文件在 backups/pre-upgrade-*.json
2. 代码文件可从 Git 或备份恢复
3. 恢复数据库：使用「一键部署」页面的「恢复」功能

### 备份与恢复

**一键备份**（/admin/deploy）：
- 备份内容：PostgreSQL 数据库（.dump）+ 项目文件（.zip）
- 备份位置：backups/ 目录
- 可下载到本地保存

**恢复**：
- 选择备份文件，点击「恢复」
- 恢复前自动备份当前状态
- 数据库恢复和文件恢复分别进行

### 两者区别

| 功能 | 一键部署 | 系统更新 |
|------|----------|----------|
| 用途 | 部署到远程服务器 | 本地代码版本升级 |
| 操作对象 | 远程服务器 | 当前运行环境 |
| 代码来源 | 当前本地代码 | 升级包/远程更新 |
| 数据备份 | 备份远程服务器数据 | 升级前自动备份本地数据库 |
| 适用场景 | 生产环境发布 | 功能更新、Bug修复 |
`;

fs.writeFileSync(guidePath, content + newSection, 'utf8');
console.log('使用说明书已更新，添加了系统部署与更新章节');
