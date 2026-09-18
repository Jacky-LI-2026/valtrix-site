const fs = require('fs');

const guidePath = 'docs/使用文档.md';
let content = '';
try {
  content = fs.readFileSync(guidePath, 'utf8');
} catch (e) {
  content = '# 使用文档\n\n';
}

// 检查是否已经有上传部署的内容
if (content.includes('上传部署')) {
  console.log('使用说明书已有上传部署内容，跳过');
  process.exit(0);
}

const uploadSection = `

### 上传部署方式

**适用场景**：远程服务器没有配置 Git 仓库，或需要直接上传本地代码包部署。

**使用步骤**：
1. 进入「一键部署」页面
2. 选择目标服务器
3. 部署方式选择「上传部署」
4. 点击「选择文件」，上传本地 .zip 格式的代码包（最大 200MB）
5. 点击「开始上传部署」
6. 系统自动执行：
   - 上传代码包到服务器 /tmp 目录
   - 解压到部署目录
   - 安装依赖（pnpm install --prod）
   - 数据库同步（prisma db push）
   - 构建项目（pnpm build）
   - 重启服务（PM2 / systemd）
   - 健康检查

**代码包制作要求**：
- 必须是 .zip 格式
- 包含完整的项目代码（app/、components/、lib/、prisma/、public/、package.json 等）
- 不需要包含 node_modules、.next、.env 等文件
- 建议在本地执行 \`pnpm build\` 验证无误后再打包

**Git 拉取 vs 上传部署**：

| 对比项 | Git 拉取 | 上传部署 |
|--------|----------|----------|
| 代码来源 | 远程 Git 仓库 | 本地上传 .zip |
| 适用场景 | 服务器已配置 Git | 无 Git 仓库或临时部署 |
| 部署速度 | 快（只拉取差异） | 较慢（上传完整包） |
| 版本控制 | 自动记录 commit | 需手动管理版本 |
| 回滚 | git revert | 重新上传旧版本 |

**注意事项**：
- 上传部署会覆盖服务器上的代码文件
- 部署前建议先备份数据
- 大文件上传可能需要较长时间
- 部署过程中请勿关闭页面
`;

fs.writeFileSync(guidePath, content + uploadSection, 'utf8');
console.log('使用说明书已更新，添加了上传部署说明');
