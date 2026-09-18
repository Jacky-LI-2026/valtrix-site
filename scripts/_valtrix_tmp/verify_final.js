// 最终全面验证：about 三语种 + 全语种首页
const fs = require("fs");
const { execSync } = require("child_process");
function curl(url, out, cookie) {
  try {
    execSync(`curl.exe -s -m 30 --cookie "locale=${cookie}" "${url}" -o "${out}"`, { stdio: "pipe" });
  } catch (e) {}
}
const T = process.env.TEMP;
for (const loc of ["zh", "en", "ja", "ko", "fr", "ar"]) {
  curl("https://www.valvetrix.com/", `${T}\\f3_${loc}.html`, loc);
}
for (const loc of ["ja", "ko", "ar"]) {
  curl("https://www.valvetrix.com/about/profile", `${T}\\ab_${loc}.html`, loc);
}
function txt(p) {
  let c = fs.readFileSync(p, "utf8");
  return c.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
console.log("--- 首页全语种 ---");
for (const loc of ["zh", "en", "ja", "ko", "fr", "ar"]) {
  const c = fs.readFileSync(`${T}\\f3_${loc}.html`, "utf8");
  const lang = (c.match(/<html[^>]*lang="([^"]*)"/) || [])[1] || "?";
  const dir = (c.match(/<html[^>]*dir="([^"]*)"/) || [])[1] || "ltr";
  const hits = (c.match(/MPCVD|左文|zuowen|金刚石|培育钻石|碳寻|Diamond Paving|ZUO WEN/g) || []).length;
  console.log(`${loc}: lang=${lang} dir=${dir} HITS=${hits}`);
}
console.log("--- about/profile 三语种 ---");
for (const loc of ["ja", "ko", "ar"]) {
  const t = txt(`${T}\\ab_${loc}.html`);
  const isErr = t.includes("Internal Server Error") || t.includes("页面出了点问题");
  const i = t.indexOf("VALTRIX");
  console.log(`${loc}: len=${t.length} is500=${isErr} body=${t.slice(Math.max(0, i), i + 150)}`);
}
