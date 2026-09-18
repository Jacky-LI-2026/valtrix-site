const fs = require("fs");
const path = require("path");
const root = "D:/阀门网站";
const targets = ["需求沟通", "阀门选型", "报价交付", "了解工况", "报价与交期"];
const dirs = ["app/services", "components", "lib", "app/api/public"];
const exts = [".tsx", ".ts"];
function walk(d) {
  let out = [];
  try {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) out = out.concat(walk(p));
      else if (exts.includes(path.extname(e.name))) out.push(p);
    }
  } catch {}
  return out;
}
for (const dir of dirs) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) continue;
  for (const f of walk(base)) {
    const s = fs.readFileSync(f, "utf8");
    for (const t of targets) {
      const i = s.indexOf(t);
      if (i >= 0) {
        const line = s.slice(0, i).split("\n").length;
        console.log(`${f}:${line} :: ${t}`);
      }
    }
  }
}
