#!/usr/bin/env node
/**
 * `scripts/_credentials.js` —— **生产凭据的唯一收口入口**
 * ==========================================================================
 *
 * ## 为什么必须这样（G8 / 全局 §5 / 136 处硬编码的教训）
 *
 * 2026-09-14 测绘结果（`node scripts/_cred_recon.js`，只输出指纹、不输出明文）：
 *
 *   · 两个生产服务器的 **root 密码是同一个值**，它在 `scripts/` 下被**逐字硬编码了 136 处**，
 *     散落在 **132 个 .js 文件**里（含被大量脚本复用的共享工具 `_ssh.js` / `_scp.js`）。
 *   · 同一个 PostgreSQL 超级用户口令被硬编码 **31 处**，散落在 19 个文件里。
 *   · 典型形态：
 *         const PASS = "……";                      // 然后 connect({ password: PASS })
 *         host: "…", username: "root", password: "……",
 *
 * 这同时违反两条**不可协商**的规则：
 *   · 项目规则 **G8「秘密不进部署包」** —— `scripts/` 是会被打包/备份/外发的东西，
 *     密码写在里面 ⇒ 任何一次打包、备份、发版、截图、报告都等于**分发密码**。
 *   · 全局 **§5** —— 凭据**永不写入文件、永不提交仓库、永不打印明文**。
 *
 * 代价不是"理论上的"：`scripts/` 下有 500+ 个文件、随时被 `tar` 打包进交付物，
 * 而改密码要**逐个文件去找** 136 处 —— 也就是说**这个密码实际上不可能被安全地轮换**。
 * 本模块把"取密码"变成**一个入口、一处配置**，从而让轮换成为一次操作。
 *
 * ## 解析顺序（三级，**顺序不可颠倒**）
 *
 *   ① **环境变量**（最高优先级，不落盘、随会话消失）
 *        `ZUOWEN_SSH_PASSWORD` / `VALVE_SSH_PASSWORD` / `ZUOWEN_PG_PASSWORD`
 *        （可用 `opts.envVar` 或 `--password-env <NAME>` 覆盖变量名）
 *   ② **本地凭据文件** `%DSH_HOME%\server-credentials.json`
 *        `DSH_HOME` 缺省为 `C:\Users\<用户>\.dsh`（本机实测 = `C:\Users\Administrator\.dsh`）。
 *        ⚠️ **该文件必须在仓库之外** —— 放在 `D:\企业网站` 里面就等于又进了一次部署包。
 *   ③ 两者都没有 → **抛错**（`CredentialError`，`code = "CREDENTIAL_MISSING"`），
 *        错误信息里只有**变量名与文件路径**，并附**可照抄**的设置命令。**绝不含密码值**。
 *
 * ## 凭据文件结构（`%DSH_HOME%\server-credentials.json`）
 *
 * ```json
 * {
 *   "version": 1,
 *   "servers": {
 *     "zuowen": { "host": "…", "username": "root", "password": "…",
 *                 "envVar": "ZUOWEN_SSH_PASSWORD", "note": "左文科技企业站", "rotatedAt": "YYYY-MM-DD" },
 *     "valve":  { "host": "…", "username": "root", "password": "…",
 *                 "envVar": "VALVE_SSH_PASSWORD",  "note": "VALTRIX 阀门站", "rotatedAt": "YYYY-MM-DD" }
 *   },
 *   "postgres": { "host": "127.0.0.1", "username": "postgres", "password": "…",
 *                 "envVar": "ZUOWEN_PG_PASSWORD", "note": "…", "rotatedAt": "YYYY-MM-DD" }
 * }
 * ```
 * 生成命令（**不会打印任何密码值**）：`node scripts/_cred_setup.js`
 *
 * ## 文件权限建议（**必须做，否则等于没搬出仓库**）
 *
 *   · **Windows**（本机）—— 关掉继承并只授权当前用户读：
 *     ```
 *     icacls "%DSH_HOME%\server-credentials.json" /inheritance:r /grant:r "%USERNAME%:R"
 *     ```
 *     验证：`icacls "%DSH_HOME%\server-credentials.json"`（应只剩当前用户一行 `(R)`）
 *   · **Linux/macOS** —— `chmod 600`，属主为运行部署脚本的那个账号。
 *   · ⛔ **绝不要**把它放进任何同步盘（OneDrive/坚果云/网盘）、Git 仓库、或 `_local_backup/`。
 *   · `scripts/_cred_setup.js` 写文件时会**自动**尝试应用上述 ACL（Windows 用 `icacls`）。
 *
 * ## 安全约定（本模块自身的硬约束）
 *
 *   · **绝不** `console.log` 密码值；**绝不**把它拼进远程命令；**绝不**写进错误堆栈/message。
 *   · 错误信息里只允许出现：变量名、文件路径、站点标识、以及**指纹**（`fingerprint()`）。
 *   · `fingerprint()` 只返回 **长度 + 首尾各 1 个字符的哈希** —— 用于核对"取到的是同一个密码"
 *     而**不泄露**它。⚠️ 诚实说明其**边界**：首/尾单字符的哈希在字符集很小时是可枚举的，
 *     所以指纹是**识别辅助**，**不是**密码学保护；真要零泄露就只对外说长度。
 *   · 本模块**不连接任何服务器**、**不执行任何命令**，只读环境变量与一个 JSON 文件。
 *
 * ## 用法
 *
 * ```js
 * const cred = require("./_credentials");            // scripts/ 根目录下的脚本
 * const cred = require("../_credentials");           // scripts/_archive/ 等子目录
 *
 * const pw  = cred.getServerPassword("zuowen");      // 缺失则抛 CredentialError
 * const pw2 = cred.getServerPassword("8.130.65.182") // 也接受直接给 host
 * const maybe = cred.tryGetServerPassword("valve");  // 缺失返回 null，不抛
 * const pg  = cred.getPgPassword();                  // PostgreSQL 超级用户口令
 * cred.fingerprint(pw);                              // "len=11 head=xxxxxxxx tail=xxxxxxxx"
 * ```
 *
 * 命令行自检：`node scripts/_credentials.js --status`（只输出"有没有 / 指纹"，无明文）
 */

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

