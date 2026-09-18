// 批量替换 VALTRIX 代码中的品牌残留
const fs = require("fs");
const jobs = [
  ["D:/阀门网站/components/admin/AdminSidebar.tsx", "'左文科技'", "'VALTRIX'"],
  ["D:/阀门网站/lib/seo/schema.ts", '"ZUO WEN TECHNOLOGY"', '"VALTRIX"'],
  ["D:/阀门网站/app/api/public/price/confirm/route.ts", "VALTRIX ZUO WEN TECHNOLOGY", "VALTRIX TECHNOLOGY"],
  ["D:/阀门网站/app/admin/ai-video/page.tsx", "MPCVD 金刚石生长设备宣传片", "超高纯管阀件产品宣传片"],
  ["D:/阀门网站/app/admin/product-categories/page.tsx", "如 mpcvd-equipment", "如 diaphragm-valve"],
];
for (const [p, a, b] of jobs) {
  try {
    let c = fs.readFileSync(p, "utf8");
    const n = c.split(a).length - 1;
    if (n === 0) { console.log("NO-MATCH", p.split("/").pop(), JSON.stringify(a)); continue; }
    c = c.split(a).join(b);
    fs.writeFileSync(p, c);
    console.log("OK", p.split("/").pop(), "x", n);
  } catch (e) { console.log("ERR", p, e.message); }
}
