#!/usr/bin/env node
/**
 * 部署文件集（共享模块）
 * ==========================================================================
 * **为什么存在**：站点一致性门禁脚本与站点部署脚本**各自复制了一份**"本地该收哪些文件"的逻辑
 *   （两站各一套）。2026-09-12 实测发现两份都含同一个
 *   致命缺陷 —— `SKIP_DIRS` 是**按目录名 basename** 匹配的，其中 `"public"` 会
 *   把 `app/api/public/**` **整棵子树静默跳过**（另 `logs`/`docs`/`industry-packs`/
 *   `generated` 同理）。后果：
 *     · 这些文件在比对里"本地没有键"，于是落入"服务器独有（保留，不删）"；
 *     · 门禁报 **"需部署 0 个"** —— **假阴性**；
 *     · 该目录下的改动**永远不会被部署**，且每次核对都显示"一致"。
 *   实测被误杀 70 个文件，其中 12 个确属需部署。
 *
 * **正确语义**（本模块固化）：
 *   · 排除规则一律 **路径前缀**（root 锚定），不是目录名。
 *     `public` 只排除 **仓库根** 的 `public/`；`app/api/public/` 必须保留。
 *   · 只有 `node_modules` / `.next` / `.git` 仍按目录名剪枝（任何层级都不该进）。
 *
 * **禁止**再在任何部署/核对脚本里另写一份遍历逻辑 —— 一律 `require` 本模块。
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/** 运行时根（两站同一套口径）；可按站覆盖 */
const DEFAULT_RUNTIME_ROOTS = [
  "app", "components", "lib", "config", "hooks", "types", "prisma",
  "middleware.ts", "next.config.js", "server.js",
  "package.json", "tsconfig.json", "tailwind.config.ts", "postcss.config.js",
];

/** 任何层级都剪枝的目录名（构建/依赖产物） */
const HARD_SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

/**
 * 路径前缀排除（**锚定仓库根**）。
 * 左项是仓库根下的相对路径前缀；`app/api/public` 不在此列，故不会被误杀。
 * `lib/generated` 是 Prisma 客户端生成物 —— **必须排除**：本地是 Windows 生成物
 *   （含 `query_engine-windows.dll.node`），服务器有自己的 Linux 生成物。
 */
const SKIP_PATH_PREFIXES = [
  "scripts", "docs", "会话记录", "public", "industry-packs",
  "项目备份", "_local_backup", "_archive", "backups", "_backups", "_pgsql",
  "logs", "tmp", "data", "lib/generated",
];

/**
 * ⚠️ **单文件白名单**：即使所在目录被整目录排除，这些文件**仍必须进部署集**。
 *
 * 为什么需要：`app/api/admin/deploy/package/route.ts` **静态 import** 了
 * `scripts/_deploy_fileset.js`（G15/坑26：排除规则只允许有一个真源）。
 * 该 import 在**构建期**就要能解析 ⇒ 服务器源码树里**必须存在这个文件**，
 * 否则远端 `next build` 直接 `Module not found` 失败
 * （2026-09-17 实测：整站部署因此失败一次，现网未受损，但白等一轮构建）。
 * 另外该路由在**运行期**还要把它「随包携带」进客户交付包 ⇒ 运行期也需要它在。
 *
 * 只有**这一个**文件属于此例外（它是纯路径规则模块，**不含任何凭据**）。
 * 新增例外前请先确认：该文件是否被 `app/**` 或 `lib/**` 静态引用。
 */
const ALLOW_FILES = new Set(["scripts/_deploy_fileset.js"]);

/** 单文件排除（部署包/环境/日志等） */
const SKIP_FILE_RE = /^(\.env.*|.*\.log|.*\.zip|.*\.dump|.*\.tsbuildinfo|_db_backup\.sql|AGENTS\.md|.*\.bak(-.*)?)$/;

/** 临时文件（如 `x.tmp1`）—— 与 `collectLocal` 内联判据共用**同一处**定义 */
const TMP_FILE_RE = /\.tmp\d+$/;