/* ==========================================================================
 * 1. 站点表 —— 唯一的"站点标识 ↔ 主机 ↔ 环境变量名"真源
 * ========================================================================== */

/**
 * ⚠️ 这里**只有主机名/用户名/变量名**，**没有任何凭据**（G8）。
 * 新增站点：在这里加一条即可，所有调用方自动可用。
 */
const SITES = {
  zuowen: {
    key: "zuowen",
    label: "左文科技企业站",
    host: "8.130.65.182",
    username: "root",
    envVar: "ZUOWEN_SSH_PASSWORD",
  },
  valve: {
    key: "valve",
    label: "VALTRIX 阀门站",
    host: "47.57.241.85",
    username: "root",
    envVar: "VALVE_SSH_PASSWORD",
  },
};

/** 站点别名 → 真站点键（`scripts/_ssh.js` 历史上把 8.130.65.182 叫 `base`） */
const SITE_ALIASES = {
  base: "zuowen",
  zuowen: "zuowen",
  "www.zuowentech.com": "zuowen",
  valve: "valve",
  valtrix: "valve",
  "www.valvetrix.com": "valve",
};

/** 未知主机时的通用环境变量名（仍可被凭据文件按 host 命中） */
const GENERIC_SSH_ENV = "DSH_SSH_PASSWORD";

/** 凭据文件（放在仓库之外） */
const CREDENTIALS_FILE_NAME = "server-credentials.json";

/** 允许测试/诊断把凭据文件指到别处（**不得**在部署脚本里设置） */
const CREDENTIALS_FILE_ENV = "DSH_CREDENTIALS_FILE";

/* ==========================================================================
 * 2. 错误类型 —— 只带变量名/路径，绝不带值
 * ========================================================================== */

class CredentialError extends Error {
  /**
   * @param {string} message 面向人的说明（**不得含密码值**）
   * @param {{code?:string, siteKey?:string, envVar?:string, filePath?:string, hint?:string}} info
   */
  constructor(message, info) {
    super(message);
    this.name = "CredentialError";
    this.code = (info && info.code) || "CREDENTIAL_MISSING";
    if (info && info.siteKey) this.siteKey = info.siteKey;
    if (info && info.envVar) this.envVar = info.envVar;
    if (info && info.filePath) this.filePath = info.filePath;
    if (info && info.hint) this.hint = info.hint;
  }
}

/* ==========================================================================
 * 3. 路径与站点解析
 * ========================================================================== */

