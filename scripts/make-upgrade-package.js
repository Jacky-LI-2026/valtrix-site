/**
 * 升级包制作脚本
 * 用法: node scripts/make-upgrade-package.js <版本号> <文件列表...>
 * 示例: node scripts/make-upgrade-package.js 1.1.0 app/page.tsx components/sections/Products.tsx
 * 
 * 会在 backups/ 目录下生成 upgrade-<版本号>-<时间戳>.zip
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const version = process.argv[2];
const files = process.argv.slice(3);

if (!version || files.length === 0) {
  console.log('用法: node scripts/make-upgrade-package.js <版本号> <文件列表...>');
  console.log('示例: node scripts/make-upgrade-package.js 1.1.0 app/page.tsx components/sections/Products.tsx');
  process.exit(1);
}

const projectRoot = process.cwd();
const tempDir = path.join(projectRoot, 'backups', `upgrade-package-${Date.now()}`);
fs.mkdirSync(tempDir, { recursive: true });

// 验证文件存在并复制
const validFiles = [];
for (const file of files) {
  const src = path.join(projectRoot, file);
  if (!fs.existsSync(src)) {
    console.warn(`警告: 文件不存在，跳过: ${file}`);
    continue;
  }
  const dest = path.join(tempDir, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  validFiles.push(file);
  console.log(`已添加: ${file}`);
}

if (validFiles.length === 0) {
  console.error('没有有效文件');
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}

// 生成 manifest.json
const manifest = {
  version,
  releaseNotes: `升级到 v${version}`,
  files: validFiles,
  createdAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`已生成 manifest.json (${validFiles.length} 个文件)`);

// 打包为 zip
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const zipName = `upgrade-v${version}-${timestamp}.zip`;
const zipPath = path.join(projectRoot, 'backups', zipName);

try {
  execSync(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipPath}' -Force"`, {
    stdio: 'inherit',
  });
  console.log(`\n升级包已生成: ${zipPath}`);
  console.log(`版本: v${version}`);
  console.log(`文件数: ${validFiles.length}`);
} catch (e) {
  console.error('打包失败:', e.message);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
