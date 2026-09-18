const fs = require("fs");
const prod = JSON.parse(fs.readFileSync("D:/阀门网站/_qa_audit_20260909/_api_products.json", "utf8"));
const tabs = Array.isArray(prod) ? prod : prod.data || [];
for (const t of tabs) {
  for (const c of t.categories || []) {
    for (const m of c.models || []) {
      if (["dv7-diaphragm-valve", "ft4-gas-filter", "bv6-ball-valve"].includes(m.id)) {
        console.log("===" + m.id + "===");
        for (const k of ["description", "descriptionEn", "descriptionJa", "descriptionKo", "descriptionFr", "descriptionAr"]) {
          console.log("  " + k + " = " + JSON.stringify(m[k]));
        }
      }
    }
  }
}