/** `DSH_HOME` 缺省 = `C:\Users\<用户>\.dsh` */
function dshHome() {
  const v = process.env.DSH_HOME;
  if (v && String(v).trim()) return String(v).trim();
  return path.join(os.homedir(), ".dsh");
}

/** 凭据文件的绝对路径（在仓库之外） */
function credentialsFilePath() {
  const override = process.env[CREDENTIALS_FILE_ENV];
  if (override && String(override).trim()) return path.resolve(String(override).trim());
  return path.join(dshHome(), CREDENTIALS_FILE_NAME);
}

/**
 * 把 `"zuowen" | "valve" | "base" | "8.130.65.182" | 任意 host` 归一成站点信息。
 * @returns {{key:string, host:string, username:string, envVar:string, known:boolean, label:string}}
 */
function resolveSite(siteOrHost) {
  const raw = siteOrHost === undefined || siteOrHost === null ? "" : String(siteOrHost).trim();
  const alias = SITE_ALIASES[raw.toLowerCase()];
  if (alias) {
    const s = SITES[alias];
    return { key: s.key, host: s.host, username: s.username, envVar: s.envVar, known: true, label: s.label };
  }
  // 按 host 反查已知站点
  for (const s of Object.values(SITES)) {
    if (s.host === raw) {
      return { key: s.key, host: s.host, username: s.username, envVar: s.envVar, known: true, label: s.label };
    }
  }
  // 未知主机：仍可用（通用环境变量 + 凭据文件按 host 命中）
  return {
    key: raw || "unknown",
    host: raw,
    username: "root",
    envVar: GENERIC_SSH_ENV,
    known: false,
    label: "",
  };
}

/* ==========================================================================
 * 4. 指纹（识别用，不泄露原值）
 * ========================================================================== */

/**
 * 长度 + 首尾各 1 个字符的哈希。用于核对"两台机器/两个人取到的是同一个密码"。
 * ⚠️ 这是**识别辅助**，不是密码学保护（单字符哈希在小字符集下可枚举）。
 * @param {string} value
 * @returns {string} 形如 `len=11 head=1a2b3c4d tail=5e6f7a8b`；空值 → `len=0 head=- tail=-`
 */
function fingerprint(value) {
  const s = value === undefined || value === null ? "" : String(value);
  if (!s.length) return "len=0 head=- tail=-";
  const chars = Array.from(s);
  const hash8 = (ch, salt) =>
    crypto.createHash("sha256").update(salt + ch, "utf8").digest("hex").slice(0, 8);
  return (
    `len=${chars.length}` +
    ` head=${hash8(chars[0], "dsh-cred-head:")}` +
    ` tail=${hash8(chars[chars.length - 1], "dsh-cred-tail:")}`
  );
}

/* ==========================================================================
 * 5. 凭据文件读取（宽容：文件坏了当作"没有"，绝不打印内容）
 * ========================================================================== */

/**
 * 读凭据文件。
 * @returns {{ok:boolean, data:object|null, reason:string}} reason 只描述"哪一步不行"，不含值
 */
function readCredentialsFile() {
  const file = credentialsFilePath();
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    return { ok: false, data: null, reason: e && e.code === "ENOENT" ? "文件不存在" : "文件不可读" };
  }
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object") return { ok: false, data: null, reason: "文件内容不是对象" };
    return { ok: true, data, reason: "" };
  } catch {
    return { ok: false, data: null, reason: "JSON 解析失败" };
  }
}

/** 从凭据文件里取 SSH 口令（先按站点键，再按 host 匹配） */
function passwordFromFile(site) {
  const r = readCredentialsFile();
  if (!r.ok) return { value: null, reason: r.reason };
  const servers = r.data.servers;
  if (!servers || typeof servers !== "object") return { value: null, reason: "缺少 servers 段" };
  const byKey = servers[site.key];
  if (byKey && typeof byKey.password === "string" && byKey.password) {
    return { value: byKey.password, reason: "" };
  }
  for (const entry of Object.values(servers)) {
    if (entry && typeof entry === "object" && entry.host === site.host && typeof entry.password === "string" && entry.password) {
      return { value: entry.password, reason: "" };
    }
  }
  return { value: null, reason: serverKeyFound(servers, site.key) ? "该站点条目里没有 password 字段" : "文件里没有该服务器条目" };
}

function serverKeyFound(servers, key) {
  return Object.prototype.hasOwnProperty.call(servers || {}, key);
}

