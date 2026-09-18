#!/usr/bin/env node
/**
 * 左文科技 商用授权码 CLI 工具（授权方本机使用，勿放入客户部署包）
 *
 * 依赖：仅 Node.js 内置模块（crypto/fs/path/readline），无需安装任何包。
 * 私钥：scripts/license-keys/private.pem（与系统验签公钥配对的 RSA-2048 私钥）
 *
 * 用法：
 *   # 1) 生成授权码（命令参数式）
 *   node scripts/license-cli.js gen --cid "某公司" --domain www.example.com --edition pro --exp 2027-12-31 --seats 1
 *   node scripts/license-cli.js gen --cid "某公司" --domain a.com,b.com --edition enterprise --exp permanent
 *   node scripts/license-cli.js gen --cid "某公司" --edition trial --exp 30d
 *
 *   # 2) 生成授权码（交互式：直接运行，按提示输入）
 *   node scripts/license-cli.js gen
 *
 *   # 3) 校验授权码（离线验签，返回是否有效 + 授权信息）
 *   node scripts/license-cli.js verify "授权码..."
 *
 *   # 4) 解析授权码信息（不解密签名，仅展示内容）
 *   node scripts/license-cli.js info "授权码..."
 *
 *   # 5) 查看历史签发记录（保存在 data/license-records.json）
 *   node scripts/license-cli.js list
 *
 *   # 6) 批量生成（CSV：cid,domain,edition,exp,seats，第一行为表头可省略）
 *   node scripts/license-cli.js batch --file customers.csv [--out codes.txt]
 *
 * 参数说明：
 *   --cid      客户标识（公司名/客户ID）       必填（交互式除外）
 *   --domain   绑定域名，逗号分隔多个；缺省=不限制域名
 *   --edition  trial | pro | enterprise        默认 pro
 *   --exp      永久/permanent/0 = 永久；30d = 30天；或具体日期 2027-12-31   默认永久
 *   --seats    授权站点数（默认 1）
 *   --out      输出文件路径（可选，授权码同时写入文件）
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ---------- 常量 ----------
const PRIVATE_KEY_PATH = path.join(__dirname, "license-keys", "private.pem");
const RECORDS_PATH = path.join(__dirname, "..", "data", "license-records.json");
const EDITIONS = ["trial", "pro", "enterprise"];

// 系统验签公钥（与 lib/license/keys.ts 保持一致；公钥可公开）
const PUBLIC_KEY = `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA1gZKxNS7cUHjnIOEV85RWedyT/HjsPS1HcZJgLCv3PM/iSxGic1e
pZZX2Q3i/WGQVzttJdhyOPA4VFFB8Q91Uk31iFrDFedP11Eu9Z7pCR/LYrtaSdL2
lUm2xmaVqVyRVXeLk9uiwCQast65TtXNQyEmVoAXzI890nPmMNuT94S6+3oEjB93
zM4wyIroaUigmRPYVsDZQ6OtZjSnSlFij7VBcBEj51IelofuzgtasD7StvcJcPBj
vE8gfkJ/2ZATAZJovAN8IzRHJwquADJfYO7K7fhY3Hx1UwTly3iHw86dGl54JpYy
K1h2n3rtMN6eOyLMXBiDApjG+lAAD0Va/QIDAQAB
-----END RSA PUBLIC KEY-----`;

// ---------- 工具函数 ----------
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from((s + pad).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function getArg(args, name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}
function normalizeDomain(d) {
  return String(d).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}
function parseExp(expRaw) {
  if (expRaw === "0" || String(expRaw).toLowerCase() === "permanent" || expRaw === undefined || expRaw === "") return 0;
  const daysMatch = String(expRaw).match(/^(\d+)d$/i);
  if (daysMatch) return Math.floor(Date.now() / 1000) + parseInt(daysMatch[1], 10) * 86400;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(expRaw))) return Math.floor(new Date(String(expRaw) + "T23:59:59").getTime() / 1000);
  throw new Error("--exp 格式错误，支持：permanent / 0 / 30d / 2027-12-31");
}
function expText(exp) {
  return exp === 0 ? "永久" : new Date(exp * 1000).toLocaleString("zh-CN");
}
function loadRecords() {
  try { return JSON.parse(fs.readFileSync(RECORDS_PATH, "utf8")); } catch { return []; }
}
function saveRecord(rec) {
  try {
    const list = loadRecords();
    list.push(rec);
    fs.mkdirSync(path.dirname(RECORDS_PATH), { recursive: true });
    fs.writeFileSync(RECORDS_PATH, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.warn("（警告：签发记录写入失败：" + e.message + "）");
  }
}
function signLicense(payload) {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
  const payloadStr = JSON.stringify(payload);
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(payloadStr);
  signer.end();
  const sig = signer.sign(privateKey);
  return `${b64url(payloadStr)}.${b64url(sig)}`;
}
function verifyLicense(code) {
  try {
    const [p, s] = String(code).trim().split(".");
    if (!p || !s) return { ok: false, error: "授权码格式错误（应为 payload.签名 两段）" };
    const payloadStr = b64urlDecode(p).toString("utf8");
    const sig = b64urlDecode(s);
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(payloadStr);
    verifier.end();
    const ok = verifier.verify(PUBLIC_KEY, sig);
    if (!ok) return { ok: false, error: "签名校验失败（授权码被篡改或公钥不匹配）" };
    const payload = JSON.parse(payloadStr);
    return { ok: true, payload };
  } catch (e) {
    return { ok: false, error: "解析失败：" + e.message };
  }
}

// ---------- 交互式输入 ----------
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

// ---------- 子命令：gen ----------
async function cmdGen(args) {
  let cid = getArg(args, "--cid");
  const interactive = !cid;
  if (interactive) {
    console.log("== 交互式生成授权码 ==");
    cid = await ask("客户标识（公司名/客户ID，必填）：");
    if (!cid) { console.error("客户标识不能为空"); process.exit(1); }
  }
  const domainRaw = interactive ? await ask("绑定域名（逗号分隔多个，直接回车=不限制）：") : (getArg(args, "--domain") || "");
  const domains = domainRaw.split(",").map(normalizeDomain).filter(Boolean);

  let edition = getArg(args, "--edition") || "pro";
  let expRaw = getArg(args, "--exp") || "permanent";
  let seats = parseInt(getArg(args, "--seats") || "1", 10) || 1;
  if (interactive) {
    edition = await ask(`版本（trial/pro/enterprise，默认 pro）：`) || "pro";
    expRaw = await ask("有效期（permanent/30d/2027-12-31，默认 permanent）：") || "permanent";
    seats = parseInt(await ask("授权站点数（默认 1）：") || "1", 10) || 1;
  }
  if (!EDITIONS.includes(edition)) { console.error("--edition 只能是 trial / pro / enterprise"); process.exit(1); }
  let exp;
  try { exp = parseExp(expRaw); } catch (e) { console.error(e.message); process.exit(1); }

  const payload = {
    cid,
    domains,
    edition,
    exp,
    issued: Math.floor(Date.now() / 1000),
    seats,
  };
  const code = signLicense(payload);

  console.log("\n========== 授权码 ==========");
  console.log(code);
  console.log("============================");
  console.log(`客户: ${cid}`);
  console.log(`域名: ${domains.length ? domains.join(", ") : "不限"}`);
  console.log(`版本: ${edition}`);
  console.log(`到期: ${expText(exp)}`);
  console.log(`站点: ${seats}`);

  const out = getArg(args, "--out");
  if (out) {
    fs.writeFileSync(out, code + "\n", "utf8");
    console.log(`已写入文件: ${path.resolve(out)}`);
  }
  saveRecord({ cid, domains, edition, exp, issued: payload.issued, seats, code, createdAt: new Date().toISOString() });
  console.log("\n请将上方授权码交给客户，客户在后台「系统部署 → 授权管理」页粘贴激活。");
}

// ---------- 子命令：verify ----------
function cmdVerify(args) {
  const code = args.find((a) => a && !a.startsWith("--"));
  if (!code) { console.error("用法：node scripts/license-cli.js verify \"授权码\""); process.exit(1); }
  const r = verifyLicense(code);
  if (!r.ok) { console.error("❌ 授权码无效：" + r.error); process.exit(1); }
  const p = r.payload;
  console.log("✅ 授权码有效");
  console.log(`客户: ${p.cid}`);
  console.log(`域名: ${p.domains && p.domains.length ? p.domains.join(", ") : "不限"}`);
  console.log(`版本: ${p.edition}`);
  console.log(`签发: ${new Date(p.issued * 1000).toLocaleString("zh-CN")}`);
  console.log(`到期: ${expText(p.exp)}` + (p.exp && p.exp * 1000 < Date.now() ? "（⚠️ 已过期）" : ""));
  console.log(`站点: ${p.seats}`);
}

// ---------- 子命令：info ----------
function cmdInfo(args) {
  const code = args.find((a) => a && !a.startsWith("--"));
  if (!code) { console.error("用法：node scripts/license-cli.js info \"授权码\""); process.exit(1); }
  try {
    const [p] = String(code).trim().split(".");
    const payload = JSON.parse(b64urlDecode(p).toString("utf8"));
    console.log(JSON.stringify(payload, null, 2));
    console.log(`到期: ${expText(payload.exp)}`);
  } catch (e) {
    console.error("解析失败：" + e.message);
    process.exit(1);
  }
}

// ---------- 子命令：list ----------
function cmdList() {
  const list = loadRecords();
  if (!list.length) { console.log("暂无签发记录（data/license-records.json）"); return; }
  console.log("历史签发记录（共 " + list.length + " 条）：");
  list.slice().reverse().forEach((r, i) => {
    console.log(`${list.length - i}. [${r.edition}] ${r.cid} | 域名:${(r.domains || []).join(",") || "不限"} | 到期:${expText(r.exp)} | 签发:${new Date(r.issued * 1000).toLocaleString("zh-CN")}`);
  });
}

// ---------- 子命令：batch ----------
async function cmdBatch(args) {
  const file = getArg(args, "--file");
  if (!file) { console.error("用法：node scripts/license-cli.js batch --file customers.csv [--out codes.txt]"); process.exit(1); }
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = lines.filter((l, i) => !(i === 0 && /^cid/i.test(l))); // 跳过可选表头
  const defEdition = getArg(args, "--edition") || "pro";
  const defExp = getArg(args, "--exp") || "permanent";
  const defSeats = parseInt(getArg(args, "--seats") || "1", 10) || 1;
  const out = getArg(args, "--out");
  let outText = "";
  let n = 0, fail = 0;
  for (const line of rows) {
    const [cid, domain = "", edition = defEdition, exp = defExp, seatsRaw = String(defSeats)] = line.split(",").map((x) => x.trim());
    if (!cid) { fail++; continue; }
    try {
      const domains = domain ? domain.split(";").map(normalizeDomain).filter(Boolean) : [];
      const payload = { cid, domains, edition, exp: parseExp(exp), issued: Math.floor(Date.now() / 1000), seats: parseInt(seatsRaw, 10) || 1 };
      const code = signLicense(payload);
      saveRecord({ ...payload, code, createdAt: new Date().toISOString() });
      outText += `${cid}\t${code}\n`;
      console.log(`✅ ${cid} → ${code.slice(0, 40)}...`);
      n++;
    } catch (e) { fail++; console.error(`❌ ${cid} 失败：${e.message}`); }
  }
  console.log(`\n批量完成：成功 ${n} 条，失败 ${fail} 条`);
  if (out) { fs.writeFileSync(out, outText, "utf8"); console.log("授权码已写入: " + path.resolve(out)); }
}

// ---------- 主入口 ----------
(async () => {
  const args = process.argv.slice(2);
  const cmd = args[0] || "gen";
  switch (cmd) {
    case "gen": await cmdGen(args.slice(1)); break;
    case "verify": cmdVerify(args.slice(1)); break;
    case "info": cmdInfo(args.slice(1)); break;
    case "list": cmdList(); break;
    case "batch": await cmdBatch(args.slice(1)); break;
    case "-h": case "--help": case "help":
      console.log(fs.readFileSync(__filename, "utf8").split("const crypto = require")[0].replace(/^\/\*/, "").replace(/\*\/\s*$/, ""));
      break;
    default:
      console.error("未知命令：" + cmd + "（支持 gen / verify / info / list / batch）");
      process.exit(1);
  }
})();
