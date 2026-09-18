// Insert the kitz* i18n keys into config/i18n.ts (all 6 language blocks).
//
//   node scripts/_kitz_i18n_apply.js            # apply (makes a .bak-<ts> first)
//   node scripts/_kitz_i18n_apply.js --dry-run  # validate + report only
//   node scripts/_kitz_i18n_apply.js --revert <bakfile>   # restore a backup
//
// Source of truth for zh: scripts/_kitz_i18n_seed.json
// Translations:            scripts/_kitz_i18n_out/<locale>.json  (en/ja/ko/fr/ar)
//
// The inserted region is fenced by marker comments so re-running is idempotent:
// an existing fenced region is removed before the fresh one is inserted.
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const I18N = path.join(ROOT, "config", "i18n.ts");
const SEED = path.join(ROOT, "scripts", "_kitz_i18n_seed.json");
const OUT_DIR = path.join(ROOT, "scripts", "_kitz_i18n_out");

const LOCALES = ["zh", "en", "ja", "ko", "fr", "ar"];
const FENCE_OPEN = "    // === KITZ 洁净科技风模板（kitz-clean）新增键 · 由 scripts/_kitz_i18n_apply.js 自动生成，勿手改 ===";
const FENCE_CLOSE = "    // === /KITZ ===";

// Values that are pure ASCII uppercase Latin are decorative eyebrow labels and
// must stay identical across every locale (see _meta.translatorNote in the seed).
function isEyebrow(s) {
  return /^[A-Z0-9 &/-]+$/.test(s);
}

function fail(msg) {
  console.error("FAIL: " + msg);
  process.exit(1);
}

// ---------- revert mode ----------
const revertIdx = process.argv.indexOf("--revert");
if (revertIdx !== -1) {
  const bak = process.argv[revertIdx + 1];
  if (!bak || !fs.existsSync(bak)) fail("backup file not found: " + bak);
  fs.copyFileSync(bak, I18N);
  console.log("reverted config/i18n.ts from " + bak);
  process.exit(0);
}

const dryRun = process.argv.includes("--dry-run");

// ---------- load + validate sources ----------
const seed = JSON.parse(fs.readFileSync(SEED, "utf8"));
const zhKeys = seed.keys;
const keyList = Object.keys(zhKeys);
if (keyList.length === 0) fail("seed has no keys");

const perLocale = { zh: zhKeys };
for (const loc of LOCALES) {
  if (loc === "zh") continue;
  const p = path.join(OUT_DIR, loc + ".json");
  if (!fs.existsSync(p)) fail("missing translation file: " + p);
  perLocale[loc] = JSON.parse(fs.readFileSync(p, "utf8"));
}

let problems = 0;
for (const loc of LOCALES) {
  const map = perLocale[loc];
  const got = Object.keys(map);
  const missing = keyList.filter((k) => !got.includes(k));
  const extra = got.filter((k) => !keyList.includes(k));
  const empty = got.filter((k) => !map[k] || !String(map[k]).trim());
  const unescaped = got.filter((k) => /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(String(map[k])));
  if (missing.length || extra.length || empty.length || unescaped.length) {
    problems++;
    console.error(
      "  " + loc + ": missing=" + JSON.stringify(missing) + " extra=" + JSON.stringify(extra) +
        " empty=" + JSON.stringify(empty) + " ctrlChars=" + JSON.stringify(unescaped)
    );
  }
}
if (problems) fail("translation files are not complete: " + problems + " locale(s) bad");

// eyebrow keys must be verbatim English in every locale
for (const loc of LOCALES) {
  const bad = keyList.filter((k) => isEyebrow(zhKeys[k]) && perLocale[loc][k] !== zhKeys[k]);
  if (bad.length) fail("locale " + loc + ": eyebrow keys must stay verbatim -> " + JSON.stringify(bad));
}