/** 从凭据文件里取 PostgreSQL 口令 */
function pgPasswordFromFile() {
  const r = readCredentialsFile();
  if (!r.ok) return { value: null, reason: r.reason };
  const pg = r.data.postgres;
  if (pg && typeof pg.password === "string" && pg.password) return { value: pg.password, reason: "" };
  return { value: null, reason: pg ? "postgres 条目里没有 password 字段" : "文件里没有 postgres 条目" };
}

/* ==========================================================================
 * 6. 可照抄的设置指引（只含变量名/路径）
 * ========================================================================== */

/** @param {{envVar:string, key:string, filePath:string}} a */
function setupHint(a) {
  return [
    "   ① 最快（只作用于本会话，不落盘）：在当前 PowerShell 里设置环境变量，再重跑：",
    "",
    `        $env:${a.envVar} = Read-Host -AsSecureString | ConvertFrom-SecureString -AsPlainText`,
    `        # 或者直接赋值： $env:${a.envVar} = "……"`,
    "",
    "   ② 持久（一次配好，之后所有脚本都能用）：写进**仓库之外**的本地凭据文件，",
    `        路径：${a.filePath}`,
    `        结构：{ "version": 1, "servers": { "${a.key}": { "host": "…", "username": "root", "password": "…" } } }`,
    "        生成命令（**不打印任何密码值**）： node scripts/_cred_setup.js",
    `        权限收紧（Windows）： icacls "${a.filePath}" /inheritance:r /grant:r "%USERNAME%:R"`,
    "",
    "   ⛔ 绝不要把密码写回任何脚本、`.env`、文档或报告里（G8 / 全局 §5）。",
  ].join("\n");
}

/** 缺失时的完整错误信息（**绝不含密码值**） */
function missingMessage(what, site, envVar, filePath, reasons) {
  const lines = [
    `❌ 缺少 ${what}：环境变量 ${envVar} 未设置，本地凭据文件里也取不到。`,
    ``,
    `   环境变量    ： ${envVar}（未设置）`,
    `   凭据文件    ： ${filePath}`,
    `   文件状态    ： ${reasons && reasons.file ? reasons.file : "未检查"}`,
    ``,
    `   本模块**刻意不内置任何密码** —— 凭据写在脚本里等于进仓库、进日志、进报告（G8 / §5）。`,
    ``,
    setupHint({ envVar, key: site && site.key ? site.key : "zuowen", filePath }),
    `   然后重跑： node scripts/_safe_build_deploy.js ${site && site.key ? site.key : "<site>"}`,
  ];
  return lines.join("\n");
}

/* ==========================================================================
 * 7. 公开 API
 * ========================================================================== */

/**
 * 取 SSH 口令（**环境变量优先** → 本地凭据文件 → 抛错）。
 * @param {string} siteOrHost `"zuowen"|"valve"|"base"|<host>`
 * @param {{envVar?:string}} [opts] 覆盖环境变量名（对应 `--password-env`）
 * @returns {string}
 * @throws {CredentialError}
 */
function getServerPassword(siteOrHost, opts) {
  const site = resolveSite(siteOrHost);
  const envVar = (opts && opts.envVar) || site.envVar;

  // ① 环境变量（最高优先级）
  const fromEnv = process.env[envVar];
  if (fromEnv && String(fromEnv).length) return String(fromEnv);

  // ② 本地凭据文件（仓库之外）
  const filePath = credentialsFilePath();
  const fromFile = passwordFromFile(site);
  if (fromFile.value) return fromFile.value;

  // ③ 都没有 → 抛错（信息里只有变量名与路径）
  throw new CredentialError(
    missingMessage(`SSH 凭据（站点 ${site.key}）`, site, envVar, filePath, { file: fromFile.reason }),
    { code: "CREDENTIAL_MISSING", siteKey: site.key, envVar, filePath }
  );
}

/**
 * 同 `getServerPassword`，但**缺失时返回 null 而不抛**（调用方自己给指引）。
 * @returns {string|null}
 */
function tryGetServerPassword(siteOrHost, opts) {
  try {
    return getServerPassword(siteOrHost, opts);
  } catch (e) {
    if (e instanceof CredentialError) return null;
    throw e;
  }
}

