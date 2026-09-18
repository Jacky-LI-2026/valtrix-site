// 检查 i18n.ts 中是否已有产品/行业名称的字典 key
const fs = require("fs");
const c = fs.readFileSync("D:/阀门网站/config/i18n.ts", "utf8");
const keys = [
  "vcrFittings", "weldedFittings", "diaphragmValves", "pressureReducers", "checkValves", "gasFilters",
  "semiconductor", "biopharmaceutical", "ledDisplay", "solar", "hydrogen", "researchLabs",
  "productManual", "catalogs", "certification", "drawings", "profile", "honors", "history",
  "valveSelection", "technicalSupport", "afterSales", "downloads"
];
for (const k of keys) {
  const found = c.includes(`"${k}"`) || c.includes(`'${k}'`) || c.includes(`  ${k}:`) || c.includes(`${k}: `);
  console.log(k, found ? "EXISTS" : "-");
}
