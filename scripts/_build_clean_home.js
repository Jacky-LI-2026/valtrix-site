#!/usr/bin/env node
/**
 * `pnpm build` 在 Windows 上的可用封装（绕开本机 ACL 导致的 EPERM）
 * ==========================================================================
 * 现象：
 *   pnpm build → glob error [Error: EPERM: operation not permitted,
 *                scandir 'C:\Users\Administrator\Application Data'] → Failed to compile
 *
 * 根因（2026-09-11 定位，证据确凿，**不是本项目代码问题**）：
 *   `C:\Users\Administrator\Cookies` 与 `C:\Users\Administrator\Application Data` 是
 *   Windows 的**兼容性 junction（Mount Point）**。本机它们的 ACL 上有一条
 *   **显式拒绝** 项：
 *       Everyone:(DENY)(RD)
 *   显式 DENY 优先于 `BUILTIN\Administrators:(F)`，所以**连管理员也读不了**：
 *       node -e "require('fs').readdirSync('C:\\Users\\Administrator\\Cookies')"
 *       → EPERM: operation not permitted, scandir
 *   构建过程中有依赖会以 `os.homedir()` 为根做 glob，走到这两个 junction 就 EPERM。
 *
 * 验证过的事实：把 `os.homedir()` 指到一个干净目录后，**构建完全成功**
 *   （✓ Compiled successfully / BUILD_ID 已生成 / lint+tsc 通过）。详见
 *   docs/backend/04-work-log.md 同日条目。
 *
 * 本封装做的就是这个：只在**构建子进程**内把 HOME 指到临时目录，
 * 不碰系统 ACL、不改 .env、不影响运行时。
 *
 * ⚠️ 注意：**不要**用这个封装替代 `pnpm build` 去跑 `pnpm`；本脚本直接调用
 *    `next build`，避免 pnpm 因 store 路径变化触发 deps 检查而崩溃
 *    （实测 exit 2147483651）。
 *
 * 用法：
 *   node scripts/_build_clean_home.js
 *   pnpm build:clean-home
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

if (process.platform !== "win32") {
  console.error("本封装仅针对 Windows 的 junction ACL 问题；非 Windows 请直接用 `pnpm build`。");
  process.exit(1);
}

/**
 * 解析「真正的 Node」可执行文件。
 * ⚠️ 必须做这一步：在 DSH 里 `pnpm` 由 Electron 承载，此时 `process.execPath` 指向
 *    DSH Desktop.exe；拿它去跑 `next build` 会以 0x80000003(2147483651) 直接崩溃。
 *    实测：`node scripts/_build_clean_home.js` 成功，`pnpm build:clean-home` 崩溃。
 */
function resolveNode() {
  const isRealNode = (p) => {
    try {
      const out = execFileSync(p, ["-p", "process.versions.electron || 'node'"], {
        encoding: "utf8",
        timeout: 20000,
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      return out === "node";
    } catch {
      return false;
    }
  };
  const candidates = [
    process.env.npm_node_execpath, // pnpm 会把它设为真正的 node
    process.env.NODE,
    process.execPath,
    "C:\\Program Files\\nodejs\\node.exe",
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c) && isRealNode(c)) return c;
  }
  return null;
}

const nodeBin = resolveNode();
if (!nodeBin) {
  console.error(
    "找不到真正的 Node.js 可执行文件（当前进程可能是 Electron 承载的）。\n" +
      "请直接运行：node scripts/_build_clean_home.js   （不要经 pnpm）"
  );
  process.exit(1);
}

// 干净的 HOME：放在系统临时目录下（**不在** C:\Users\<用户> 里，避免再次踩到 junction）
const cleanHome = path.join(os.tmpdir(), "dsh-build-home");
fs.mkdirSync(cleanHome, { recursive: true });

const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

console.log("=== 带干净 HOME 的 next build ===");
console.log(`  ROOT       = ${ROOT}`);
console.log(`  node       = ${nodeBin}`);
console.log(`  HOME(替换) = ${cleanHome}`);
console.log(`  （原因：本机 C:\\Users\\<用户> 下两个兼容性 junction 被显式 DENY，构建期 glob 会被 EPERM 拒绝）\n`);

const child = spawn(nodeBin, [nextBin, "build", ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: "inherit",
  env: {
    ...process.env,
    // Node 在 Windows 上按 USERPROFILE 解析 os.homedir()
    USERPROFILE: cleanHome,
    HOMEDRIVE: path.parse(cleanHome).root.replace(/\\$/, ""),
    HOMEPATH: cleanHome.slice(path.parse(cleanHome).root.length - 1),
    // 关掉遥测，避免额外写用户目录
    NEXT_TELEMETRY_DISABLED: "1",
  },
});

child.on("exit", (code) => {
  console.log(`\n=== next build 退出码：${code} ===`);
  process.exit(code ?? 1);
});
child.on("error", (e) => {
  console.error("启动 next build 失败：", e.message);
  process.exit(1);
});
