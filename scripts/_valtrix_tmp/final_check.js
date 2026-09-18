// 最终全语种首页复核
const fs = require("fs");
for (const loc of ["zh", "en", "ja", "ko", "fr", "ar"]) {
  const p = process.env.TEMP + "/final_" + loc + ".html";
  if (!fs.existsSync(p)) { console.log(loc, "FILE_MISSING"); continue; }
  const c = fs.readFileSync(p, "utf8");
  const lang = (c.match(/<html[^>]*lang="([^"]*)"/) || [])[1] || "?";
  const dir = (c.match(/<html[^>]*dir="([^"]*)"/) || [])[1] || "ltr";
  const hits = (c.match(/MPCVD|左文|zuowen|金刚石|培育钻石|碳寻|Diamond Paving|ZUO WEN/g) || []).length;
  const hero = (c.match(/Ultra-High Purity[^<]{0,50}/) || [""])[0];
  console.log(loc + ": lang=" + lang + " dir=" + dir + " HITS=" + hits + " hero=" + hero);
}
