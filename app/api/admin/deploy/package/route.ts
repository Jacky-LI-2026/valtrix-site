import { NextRequest, NextResponse } from "next/server";
import { getBrandName } from '@/lib/brand';
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readdir, rm, writeFile, cp, access, stat } from "fs/promises";
import path from "path";
import fs from "fs";
import { auth } from "@/auth";

// ⛔ 排除规则**唯一真源** = `scripts/_deploy_fileset.js`（L1#坑26）。
//    同一份规则曾在此文件与那个模块各写一份，改一处≠改完，已造成 `.bak-*` 备份文件
//    被打进部署包的事故。此处**只允许**引用，不得再在本地另写排除正则/清单。
//    ⚠️ 路径说明：`scripts/` 整目录被排除（不进客户包），但本文件会随包交付且要在
//    **客户机上 `pnpm build`**，故第 "2a" 步会把被引用的这一个模块**单独带进包里**，
//    保持同一相对层级（`<包根>/scripts/_deploy_fileset.js`）。
import deployFileset from "../../../../../scripts/_deploy_fileset";

const execFileAsync = promisify(execFile);

/**
 * 排除规则唯一真源 = `scripts/_deploy_fileset.js`（L1#坑26）
 * ==========================================================================
 * 2026-09-16 重构：本文件原先自带 `EXCLUDE_DIRS` / `EXCLUDE_FILES` /
 * `EXCLUDE_PATTERNS` **三份**列表，与 `scripts/_deploy_fileset.js`（部署/核对/门禁
 * 共用的实现）各维护一份 —— 改一条规则要改两处。现三份列表**全部删除**，判据一律取自 A。
 *
 * ⚠️ 逐条语义差异（改造前本接口是「**根级条目名**」口径；A 是「**路径前缀**」+「文件名」口径）
 *   1) `PACKAGER_KEEP_PREFIXES` 豁免（**必须**，否则是功能回归，不是"更严"）：
 *      A 的 `SKIP_PATH_PREFIXES` 含 `public` / `docs` / `industry-packs`，而这三项在 A 的
 *      调用方（只遍历 `RUNTIME_ROOTS` 的服务端同步）里是**惰性条目**；本接口却是
 *      「整根 cp 的客户交付包」，三项都必须在包里：
 *        · `public/`         站点静态资源（本机 157 个文件，uploads 内是线上内容）
 *        · `industry-packs/` 运行时由 `lib/server/pack-manager.ts` 以 `process.cwd()` 读取
 *        · `docs/`           `install.sh` 与 README-DEPLOY 均引用 `docs/<nginx 配置>`
 *      ⇒ 显式豁免这三项；其余前缀规则 100% 交给 A，不再本地重写。
 *   2) 原 `EXCLUDE_DIRS` 的 `node_modules`/`.next`/`.git` → A 的 `HARD_SKIP_DIRS`；
 *      `backups`/`_backups`/`_pgsql`/`项目备份`/`tmp`/`logs`/`data`/`_local_backup`/
 *      `_archive`/`会话记录`/`scripts` → A 的 `isSkippedPath`（同为根锚定，语义一致）。
 *      ⚠️ 保留原加固理由（勿因"简化"而回退，G8）：这些目录含**生产库快照 / `.env` /
 *      RSA 私钥 / `config-keys/` 站点数据**，而第 2 步是「按根级条目整棵 cp」
 *      ⇒ 一旦漏排除，客户交付包里就会出现我们的私钥与密钥。其中 `scripts/` 另有约
 *      200 个开发/运维脚本，含**两台生产服务器 IP**、部署路径与 SSH 调用逻辑
 *      （`install.sh` 全流程 install → db push → build → pm2 **完全不依赖**它）
 *      ⇒ 整目录排除；**仅**允许第 "2a" 步单独携带 `_deploy_fileset.js` 这一个无敏感信息的模块。
 *   3) A 的 `SKIP_FILE_RE` **严格强于**原 `EXCLUDE_FILES` + `EXCLUDE_PATTERNS`：
 *      覆盖原有全部条目（`.env` / `.env.local` / 各 `*.log` / `*.tsbuildinfo` / `*.zip` /
 *      `*.dump` / `_db_backup.sql` / `*.bak(-*)`），并**新增**排除 `AGENTS.md`（内部规则
 *      文档，本不该外发）与 `*.tmp<N>` 临时文件 ⇒ 判定只会更严，绝不会比改造前宽松。
 *      注：根级 `.env.example`（若存在）也被 `^\.env.*` 排除，但第 3 步会**重新生成**一份
 *          干净模板写入包内 ⇒ 交付包内仍有 `.env.example`，净效果不变。
 *   4) 原 B 独有、A 未覆盖的条目保留在 `PACKAGER_EXTRA_EXCLUDES`（见其注释）。
 *      这些条目**若将来能上提到 A，应当上提**，否则仍是第二真源（本区块的红线）。
 *   5) **残留缺口（本次未改，行为与改造前一致）**：A 是**全树遍历**，能命中嵌套前缀
 *      （如 `lib/generated` = 本地 Windows 版 Prisma 引擎，A 明令必须排除）；本接口只判
 *      **根级条目**，`lib/` 是整棵照拷 ⇒ `lib/generated/**` 仍会进包（客户机 install.sh
 *      第 7 步会先 `npx prisma generate` 重新生成，故当前无实际故障）。
 *      ⇒ 引用 A 不等于 A 的全部规则都已生效，改这类规则时**不要**以为改 A 就够了。
 *
 * ⚠️ 判定范围：本接口**仍然只作用于根级条目**（与改造前完全一致：遍历深度既未放宽也
 *    未收紧）。嵌套路径的文件名判据（如 `lib/x.bak-2026`）不在本次范围，仍由第 "2c" 步的
 *    敏感文件终检兜底 —— 本次**未**改变该行为。
 */