console.log("=== kitz i18n 注入 ===");
console.log("键数        : " + keyList.length + " × " + LOCALES.length + " 语种 = " + keyList.length * LOCALES.length + " 条");
console.log("eyebrow 键  : " + keyList.filter((k) => isEyebrow(zhKeys[k])).length + " 个（各语种逐字相同）");

// ---------- read target ----------
if (!fs.existsSync(I18N)) fail("not found: " + I18N);
const original = fs.readFileSync(I18N, "utf8");
const eol = original.includes("\r\n") ? "\r\n" : "\n";
let src = original.includes("\r\n") ? original.replace(/\r\n/g, "\n") : original;

// ---------- locate language blocks ----------
const blockStart = {};
for (const loc of LOCALES) {
  const m = new RegExp("^  " + loc + ": \\{", "m").exec(src);
  if (!m) fail("cannot locate language block: " + loc);
  blockStart[loc] = m.index;
}
const order = LOCALES.slice().sort((a, b) => blockStart[a] - blockStart[b]);
for (let i = 0; i + 1 < order.length; i++) {
  if (!(blockStart[order[i]] < blockStart[order[i + 1]])) fail("language blocks are not in a stable order");
}

// ---------- idempotency: strip a previously inserted fenced region ----------
function stripFence(text) {
  const re = new RegExp(
    "^" + FENCE_OPEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\n[\\s\\S]*?^" + FENCE_CLOSE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\n",
    "gm"
  );
  const hits = (text.match(re) || []).length;
  return { text: text.replace(re, ""), hits };
}
const stripped = stripFence(src);
if (stripped.hits) console.log("已存在旧的 KITZ 区块 " + stripped.hits + " 处 → 先移除再重插（幂等）");
src = stripped.text;

// ---------- build the insertion payload per locale ----------
function blockFor(loc) {
  const map = perLocale[loc];
  const lines = [FENCE_OPEN];
  for (const k of keyList) lines.push("    " + k + ": " + JSON.stringify(String(map[k])) + ",");
  lines.push(FENCE_CLOSE);
  return lines.join("\n") + "\n";
}

// Insert right after each block's opening line, working bottom-up so earlier
// offsets stay valid.
const insertAt = {};
for (const loc of LOCALES) {
  const idx = src.indexOf("{", blockStart[loc]);
  const nl = src.indexOf("\n", idx);
  if (nl === -1) fail("malformed opening line for " + loc);
  insertAt[loc] = nl + 1;
}
const sorted = LOCALES.slice().sort((a, b) => insertAt[b] - insertAt[a]);
let out = src;
for (const loc of sorted) {
  out = out.slice(0, insertAt[loc]) + blockFor(loc) + out.slice(insertAt[loc]);
}

if (eol !== "\n") out = out.replace(/\n/g, eol);

// ---------- sanity check on the produced text ----------
for (const loc of LOCALES) {
  const re = new RegExp("^  " + loc + ": \\{", "m");
  if (!re.test(out)) fail("produced text lost the " + loc + " block");
}
const fenceCount = (out.match(/=== KITZ 洁净科技风模板/g) || []).length;
if (fenceCount !== LOCALES.length) fail("expected " + LOCALES.length + " KITZ fences, got " + fenceCount);
const newLines = out.split("\n").length - original.split("\n").length;

console.log("行数变化    : +" + newLines);
console.log("原体积      : " + original.length + " B  →  " + out.length + " B");

if (dryRun) {
  console.log("--dry-run：未写入任何文件。");
  process.exit(0);
}

// ---------- backup + write ----------
const ts = new Date()
  .toISOString()
  .replace(/[-:T]/g, "")
  .slice(0, 14);
const bak = I18N + ".bak-kitz-" + ts;
fs.copyFileSync(I18N, bak);
fs.writeFileSync(I18N, out, "utf8");
console.log("备份        : " + bak);
console.log("已写入      : " + I18N);
console.log("回滚        : node scripts/_kitz_i18n_apply.js --revert \"" + bak + "\"");
