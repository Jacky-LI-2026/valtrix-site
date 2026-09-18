#!/usr/bin/env node
/**
 * 商用授权码生成工具（授权方本机使用，勿放入客户部署包）
 *
 * 用法：
 *   node scripts/license-gen.js --cid "某公司" --domain www.example.com --edition pro --exp 2027-12-31
 *   node scripts/license-gen.js --cid "某公司" --domain a.com,b.com --edition enterprise --exp permanent
 *   node scripts/license-gen.js --cid "某公司" --edition trial --exp 30d --seats 1
 *
 * 参数：
 *   --cid      客户标识（公司名/客户ID）      必填
 *   --domain   绑定域名，逗号分隔多个；缺省=不限制域名
 *   --edition  trial | pro | enterprise      默认 pro
 *   --exp      永久=0/permanent；30d=30天；或具体日期 2027-12-31   默认永久
 *   --seats    授权站点数（默认 1）
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

const cid = getArg("--cid");
if (!cid) {
  console.error("缺少 --cid（客户标识），示例：\n  node scripts/license-gen.js --cid \"某公司\" --domain www.example.com --edition pro --exp 2027-12-31");
  process.exit(1);
}

const domainRaw = getArg("--domain") || "";
const domains = domainRaw
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const edition = getArg("--edition") || "pro";
if (!["trial", "pro", "enterprise"].includes(edition)) {
  console.error("--edition 只能是 trial / pro / enterprise");
  process.exit(1);
}

const expRaw = getArg("--exp") || "permanent";
let exp = 0;
if (expRaw !== "0" && expRaw.toLowerCase() !== "permanent") {
  const daysMatch = expRaw.match(/^(\d+)d$/i);
  if (daysMatch) {
    exp = Math.floor(Date.now() / 1000) + parseInt(daysMatch[1], 10) * 86400;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(expRaw)) {
    exp = Math.floor(new Date(expRaw + "T23:59:59").getTime() / 1000);
  } else {
    console.error("--exp 格式错误：permanent/0/30d/2027-12-31");
    process.exit(1);
  }
}

const seats = parseInt(getArg("--seats") || "1", 10) || 1;

const privateKey = fs.readFileSync(path.join(__dirname, "license-keys", "private.pem"), "utf8");

const payload = {
  cid,
  domains,
  edition,
  exp,
  issued: Math.floor(Date.now() / 1000),
  seats,
};

const payloadStr = JSON.stringify(payload);
const signer = crypto.createSign("RSA-SHA256");
signer.update(payloadStr);
signer.end();
const sig = signer.sign(privateKey);

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const code = `${b64url(payloadStr)}.${b64url(sig)}`;

const expText = exp === 0 ? "永久" : new Date(exp * 1000).toLocaleString("zh-CN");
console.log("\n========== 授权码 ==========");
console.log(code);
console.log("============================");
console.log(`客户: ${cid}`);
console.log(`域名: ${domains.length ? domains.join(", ") : "不限"}`);
console.log(`版本: ${edition}`);
console.log(`到期: ${expText}`);
console.log(`站点: ${seats}`);
console.log("\n请将上方授权码交给客户，客户在后台「授权管理」页粘贴激活。");