/** 见上文差异 1)：客户交付包必须保留的根目录（A 的前缀表里有，但此处不能排除） */
const PACKAGER_KEEP_PREFIXES = new Set(["public", "docs", "industry-packs"]);

/** 见上文差异 4)：A 未覆盖的、本接口专属的排除条目（根级条目名；含改造前 EXCLUDE_DIRS/EXCLUDE_FILES 的全部独有项） */
const PACKAGER_EXTRA_EXCLUDES = new Set([
  "db_backup.sql", "temp_screenshot.png", "_tmp_screenshot.png", "full", "viewport",
  ".tmp_check", "_valve_sync_bak", "_qa_audit_20260909", "public/uploads/_old",
]);

/**
 * 根级条目是否排除 = A（唯一真源）的三类判据 + 本接口的 KEEP 豁免与专属补充。
 * 相比改造前**不会更宽松**（详见上方差异 2)/3)/4)）。
 */
function isExcludedRootEntry(name: string): boolean {
  if (deployFileset.HARD_SKIP_DIRS.has(name)) return true; // A：构建/依赖产物目录名
  if (deployFileset.isSkippedFileName(name)) return true; // A：文件名判据（唯一真源）
  if (!PACKAGER_KEEP_PREFIXES.has(name) && deployFileset.isSkippedPath(name)) return true; // A：路径前缀判据
  return PACKAGER_EXTRA_EXCLUDES.has(name); // 本接口专属补充
}

/**
 * 交付物命名配置（去品牌化，2026-09-15）
 * ============================================================
 * 本接口产出的是**发给客户的部署包**。包内一切命名/文案**不得出现本站或任何厂商品牌**
 * ——历史版本把某公司的品牌字面量写死在包名、部署目录、pm2 进程名、数据库名、
 *   nginx 配置名与安装引导文案里，客户拿到手会看到**别家公司**的品牌。
 *   （本文件随部署包一起交付，故此处也不保留该品牌字面量。）
 *
 * 取值优先级：环境变量（生成侧 .env） → 中性缺省值。
 *   DEPLOY_PACKAGE_PREFIX    包名前缀 / 解压目录名        缺省 app-deploy
 *   DEPLOY_PACKAGE_DIR       默认部署目录                 缺省 /var/www/app
 *   DEPLOY_PACKAGE_PM2_NAME  pm2 进程名（也是 nginx 配置名）缺省 app
 *   DEPLOY_PACKAGE_DB_NAME   数据库名（仅模板样例）        缺省 app_db
 *   DEPLOY_PACKAGE_SITE_NAME 交付物抬头站点名             缺省 = getBrandName()（未配置则为「本站」）
 *
 * ⚠️ 本块只决定**名字与文案字符串**；打包逻辑、排除规则、目录结构、命令语义与
 *    执行顺序均未改动。环境变量值须为 shell 安全字符串（不含空格/引号）。
 */