/**
 * 取 PostgreSQL 超级用户口令（环境变量 `ZUOWEN_PG_PASSWORD` 优先）。
 * @param {{envVar?:string}} [opts]
 * @returns {string}
 * @throws {CredentialError}
 */
function getPgPassword(opts) {
  const envVar = (opts && opts.envVar) || "ZUOWEN_PG_PASSWORD";
  const fromEnv = process.env[envVar];
  if (fromEnv && String(fromEnv).length) return String(fromEnv);
  const filePath = credentialsFilePath();
  const fromFile = pgPasswordFromFile();
  if (fromFile.value) return fromFile.value;
  const pseudoSite = { key: "postgres", host: "127.0.0.1" };
  throw new CredentialError(
    missingMessage(" PostgreSQL 口令", pseudoSite, envVar, filePath, { file: fromFile.reason }),
    { code: "CREDENTIAL_MISSING", siteKey: "postgres", envVar, filePath }
  );
}

/** @returns {string|null} */
function tryGetPgPassword(opts) {
  try {
    return getPgPassword(opts);
  } catch (e) {
    if (e instanceof CredentialError) return null;
    throw e;
  }
}

/**
 * 诊断用：说明"现在会从哪里取"，**只输出来源与指纹，绝无明文**。
 * @param {string} siteOrHost
 * @returns {{site:string, host:string, envVar:string, fromEnv:boolean, filePath:string, fileOk:boolean, fileReason:string, source:string, fingerprint:string}}
 */
function describeSource(siteOrHost) {
  const site = resolveSite(siteOrHost);
  const envVar = site.envVar;
  const fromEnv = Boolean(process.env[envVar] && String(process.env[envVar]).length);
  const r = readCredentialsFile();
  const fromFile = passwordFromFile(site);
  const value = fromEnv ? String(process.env[envVar]) : fromFile.value;
  return {
    site: site.key,
    host: site.host,
    envVar,
    fromEnv,
    filePath: credentialsFilePath(),
    fileOk: r.ok,
    fileReason: r.ok ? "可读" : r.reason,
    source: fromEnv ? `环境变量 ${envVar}` : fromFile.value ? `凭据文件 ${credentialsFilePath()}` : "（无）",
    fingerprint: value ? fingerprint(value) : "（取不到）",
  };
}

/* ==========================================================================
 * 8. 命令行自检：node scripts/_credentials.js --status
 * ========================================================================== */

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes("--status") || argv.length === 0) {
    const rows = Object.keys(SITES).map((k) => {
      const d = describeSource(k);
      return { site: d.site, host: d.host, source: d.source, fingerprint: d.fingerprint, fileOk: d.fileOk, fileReason: d.fileReason };
    });
    const pg = tryGetPgPassword();
    const fileRead = readCredentialsFile();
    rows.push({
      site: "postgres",
      host: "127.0.0.1",
      source: pg
        ? process.env.ZUOWEN_PG_PASSWORD
          ? "环境变量 ZUOWEN_PG_PASSWORD"
          : `凭据文件 ${credentialsFilePath()}`
        : "（无）",
      fingerprint: pg ? fingerprint(pg) : "（取不到）",
      fileOk: fileRead.ok,
      fileReason: fileRead.ok ? "可读" : fileRead.reason,
    });

    console.log("凭据状态（只显示来源与指纹，绝无明文）");
    console.log(`凭据文件：${credentialsFilePath()}`);
    for (const r of rows) {
      console.log("");
      console.log(`  [${r.site}] ${r.host || ""}`);
      console.log(`    来源    : ${r.source}`);
      console.log(`    指纹    : ${r.fingerprint}`);
      console.log(`    文件状态: ${r.fileOk ? "可读" : r.fileReason}`);
    }
    console.log("");
    console.log("提示：环境变量优先于凭据文件；两者都没有时，取密码的函数会抛 CredentialError。");
    process.exit(0);
  }
  console.error("用法：node scripts/_credentials.js --status");
  process.exit(1);
}

module.exports = {
  SITES,
  SITE_ALIASES,
  GENERIC_SSH_ENV,
  CREDENTIALS_FILE_NAME,
  CREDENTIALS_FILE_ENV,
  CredentialError,
  dshHome,
  credentialsFilePath,
  resolveSite,
  fingerprint,
  readCredentialsFile,
  getServerPassword,
  tryGetServerPassword,
  getPgPassword,
  tryGetPgPassword,
  describeSource,
};
