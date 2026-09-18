// KITZ 模板「真实服务端 + 真实数据库」路由冒烟（只读：只发 GET，不写库）。
// 前置：本机 dev/prod server 已在 BASE 上运行；theme_config.templateSlug 已切到目标模板。
//
//   node scripts/_kitz_route_smoke.js                  # 正向：kitz-clean 下 8 条路由逐条断言
//   node scripts/_kitz_route_smoke.js --expect-default # 负向对照：默认模板 t2-industrial
//   node scripts/_kitz_route_smoke.js --expect-unilok  # 负向对照：UNILOK 模板 unilok-industrial
//
// ⚠️ 标记问题（AGENTS §7-22「假阳性哨兵比没有更危险」）—— 本项目**实际踩过两次**：
//   ① 第一版拿 kitz* 的中文文案当标记：**在 UNILOK 下同样命中**。因为两套主题文案大量同源
//      （`unilokEyebrowNews` 与 `kitzEyebrowNews` 都是「新闻与洞察」；
//       `unilokGetInTouch` 与 `kitzGetInTouch` 都是「期待与您合作」）。
//   ② 第二版拿"某个 class token"当全局标记：`border-dark`、`font-mono`、`text-sm text-dark-400`
//      在**其它模板的其它路由**上也会出现 ⇒ 负向对照直接变红（假阴性）。
//   ⇒ 标记现在**全部由 `scripts/_kitz_marker_matrix.js` 实测得出**（3 套模板 × 8 条路由 = 24 次抓取），
//      判据是「kitz-clean 下命中，且另两套模板在全部路由上都 0 命中」。
//   ⇒ 下方每个标记后的 `// A/B` 注释即该实测结论（kitz 命中数 / 其它模板命中数）。
//
// 两类标记：
//   ① 服务端同步渲染的路由 → 用 A/B 得出的 KITZ 独有标记
//   ② 客户端取数的详情/分区路由 → SSR 只到 loading 骨架，文案还没出现，故用**骨架差异**标记
"use strict";

const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";

// 详情/分区路由的 slug **每个站点不同**（基地是 zw-*，阀门站是 vcr-*），
// 故用环境变量覆盖，默认值 = 基地 dev 库实测存在的 slug。
const P_DETAIL = process.env.SMOKE_PRODUCT_DETAIL || "/products/growth/zw-10c";
const N_DETAIL = process.env.SMOKE_NEWS_DETAIL || "/news/jiuquan-project";
const A_SECTION = process.env.SMOKE_ABOUT_SECTION || "/about/profile";

const KITZ_ROUTES = [
  // A/B: 各 kitz 1/8 命中 · unilok 0/8 · t2 0/8（`border-dark` 单独用不行：其它模板 3/16 命中）
  { path: "/", must: ["focus-within:border-dark", "from-black/70", "leading-[1.1]"] },
  // A/B: kitz 4/8 · unilok 0/8 · t2 0/8 —— KitzPageHero 的大号幽灵页码
  { path: "/products", must: ["opacity-[0.045]"] },
  // A/B: kitz 1/8 · unilok 0/8 · t2 0/8 —— 1px 方框 spinner（UNILOK 是 rounded-full border-2）
  { path: P_DETAIL, must: ['<div class="h-8 w-8 animate-spin border border-gray-200 border-t-primary"'] },
  // A/B: kitz 4/8 · unilok 0/8 · t2 0/8
  { path: "/news", must: ["opacity-[0.045]"] },
  // A/B: kitz 3/8 · unilok 0/8 · t2 0/8 —— `<span class="text-sm text-dark-400">`（UNILOK 无 text-sm）
  { path: N_DETAIL, must: ['justify-center bg-white"><span class="text-sm text-dark-400"'] },
  // A/B: kitz 4/8 · unilok 0/8 · t2 0/8
  { path: "/about", must: ["opacity-[0.045]"] },
  // A/B: kitz 3/8 · unilok 0/8 · t2 0/8
  { path: A_SECTION, must: ['justify-center bg-white"><span class="text-sm text-dark-400"'] },
  // A/B: kitz 4/8 · unilok 0/8 · t2 0/8
  { path: "/contact", must: ["opacity-[0.045]"] },
];

let pass = 0;
let fail = 0;

function ok(m) {
  pass++;
  console.log("  PASS  " + m);
}
function bad(m) {
  fail++;
  console.log("  FAIL  " + m);
}

async function get(path) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  const body = await res.text();
  const dt = /data-template="([^"]+)"/.exec(body);
  return { status: res.status, body, template: dt ? dt[1] : "<无>" };
}

async function kitzMode() {
  console.log("=== 正向：KITZ 模板路由冒烟 @ " + BASE + " ===");
  for (const r of KITZ_ROUTES) {
    const tag = r.path.padEnd(26);
    let res;
    try {
      res = await get(r.path);
    } catch (e) {
      bad(tag + " 请求异常: " + e.message);
      continue;
    }
    if (res.status !== 200) {
      bad(tag + " HTTP " + res.status + "（期望 200）");
      continue;
    }
    if (res.template !== "kitz-clean") {
      bad(tag + " data-template=" + res.template + "（期望 kitz-clean）");
      continue;
    }
    const missing = r.must.filter((m) => !res.body.includes(m));
    if (missing.length) {
      bad(tag + " 缺少 KITZ 独有标记 " + JSON.stringify(missing) + "  len=" + res.body.length);
      continue;
    }
    ok(tag + " 200 · data-template=kitz-clean · KITZ 独有标记 " + r.must.length + "/" + r.must.length + " · len=" + res.body.length);
  }
}

// 负向对照与正向**逐路由配对**：对照路由 R 时，只检查 R 自己的那组标记。
// （第一版把 8 条路由的标记并成一个并集去查 5 条路由，本身就是错的对照方式。）
async function control(expectSlug) {
  console.log("=== 负向对照：期望模板 " + expectSlug + "，各路由自己的 KITZ 标记必须为 0 @ " + BASE + " ===");
  for (const r of KITZ_ROUTES) {
    let res;
    try {
      res = await get(r.path);
    } catch (e) {
      bad(r.path.padEnd(26) + " 请求异常: " + e.message);
      continue;
    }
    const hit = r.must.filter((m) => res.body.includes(m));
    if (res.status !== 200) {
      bad(r.path.padEnd(26) + " HTTP " + res.status);
    } else if (res.template !== expectSlug) {
      bad(r.path.padEnd(26) + " data-template=" + res.template + "（期望 " + expectSlug + "）");
    } else if (hit.length) {
      bad(r.path.padEnd(26) + " 仍含 KITZ 独有标记 " + JSON.stringify(hit));
    } else {
      ok(r.path.padEnd(26) + " 200 · data-template=" + expectSlug + " · 该项 KITZ 标记 0 个 · len=" + res.body.length);
    }
  }
}

(async () => {
  if (process.argv.includes("--expect-default")) {
    await control("t2-industrial");
  } else if (process.argv.includes("--expect-unilok")) {
    await control("unilok-industrial");
  } else {
    await kitzMode();
  }
  console.log("");
  console.log("================ 汇总 ================");
  console.log("PASS: " + pass + "   FAIL: " + fail);
  process.exit(fail === 0 ? 0 : 1);
})();