function envOr(name: string, fallback: string): string {
  const v = String(process.env[name] || "").trim();
  return v || fallback;
}

// POST /api/admin/deploy/package - 生成一键部署压缩包
// 打包项目代码（排除 node_modules/.next 等）+ 一键安装脚本 + .env.example
// 返回：{ success, fileName, filePath, size }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const projectRoot = process.cwd();
  const tmpBase = path.join(projectRoot, "tmp");
  const packageDir = path.join(tmpBase, "deploy-package");
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  // 交付物命名（全部可配置，缺省值中性、不含任何品牌字样）
  const pkgPrefix = envOr("DEPLOY_PACKAGE_PREFIX", "app-deploy");
  const deployDirDefault = envOr("DEPLOY_PACKAGE_DIR", "/var/www/app");
  const pm2Name = envOr("DEPLOY_PACKAGE_PM2_NAME", "app");
  const dbName = envOr("DEPLOY_PACKAGE_DB_NAME", "app_db");
  const siteLabel = envOr("DEPLOY_PACKAGE_SITE_NAME", getBrandName());
  const nginxConfName = `nginx-${pm2Name}.conf`;
  const fileName = `${pkgPrefix}-${dateStr}-${Date.now().toString(36)}.zip`;
  const zipPath = path.join(tmpBase, fileName);

  try {
    await mkdir(tmpBase, { recursive: true });

    // 1. 清理旧的打包目录，创建新的
    await rm(packageDir, { recursive: true, force: true });
    await mkdir(packageDir, { recursive: true });

    // 2. 复制项目代码（排除规则见文件顶部「唯一真源」区块，判据全部取自
    //    `scripts/_deploy_fileset.js`；此处不再自带任何排除清单）
    const entries = await readdir(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name;
      if (isExcludedRootEntry(name)) continue;
      const src = path.join(projectRoot, name);
      const dest = path.join(packageDir, name);
      try {
        await cp(src, dest, { recursive: true, force: true });
      } catch (e) {
        console.error(`复制 ${name} 失败:`, e);
      }
    }

    // 2a. 随包携带「排除规则唯一真源」模块 `scripts/_deploy_fileset.js`
    //     **为什么必须**：`scripts/` 整目录被排除（G8 加固），而本文件（随包交付给客户）
    //     在**客户机上执行 `pnpm build`** 时要能解析顶部那条 import —— 少了它，
    //     `next build` 直接报 `Module not found`，客户**装不上**。
    //     只带这一个文件：纯文件集工具（无服务器 IP / 无凭据 / 无 SSH 逻辑）。
    //     失败即整体中止（闸门必须能失败，AGENTS §7-22）：静默继续会产出一个构建不了的包。
    try {
      await mkdir(path.join(packageDir, "scripts"), { recursive: true });
      await cp(
        path.join(projectRoot, "scripts", "_deploy_fileset.js"),
        path.join(packageDir, "scripts", "_deploy_fileset.js"),
        { force: true },
      );
    } catch (e) {
      console.error("随包携带 scripts/_deploy_fileset.js 失败:", e);
      throw new Error(
        "打包中止：共享排除模块 scripts/_deploy_fileset.js 未能随包携带，客户机将无法构建（Module not found）",
      );
    }

    // 2b. 删除授权私钥目录（scripts/license-keys/private.pem），严禁进客户部署包
    try {
      await rm(path.join(packageDir, "scripts", "license-keys"), { recursive: true, force: true });
      // 若私有目录为空则移除
      try {
        const scr = path.join(packageDir, "scripts");
        const rest = await readdir(scr);
        if (rest.length === 0) await rm(scr, { recursive: true, force: true });
      } catch {}
    } catch {}

    // 2c. 🔒 敏感文件终检（2026-09-15 新增，G8 硬闸门）
    //     为什么必须有：上面的根级排除判据（`isExcludedRootEntry`）只作用于**根级条目名**，
    //     嵌套目录（如 `_local_backup/2026.../config-keys/`）不受它约束；而任何一条漏网
    //     都意味着**客户拿到我们的 RSA 私钥与数据库/邮件/翻译密钥**。
    //     ⇒ 拷贝完成后**逐个文件**扫描；命中即**整体失败并删除半成品包**，
    //       绝不"先生成再提醒"。这条闸门必须能失败（AGENTS §7-22）。
    const isSensitive = (rel: string): boolean => {
      // 模板文件不含真实密钥，**不算**敏感
      if (/(^|[\\/])\.env\.example$/i.test(rel)) return false;
      return (
        /(^|[\\/])\.env(\.|$)/i.test(rel) ||
        /\.(pem|key|p12|pfx|jks|keystore)$/i.test(rel) ||
        /(^|[\\/])(id_rsa|id_ed25519|\.npmrc|\.pgpass)$/i.test(rel) ||
        /(^|[\\/])(database\.sql|_db_backup\.sql|source\.tar\.gz|uploads\.tar\.gz)$/i.test(rel)
      );
    };
    const sensitiveHits: string[] = [];
    const scanSensitive = async (dir: string, base = ""): Promise<void> => {
      let ents: any[];
      try {
        ents = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of ents) {
        const rel = base ? `${base}/${e.name}` : e.name;
        if (e.isDirectory()) await scanSensitive(path.join(dir, e.name), rel);
        else if (isSensitive(rel)) sensitiveHits.push(rel);
      }
    };
    await scanSensitive(packageDir);
    if (sensitiveHits.length > 0) {
      await rm(packageDir, { recursive: true, force: true });
      console.error("[deploy/package] 安全终检未通过，已中止并清理：", sensitiveHits.slice(0, 20));
      return NextResponse.json(
        {
          error:
            `部署包安全终检未通过：发现 ${sensitiveHits.length} 个敏感文件，` +
            `已中止打包并删除半成品（**未生成任何交付物**）。` +
            `前几个：${sensitiveHits.slice(0, 5).join("、")}。` +
            `请检查仓库根是否有未排除的备份/密钥目录。`,
        },
        { status: 500 },
      );
    }

    // 3. 生成 .env.example（不含真实密钥）
    const envExample = `# ===== ${siteLabel || "本站"}官网 环境变量模板 =====
# 复制为 .env 并填写真实值：cp .env.example .env
# 数据库连接（PostgreSQL）
DATABASE_URL="postgresql://用户名:密码@127.0.0.1:5432/${dbName}?schema=public"
# NextAuth 会话密钥（必填，可用 openssl rand -base64 32 生成）
NEXTAUTH_SECRET="请生成随机密钥"
NEXTAUTH_URL="http://127.0.0.1:3000"

# 插件市场兑换码签名密钥（**生产必填**：未配置时插件兑换功能会拒绝服务）
# 生成：openssl rand -base64 32
PLUGIN_MARKET_SECRET="请生成随机密钥"

# ===== 邮件服务（可选，用于留言通知）=====
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your@email.com"
SMTP_PASS="your_password"
MAIL_FROM="your@email.com"
MAIL_FROM_NAME="${siteLabel}"

# ===== 站点品牌与 SEO 兜底（多站部署必填，见 AGENTS.md G2）=====
# 站点对外域名（canonical / JSON-LD / 邮件链接统一来源）
NEXT_PUBLIC_SITE_URL="https://www.example.com"
# 品牌名：邮件发件人、AI 客服欢迎语、JSON-LD 兜底
NEXT_PUBLIC_BRAND_NAME="公司简称"
NEXT_PUBLIC_BRAND_NAME_EN="COMPANY NAME"
# 通用联系邮箱（DB contact_info.email 为空时兜底，兜底为空则不显示）
NEXT_PUBLIC_CONTACT_EMAIL=""
# 通用联系电话（DB contact_info.phone 为空时兜底，兜底为空则不显示电话/不生成 tel: 链接）
NEXT_PUBLIC_CONTACT_PHONE=""
# 商城订单通知收件人（为空时跳过发送并告警）
SHOP_ORDER_NOTICE_EMAIL=""
# SEO 兜底（DB seo_config 未配置时使用，留空则该字段不输出）
NEXT_PUBLIC_DEFAULT_TITLE=""
NEXT_PUBLIC_DEFAULT_DESC=""
NEXT_PUBLIC_DEFAULT_KEYWORDS=""
# 后台「站点设置」的默认描述/关键词兜底
NEXT_PUBLIC_SITE_DESCRIPTION=""
NEXT_PUBLIC_SITE_KEYWORDS=""

# ===== 翻译服务（可选）=====
# 百度翻译
BAIDU_TRANSLATE_APPID=""
BAIDU_TRANSLATE_KEY=""
# 火山引擎
VOLCENGINE_ACCESS_KEY_ID=""
VOLCENGINE_SECRET_ACCESS_KEY=""
# 小牛翻译
NIU_API_KEY=""
NIU_APP_ID=""
`;
    await writeFile(path.join(packageDir, ".env.example"), envExample, "utf8");

    // 4. 生成一键安装脚本 install.sh
    const installScript = `#!/bin/bash
# ============================================================
# ${siteLabel || "本站"}官网 一键部署脚本（Linux 服务器执行）
# 用法：
#   1. 上传 ${pkgPrefix}-*.zip 到服务器 /tmp/
#   2. 解压：  cd /tmp && unzip -o ${pkgPrefix}-*.zip -d ${pkgPrefix}
#   3. 执行：  cd ${pkgPrefix} && bash install.sh [部署目录]
#   默认部署目录：${deployDirDefault}
# ============================================================
set -e

DEPLOY_DIR="\${1:-${deployDirDefault}}"
echo "========================================"
echo " ${siteLabel || "本站"}官网 一键部署"
echo " 部署目录: \$DEPLOY_DIR"
echo "========================================"

# 1. 检测 Node.js
if ! command -v node &>/dev/null; then
  echo "[ERROR] 未检测到 Node.js，请先安装 Node.js 20+"
  echo "  推荐：curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs"
  exit 1
fi
echo "[OK] Node.js: \$(node -v)"

# 2. 检测 pnpm
if ! command -v pnpm &>/dev/null; then
  echo "[INFO] 未检测到 pnpm，正在安装..."
  npm install -g pnpm
fi
echo "[OK] pnpm: \$(pnpm -v)"

# 3. 创建并复制代码到部署目录（全量复制，含 .env.example / README 等）
mkdir -p "\$DEPLOY_DIR"
cp -rf . "\$DEPLOY_DIR"/ 2>/dev/null || true
cd "\$DEPLOY_DIR"

# 4. 初始化 .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "[WARN] 已从 .env.example 生成 .env，请编辑填写真实数据库密码、NEXTAUTH_SECRET 等配置后重新执行本脚本！"
    echo "[WARN] 或者直接编辑 \$DEPLOY_DIR/.env 后执行： bash install.sh"
    exit 1
  else
    echo "[ERROR] 缺少 .env.example，无法初始化配置"
    exit 1
  fi
fi
echo "[OK] .env 配置已就绪"

# 5. 安装依赖（含构建所需的 devDependencies）
echo "[INFO] 安装依赖（pnpm install）..."
pnpm install

# 6. 数据库检测
echo "[INFO] 检测数据库环境..."
if ! grep -qE '^DATABASE_URL="?postgres' .env 2>/dev/null; then
  echo "[ERROR] .env 未正确配置 DATABASE_URL（应以 postgres:// 开头）"
  exit 1
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "[ERROR] 服务器未安装 PostgreSQL（psql 不可用）。请先安装："
  echo "  sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib"
  echo "  sudo systemctl start postgresql && sudo systemctl enable postgresql"
  echo "  然后创建数据库和用户（参考 README-DEPLOY.md）"
  exit 1
fi
echo "[OK] 数据库环境检测通过"

# 7. 数据库同步
echo "[INFO] 同步数据库结构（prisma db push）..."
npx prisma generate
npx prisma db push

# 8. 构建
echo "[INFO] 构建项目（pnpm build）..."
pnpm build

# 9. 配置 PM2 启动
echo "[INFO] 配置 PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
if pm2 describe ${pm2Name} >/dev/null 2>&1; then
  if pm2 describe ${pm2Name} 2>/dev/null | grep -q "next start"; then
    pm2 delete ${pm2Name}
    NODE_ENV=production pm2 start "node server.js" --name ${pm2Name}
  else
    pm2 restart ${pm2Name}
  fi
else
  NODE_ENV=production pm2 start "node server.js" --name ${pm2Name}
fi
pm2 save
pm2 startup || true

# 10. 健康检查
sleep 5
HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "\$HTTP_CODE" = "200" ]; then
  echo "[OK] 部署成功！网站已运行在 http://localhost:3000"
else
  echo "[WARN] 网站响应码: \$HTTP_CODE，请检查日志：pm2 logs ${pm2Name}"
fi

echo "========================================"
echo " 部署完成！"
echo " 后续建议：配置 Nginx 反代 + HTTPS（参考 docs/${nginxConfName}）"
echo "========================================"
`;
    await writeFile(path.join(packageDir, "install.sh"), installScript, "utf8");

    // 5. 生成部署说明 README-DEPLOY.md
    const readme = `# ${siteLabel || "本站"}官网 - 一键部署包

本压缩包包含网站完整源代码 + 一键部署脚本，可用于在任何 Linux 服务器上部署。

## 服务器要求
- Node.js 20+（本包已适配）
- pnpm（脚本自动安装）
- PostgreSQL（需自行安装，并创建数据库）
- 2GB 以上内存（建议 4GB）

## 部署步骤
1. 上传本压缩包到服务器，例如放到 /tmp/
2. 解压：
   \`\`\`bash
   cd /tmp && unzip -o ${pkgPrefix}-*.zip -d ${pkgPrefix}
   \`\`\`
3. 编辑环境变量（填写真实数据库密码等）：
   \`\`\`bash
   cd ${pkgPrefix}
   cp .env.example .env
   vi .env
   \`\`\`
4. 执行一键部署：
   \`\`\`bash
   bash install.sh ${deployDirDefault}
   \`\`\`
5. 配置 Nginx（参考 docs/${nginxConfName}）

## 首次部署前需准备
- PostgreSQL 数据库：创建用户和数据库（如 ${dbName}）
- 域名解析到服务器
- 安全组放行 22/80/443 端口

## 目录说明
- install.sh  一键部署脚本
- .env.example  环境变量模板
- app/  Next.js 应用代码
- prisma/  数据库模型
`;
    await writeFile(path.join(packageDir, "README-DEPLOY.md"), readme, "utf8");

    // 6. 打包成 zip（用系统 tar/bsdtar 生成标准 zip，正斜杠路径，Linux 解压正常；Windows Compress-Archive 会生成反斜杠路径导致 Linux 解压错乱）
    await execFileAsync("tar", ["-a", "-c", "-f", zipPath, "-C", packageDir, "."]);

    // 7. 校验生成
    const fileStat = await stat(zipPath);
    if (fileStat.size === 0) {
      throw new Error("压缩包生成失败（文件为空）");
    }

    // 8. 清理临时目录
    await rm(packageDir, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      fileName,
      filePath: zipPath,
      size: fileStat.size,
      sizeText: formatSize(fileStat.size),
      downloadUrl: `/api/admin/deploy/package?file=${encodeURIComponent(fileName)}`,
    });
  } catch (e: any) {
    console.error("生成部署压缩包失败:", e);
    try { await rm(packageDir, { recursive: true, force: true }); } catch {}
    return NextResponse.json({ success: false, error: "生成部署压缩包失败: " + (e?.message || e) }, { status: 500 });
  }
}

// GET /api/admin/deploy/package?file=xxx.zip - 下载已生成的压缩包
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const fileName = req.nextUrl.searchParams.get("file");
  if (!fileName || !fileName.endsWith(".zip") || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const filePath = path.join(process.cwd(), "tmp", fileName);
  try {
    await access(filePath, fs.constants.R_OK);
    const buf = fs.readFileSync(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "文件不存在或已清理" }, { status: 404 });
  }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}
