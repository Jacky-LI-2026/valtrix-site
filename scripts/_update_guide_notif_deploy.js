const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "docs", "使用文档.md");
let text = fs.readFileSync(file, "utf8");

// ========== 1. 目录：插入"通知中心"，后续编号顺延 ==========
const tocOld = `13. [系统部署与更新](#系统部署与更新)
14. [性能优化](#性能优化)
15. [服务器安全配置](#服务器安全配置)`;
const tocNew = `13. [系统部署与更新](#系统部署与更新)
14. [通知中心](#通知中心)
15. [性能优化](#性能优化)
16. [服务器安全配置](#服务器安全配置)`;
if (text.includes(tocOld)) {
  text = text.replace(tocOld, tocNew);
  console.log("✓ 目录已插入「通知中心」");
} else {
  console.log("⚠ 目录模式未匹配，跳过目录更新");
}

// ========== 2. 在"上传部署方式"注意事项后追加"生成一键部署压缩包"小节 ==========
const deployPkgAnchor = `**注意事项**：
- 上传部署会覆盖服务器上的代码文件
- 部署前建议先备份数据
- 大文件上传可能需要较长时间
- 部署过程中请勿关闭页面`;
const deployPkgSection = deployPkgAnchor + `

#### 生成一键部署压缩包

> 2026-09-02 上线。一键打包当前项目代码 + 自动安装脚本 + 配置模板，下载后可在任意服务器离线部署。

**入口**：系统部署 → 一键部署 → 「一键部署压缩包」区块

**使用步骤**：
1. 点击「生成一键部署压缩包」按钮
2. 系统自动打包（约 1-2 分钟，包体可能较大）：
   - 全部项目源码（app / components / lib / prisma / public 等）
   - 一键安装脚本 install.sh
   - 环境变量模板 .env.example（不含真实密钥）
   - 部署说明 README-DEPLOY.md
3. 生成成功后自动挂载文件路径，可：
   - 点击「复制路径」复制服务器端文件路径
   - 点击「下载压缩包」下载到本地
4. 将压缩包上传到服务器后部署：

\`\`\`bash
cd /tmp && unzip -o zuowen-deploy-*.zip -d zuowen-deploy
cd zuowen-deploy && cp .env.example .env && vi .env   # 填写数据库密码等
bash install.sh /var/www/zuowen                          # 一键部署
\`\`\`

**打包自动排除**（不进入压缩包）：node_modules、.next、.git、备份包、.env / .env.local（真实密钥）、日志文件等。

**适用场景**：服务器无法访问外网 Git、需要离线交付部署包、或跨机器迁移项目。`;
if (text.includes(deployPkgAnchor)) {
  text = text.replace(deployPkgAnchor, deployPkgSection);
  console.log("✓ 已插入「生成一键部署压缩包」小节");
} else {
  console.log("⚠ 上传部署注意事项锚点未匹配，跳过压缩包小节");
}

// ========== 3. 在"性能优化"前插入"通知中心"章节 ==========
const perfAnchor = `---

## 性能优化`;
const notifSection = `---

## 通知中心

> 2026-09-02 上线。顶部铃铛与通知历史页聚合留言、采集、系统等真实业务事件，点击可直达对应处理页面。

### 入口

- 顶部右侧铃铛图标：快速查看最近通知
- 侧边栏「通知中心」：进入通知历史页

### 通知类型

| 类型 | 来源 | 点击直达 |
|------|------|----------|
| 留言 | 客户在线留言 | 留言线索（/admin/leads） |
| 采集 | 自动采集任务 / 采集日志 | 数据采集（/admin/collection） |
| 系统 | 系统版本 / 操作记录 | 系统更新 / 操作日志 |

### 顶部铃铛

- 红点数字 = 未处理通知数（待处理留言、失败采集等）
- 点击铃铛展开最近通知，点击单条直达对应页面并标记已读
- 「全部已读」标记当前列表为已读
- 底部「查看全部通知」进入通知历史页

### 通知历史页

- 展示全部通知（最多 100 条），按时间倒序
- 筛选：全部 / 未读 / 留言 / 采集 / 系统，各带计数
- 每条通知显示类型徽章、时间、内容，点击直达处理
- 「全部已读」一键标记

### 已读机制

- 留言、采集失败的「未读」由业务状态驱动：留言处理完成（status 改为已联系/关闭）、采集恢复正常后自动消除
- 系统信息型通知支持本地标记已读（同一浏览器内跨页面同步）
- 刷新后已读状态保留（localStorage）

`;
if (text.includes(perfAnchor)) {
  text = text.replace(perfAnchor, notifSection + "---\n\n" + "## 性能优化");
  console.log("✓ 已插入「通知中心」章节");
} else {
  console.log("⚠ 性能优化锚点未匹配，跳过通知中心章节");
}

fs.writeFileSync(file, text, "utf8");
console.log("完成，文件大小:", Buffer.byteLength(text), "bytes");