/**
 * 单**文件名**排除判据（与所在路径无关）：`SKIP_FILE_RE ∪ TMP_FILE_RE`。
 * 供 `collectLocal` 与外部调用方（如后台打包器 `app/api/admin/deploy/package/route.ts`）
 * **共用同一份**文件名规则 —— 不要再另写一份（L1#坑26：双份规则已导致 `.bak-*` 进包事故）。
 */
function isSkippedFileName(name) {
  return SKIP_FILE_RE.test(name) || TMP_FILE_RE.test(name);
}

const md5File = (p) => crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");

function isSkippedPath(rel) {
  const norm = String(rel).replace(/\\/g, "/");
  if (ALLOW_FILES.has(norm)) return false;
  return SKIP_PATH_PREFIXES.some((p) => norm === p || norm.startsWith(p + "/"));
}

/**
 * 收集本地待部署文件 → { "相对路径": md5 }
 * @param {string} root 仓库根
 * @param {string[]} runtimeRoots 运行时根
 * @param {{onSkip?: (info:{dir:string,at:string})=>void}} [opts]
 */
function collectLocal(root, runtimeRoots = DEFAULT_RUNTIME_ROOTS, opts = {}) {
  const acc = {};

  function walk(rel) {
    let entries;
    try {
      entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (HARD_SKIP_DIRS.has(e.name)) continue;
        if (isSkippedPath(r)) {
          if (opts.onSkip) opts.onSkip({ dir: e.name, at: r });
          continue;
        }
        walk(r);
      } else {
        if (isSkippedFileName(e.name)) continue;
        if (isSkippedPath(r)) continue;
        try {
          acc[r] = md5File(path.join(root, r));
        } catch {
          /* 读不了就跳过，交由门禁以"缺失"形式暴露 */
        }
      }
    }
  }

  for (const rel of runtimeRoots) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) walk(rel);
    else if (!SKIP_FILE_RE.test(path.basename(rel))) {
      try {
        acc[rel] = md5File(abs);
      } catch {}
    }
  }
  return acc;
}

/** 服务器端取 md5 的命令（口径与 collectLocal 一致：同样的 RUNTIME_ROOTS，同样的剪枝） */
function remoteMd5Command(prodDir, runtimeRoots = DEFAULT_RUNTIME_ROOTS) {
  return (
    `cd ${prodDir} && find ${runtimeRoots.map((x) => `"${x}"`).join(" ")} -type f ` +
    `-not -path '*/node_modules/*' -not -path '*/.next/*' -exec md5sum {} + 2>/dev/null`
  );
}

/** 解析 `md5sum` 输出 → { "相对路径": md5 }（容忍文件名含空格/方括号） */
function parseMd5Output(out) {
  const map = {};
  for (const line of String(out).split("\n")) {
    const m = line.match(/^([0-9a-f]{32})\s+(.+)$/);
    if (m) map[m[2]] = m[1];
  }
  return map;
}

/**
 * 与服务器现状比对 → { missing, differs, need, serverOnly }
 * need = missing ∪ differs（去重，按路径排序）
 */
function compare(baseMap, serverMap) {
  const missing = [];
  const differs = [];
  for (const [rel, md5] of Object.entries(baseMap)) {
    if (serverMap[rel] === undefined) missing.push(rel);
    else if (serverMap[rel] !== md5) differs.push(rel);
  }
  const need = [...missing, ...differs].sort();
  const serverOnly = Object.keys(serverMap)
    .filter((f) => baseMap[f] === undefined)
    .sort();
  return { missing: missing.sort(), differs: differs.sort(), need, serverOnly };
}

module.exports = {
  DEFAULT_RUNTIME_ROOTS,
  HARD_SKIP_DIRS,
  SKIP_PATH_PREFIXES,
  SKIP_FILE_RE,
  TMP_FILE_RE,
  isSkippedFileName,
  isSkippedPath,
  md5File,
  collectLocal,
  remoteMd5Command,
  parseMd5Output,
  compare,
};
