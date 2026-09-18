// 线上 API 六语种验证
const https = require("https");

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "Accept": "application/json" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data.slice(0, 200) }); }
      });
    }).on("error", reject);
  });
}

function checkField(obj, field, lang) {
  const key = field + (lang === "zh" ? "" : lang.charAt(0).toUpperCase() + lang.slice(1));
  const v = obj[key];
  if (v === null || v === undefined || v === "") return `MISSING(${key})`;
  if (Array.isArray(v)) return v.length > 0 ? `OK(${v.length} items)` : `EMPTY_ARRAY`;
  if (typeof v === "object") return `OK(obj)`;
  return `OK("${String(v).slice(0, 40)}")`;
}

async function main() {
  const base = "https://www.valvetrix.com";
  const langs = ["zh", "en", "ja", "ko", "fr", "ar"];

  console.log("=== 1. Languages API ===");
  const lang = await fetch(base + "/api/public/languages");
  console.log("status:", lang.status, "langs:", JSON.stringify(lang.body?.data || lang.body));

  console.log("\n=== 2. Careers (jobs) - first job multilingual ===");
  const careers = await fetch(base + "/api/public/careers");
  const jobs = careers.body?.data || careers.body || [];
  console.log("count:", jobs.length);
  if (jobs[0]) {
    for (const l of langs) {
      console.log(`  ${l}: title=${checkField(jobs[0], "title", l)} dept=${checkField(jobs[0], "department", l)} resp=${checkField(jobs[0], "responsibilities", l)}`);
    }
  }

  console.log("\n=== 3. Services - process multilingual ===");
  const services = await fetch(base + "/api/public/services");
  const svcs = services.body?.data || services.body || [];
  console.log("count:", svcs.length);
  if (svcs[0]) {
    for (const l of langs) {
      const key = "process" + (l === "zh" ? "" : l.charAt(0).toUpperCase() + l.slice(1));
      const v = svcs[0][key];
      console.log(`  ${l}: process=${v ? `OK(${Array.isArray(v) ? v.length + " steps" : "obj"})` : "MISSING"}`);
    }
  }

  console.log("\n=== 4. Industries - zh should be Chinese ===");
  const ind = await fetch(base + "/api/public/industries");
  const inds = ind.body?.data || ind.body || [];
  console.log("count:", inds.length);
  if (inds[0]) {
    console.log(`  zh name: "${inds[0].name?.slice(0, 40)}"`);
    console.log(`  en name: "${inds[0].nameEn?.slice(0, 40)}"`);
    console.log(`  ja name: "${inds[0].nameJa?.slice(0, 40)}"`);
    console.log(`  has CJK in zh: ${/[\u4e00-\u9fff]/.test(inds[0].name || "")}`);
  }

  console.log("\n=== 5. News - zh should be Chinese ===");
  const news = await fetch(base + "/api/public/news");
  const nw = news.body?.data || news.body || [];
  console.log("count:", nw.length);
  if (nw[0]) {
    console.log(`  zh title: "${nw[0].title?.slice(0, 60)}"`);
    console.log(`  en title: "${nw[0].titleEn?.slice(0, 60)}"`);
    console.log(`  has CJK in zh: ${/[\u4e00-\u9fff]/.test(nw[0].title || "")}`);
  }

  console.log("\n=== 6. Home config banners ===");
  const hc = await fetch(base + "/api/public/home-config");
  const banners = hc.body?.banners || hc.body?.data?.banners || [];
  console.log("banners:", banners.length);
  if (banners[0]) {
    for (const l of langs) {
      console.log(`  ${l}: title="${banners[0].title?.[l]?.slice(0, 50)}"`);
    }
  }

  console.log("\n=== 7. Products - fittings name multilingual ===");
  const prods = await fetch(base + "/api/public/products");
  const pArr = prods.body?.data || prods.body || [];
  const fitting = pArr.find((p) => p.name?.includes("接头") || p.nameEn?.includes("Fitting") || p.name?.includes("密封"));
  if (fitting) {
    console.log(`  found: ${fitting.name}`);
    for (const l of langs) {
      console.log(`    ${l}: ${checkField(fitting, "name", l)}`);
    }
  } else {
    console.log("  no fitting product found, checking first 3:");
    pArr.slice(0, 3).forEach((p) => console.log(`    ${p.name} / ${p.nameEn}`));
  }

  console.log("\n=== DONE ===");
}

main().catch((e) => console.error("ERROR:", e.message));
