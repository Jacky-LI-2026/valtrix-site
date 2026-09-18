// kitz i18n key audit (read-only).
// Scans components/theme-kitzsct/**/*.tsx for kitz* string literals and reports which
// ones are missing from each language block of config/i18n.ts.
// Usage: node scripts/_kitz_i18n_audit.js [--json]
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const THEME_DIR = path.join(ROOT, "components", "theme-kitzsct");
const I18N = path.join(ROOT, "config", "i18n.ts");

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

// Strip block comments and line comments so literals inside comments are ignored.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

// Config-key names that legitimately start with "kitz" but are NOT i18n keys.
// kitz_group_sites is a site_config key name (see Footer.tsx GROUP_SITES_CONFIG_KEYS).
const NOT_I18N = new Set(["kitz_group_sites"]);

const files = walk(THEME_DIR, []);
const used = new Map(); // key -> Set(files)

for (const f of files) {
  const src = stripComments(fs.readFileSync(f, "utf8"));
  // Only string literals, so identifiers like kitzModelLabel inside code are still matched
  // when they appear as "kitzModelLabel".
  const re = /["'`]((?:kitz)[A-Za-z0-9_]+)["'`]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const k = m[1];
    if (NOT_I18N.has(k)) continue;
    if (!used.has(k)) used.set(k, new Set());
    used.get(k).add(path.relative(ROOT, f));
  }
}

const i18nSrc = fs.readFileSync(I18N, "utf8");

// Parse each language block: find "  zh: {" ... up to the next top-level "  xx: {".
const locales = ["zh", "en", "ja", "ko", "fr", "ar"];
const blockStart = {};
for (const loc of locales) {
  const re = new RegExp("^  " + loc + ": \\{", "m");
  const m = re.exec(i18nSrc);
  if (!m) {
    console.error("FATAL: cannot locate language block for " + loc);
    process.exit(2);
  }
  blockStart[loc] = m.index;
}
const offsets = locales
  .map((l) => ({ l, i: blockStart[l] }))
  .sort((a, b) => a.i - b.i)
  .map((x) => x.l);

const blocks = {};
for (let i = 0; i < offsets.length; i++) {
  const loc = offsets[i];
  const start = blockStart[loc];
  const end = i + 1 < offsets.length ? blockStart[offsets[i + 1]] : i18nSrc.length;
  blocks[loc] = i18nSrc.slice(start, end);
}

function keysIn(loc) {
  const set = new Set();
  const re = /^\s{4}([A-Za-z0-9_]+):/gm;
  let m;
  while ((m = re.exec(blocks[loc])) !== null) set.add(m[1]);
  return set;
}

const present = {};
for (const loc of locales) present[loc] = keysIn(loc);

const allKeys = [...used.keys()].sort();
const existingAnyLang = new Set();
for (const loc of locales) for (const k of present[loc]) existingAnyLang.add(k);

const missing = {};
for (const loc of locales) missing[loc] = allKeys.filter((k) => !present[loc].has(k));

const totalMissing = locales.reduce((n, l) => n + missing[l].length, 0);

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        files: files.map((f) => path.relative(ROOT, f)),
        keyCount: allKeys.length,
        keys: allKeys,
        missing,
        totalMissing,
        fileMap: Object.fromEntries(allKeys.map((k) => [k, [...used.get(k)]])),
      },
      null,
      2
    )
  );
  process.exit(0);
}

console.log("=== kitz i18n 键审计（只读）===");
console.log("主题目录  : " + path.relative(ROOT, THEME_DIR));
console.log("扫描文件  : " + files.length);
console.log("使用中的 kitz 键: " + allKeys.length);
console.log("已存在的 kitz 键: " + allKeys.filter((k) => existingAnyLang.has(k)).length);
console.log("待补 key×语种   : " + totalMissing + "  (" + allKeys.length + " 键 × 6 语种 = " + allKeys.length * 6 + ")");
console.log("");
for (const loc of locales) {
  console.log("  " + loc + " 缺失 " + missing[loc].length + " / " + allKeys.length);
}
console.log("");
console.log("--- 键清单（MISSING 表示 6 语种均缺）---");
for (const k of allKeys) {
  const bad = locales.filter((l) => !present[l].has(k));
  const tag = bad.length === 6 ? "MISSING" : bad.length === 0 ? "ok     " : "partial";
  const where = [...used.get(k)].map((f) => f.replace("components\\theme-kitzsct\\", "")).join(",");
  console.log("  " + tag + "  " + k + "   <- " + where);
}
console.log("");
console.log(totalMissing === 0 ? "RESULT: all keys present in all 6 languages" : "RESULT: " + totalMissing + " key/locale entries still missing");
