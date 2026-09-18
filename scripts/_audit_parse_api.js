// 解析线上 API，输出真实 slug/id 清单
const fs = require("fs");
const base = "D:/阀门网站/_qa_audit_20260909/";
const prod = JSON.parse(fs.readFileSync(base + "_api_products.json", "utf8"));
const tabs = Array.isArray(prod) ? prod : prod.data || [];
console.log("== PRODUCTS (target models) ==");
const targets = ["FT4", "DV22A", "BV6", "BV7", "NV2", "NV4", "NV6", "GV", "3D", "5D"];
for (const t of tabs) {
  for (const c of t.categories || []) {
    for (const m of c.models || []) {
      const hasImg = (m.images && m.images.length) || m.image;
      const model = String(m.model || "").toUpperCase();
      if (targets.includes(model) || String(m.id || "").includes("ft4") || String(m.id || "").includes("dv22") || String(m.id || "").includes("bv6")) {
        console.log(JSON.stringify({ tab: t.id, cat: c.id, id: m.id, model: m.model, img: hasImg ? 1 : 0, name: m.name }));
      }
    }
  }
}
console.log("== PRODUCT tab/cat counts ==");
for (const t of tabs) {
  console.log(t.id, (t.categories || []).reduce((a, c) => a + (c.models ? c.models.length : 0), 0));
}
const svc = JSON.parse(fs.readFileSync(base + "_api_services.json", "utf8"));
console.log("== SERVICES ==");
for (const s of Array.isArray(svc) ? svc : []) {
  console.log(s.slug, "|", s.title, "|", s.titleEn, "| rel:", JSON.stringify(s.relatedServiceSlugs));
}
const ind = JSON.parse(fs.readFileSync(base + "_api_industries.json", "utf8"));
console.log("== INDUSTRIES ==");
for (const i of Array.isArray(ind) ? ind : []) console.log(i.slug, "|", i.name, "|", i.nameEn);
const news = JSON.parse(fs.readFileSync(base + "_api_news.json", "utf8"));
console.log("== NEWS ==");
for (const n of Array.isArray(news) ? news : []) console.log(n.slug, "|", n.title, "|", n.titleEn);
const car = JSON.parse(fs.readFileSync(base + "_api_careers.json", "utf8"));
console.log("== CAREERS ==");
for (const j of Array.isArray(car) ? car : []) console.log(j.slug, "|", j.title, "|", j.titleEn);
const res = JSON.parse(fs.readFileSync(base + "_api_resources.json", "utf8"));
console.log("== RESOURCES ==");
for (const r of Array.isArray(res) ? res : []) {
  const noUrl = (r.items || []).filter((x) => !x.fileUrl || x.fileUrl === "#").length;
  console.log(r.type, "|", r.title, "|", r.titleEn, "| items:", r.items ? r.items.length : 0, "| noUrl:", noUrl);
}
const ab = JSON.parse(fs.readFileSync(base + "_api_about.json", "utf8"));
console.log("== ABOUT ==");
for (const a of Array.isArray(ab) ? ab : []) console.log(a.slug, "|", a.title, "|", a.titleEn);
