/**
 * 回归：商城商品「后台保存 → 库 → 公开接口」往返不丢字段。
 *
 * 复现的是本项目反复踩过的老坑（见 `_check_content_form_roundtrip.ts` 头部）：
 *   多语言字段只回填中文 ⇒ 一保存就把其它语种清空；SEO/GEO、多图同理。
 *   （2026-10-14 实测：修复前的阀门站编辑页就是这样 —— 只回填中文，
 *    列表接口虽然返回全字段，但页面 `openEdit` 没读，保存即抹掉已翻译语种。）
 *
 * 覆盖：① 新建后 23 个语种/SEO/GEO 字段落库 ② 列表接口回填 ③ 二次保存不清空
 *      ④ 公开接口（前台详情页数据源）可见 ⑤ 收款管理 `shop_bank_info` 往返（跑完还原）。
 *
 * 只**新建**一条测试商品并在 finally 删除；不动既有数据。
 * 用法：npx tsx scripts/_check_shop_roundtrip.ts            # 默认打本机 3000
 *      ROUNDTRIP_BASE=http://127.0.0.1:3001 npx tsx scripts/_check_shop_roundtrip.ts
 */
import { encode } from "next-auth/jwt";
import { prisma } from "../lib/prisma";

// Node 20.6+：直接把 .env / .env.local 读进 process.env（npx tsx 不会自动加载）
try {
  (process as any).loadEnvFile?.(".env");
  (process as any).loadEnvFile?.(".env.local");
} catch {
  /* 文件不存在则忽略 */
}

const BASE = process.env.ROUNDTRIP_BASE || "http://127.0.0.1:3000";
let bad = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) bad++;
  console.log(`${ok ? "✅" : "❌"} ${label}${extra ? "  " + extra : ""}`);
};

(async () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("缺 NEXTAUTH_SECRET（.env 未加载？）");
  const user: any =
    (await prisma.user.findUnique({ where: { username: "admin" } })) ||
    (await prisma.user.findFirst({ where: { status: "active" } }));
  if (!user) throw new Error("库中没有任何可用后台用户");
  const perms = await prisma.permission.findMany({ select: { code: true } });
  const token = await encode({
    token: {
      sub: String(user.id),
      id: String(user.id),
      username: user.username,
      roles: ["admin"],
      permissions: perms.map((p) => p.code),
    } as any,
    secret,
    salt: "authjs.session-token",
  });
  const headers = { cookie: `authjs.session-token=${token}`, "Content-Type": "application/json" };
  console.log(`=== 商城商品往返回归（${BASE}，以 ${user.username} 身份）===`);

  const slug = "tmp-shop-roundtrip-" + Date.now().toString(36);
  const base = {
    slug,
    name: "测试商品·中文",
    nameEn: "Test EN", nameJa: "JA", nameKo: "KO", nameFr: "FR", nameAr: "AR",
    summary: "简介中文",
    summaryEn: "sum-en", summaryJa: "sum-ja", summaryKo: "sum-ko", summaryFr: "sum-fr", summaryAr: "sum-ar",
    description: "<p>详情中文</p>",
    descriptionEn: "<p>desc-en</p>", descriptionJa: "<p>desc-ja</p>", descriptionKo: "<p>desc-ko</p>",
    descriptionFr: "<p>desc-fr</p>", descriptionAr: "<p>desc-ar</p>",
    coverImage: "/uploads/tmp-cover.webp",
    images: "/uploads/a.webp\n/uploads/b.webp",
    price: "199.5", originalPrice: "299", unit: "套", stock: "7", minOrder: "2",
    status: "published", featured: true, sortOrder: "3",
    seoTitle: "SEO中文", seoTitleEn: "SEO-EN",
    seoDescription: "SEODESC-中", seoDescriptionEn: "SEODESC-EN",
    seoKeywords: "kw1,kw2", seoKeywordsEn: "kw-en",
    geoRegion: "华东", geoCity: "上海",
    categoryId: "", priceTiers: [{ qty: "10", price: "180" }], specs: [], modelFiles: [],
  };

  const MULTI = [
    "nameEn", "nameJa", "nameKo", "nameFr", "nameAr",
    "summaryEn", "summaryJa", "summaryKo", "summaryFr", "summaryAr",
    "descriptionEn", "descriptionJa", "descriptionKo", "descriptionFr", "descriptionAr",
    "seoTitle", "seoTitleEn", "seoDescription", "seoDescriptionEn", "seoKeywords", "seoKeywordsEn",
    "geoRegion", "geoCity",
  ];

  let id = "";
  try {
    const res = await fetch(`${BASE}/api/admin/shop/products`, { method: "POST", headers, body: JSON.stringify(base) });
    const d: any = await res.json();
    check("POST 新建商品", res.ok && !!d.ok, `HTTP ${res.status} ${d?.error || ""}`);
    id = String(d?.data?.id || "");
    if (!id) return;

    // ① 直接查库：语种 / SEO / GEO / 多图 / 阶梯价 都在
    const row: any = await prisma.shopProduct.findUnique({ where: { id: BigInt(id) } });
    const missing = MULTI.filter((k) => !String(row?.[k] ?? "").trim());
    check("创建后 23 个多语种/SEO/GEO 字段全部落库", missing.length === 0, missing.length ? "缺：" + missing.join(",") : "");
    check("创建后 images = 2 张", Array.isArray(row?.images) && row.images.length === 2, JSON.stringify(row?.images));
    check("创建后 priceTiers = 1 档", Array.isArray(row?.priceTiers) && row.priceTiers.length === 1, JSON.stringify(row?.priceTiers));

    // ② 模拟「编辑页重新打开」：列表接口必须把这些字段回填给表单
    const list: any = await (await fetch(`${BASE}/api/admin/shop/products?keyword=${slug}`, { headers })).json();
    const it = (list.items || [])[0];
    check("列表接口返回该商品", !!it);
    if (it) {
      const backfill = ["nameEn", "summaryAr", "descriptionJa", "seoTitleEn", "geoRegion", "geoCity"];
      const lost = backfill.filter((k) => !String(it[k] ?? "").trim());
      check("列表回填多语种/SEO/GEO 字段", lost.length === 0, lost.length ? "缺：" + lost.join(",") : "");
      check("列表回填 images", Array.isArray(it.images) && it.images.length === 2);
    }

    // ③ PUT 改多语种 + SEO + 多图后，再查库（模拟「二次保存」）
    const putBody = { ...base, nameJa: "JA2", seoKeywords: "kw9", images: "/uploads/c.webp" };
    const put = await fetch(`${BASE}/api/admin/shop/products/${id}`, { method: "PUT", headers, body: JSON.stringify(putBody) });
    const pd: any = await put.json();
    check("PUT 更新商品", put.ok && !!pd.ok, `HTTP ${put.status} ${pd?.error || ""}`);
    const row2: any = await prisma.shopProduct.findUnique({ where: { id: BigInt(id) } });
    check("PUT 后 nameJa 已改为 JA2", row2?.nameJa === "JA2", String(row2?.nameJa));
    check("PUT 后 seoKeywords 已改为 kw9", row2?.seoKeywords === "kw9", String(row2?.seoKeywords));
    const lost2 = MULTI.filter((k) => k !== "nameJa" && k !== "seoKeywords" && !String(row2?.[k] ?? "").trim());
    check("二次保存后其余语种/SEO/GEO 未被清空", lost2.length === 0, lost2.length ? "丢：" + lost2.join(",") : "");
    check("PUT 后 images 变为 1 张（清空旧图生效）", Array.isArray(row2?.images) && row2.images.length === 1, JSON.stringify(row2?.images));

    // ④ 前台数据源（公开接口）能看到多语种 + 多图
    const pub = await fetch(`${BASE}/api/public/shop/products/${slug}`);
    const pubd: any = await pub.json();
    check("公开接口 200", pub.ok && !!pubd.ok, `HTTP ${pub.status}`);
    check("公开接口带 nameJa / images / specs 字段", pubd?.product?.nameJa === "JA2" && Array.isArray(pubd?.product?.images));

    // ⑤ 收款管理：site-config 的 shop_bank_info 往返（跑完还原原值）
    const cfgBefore: any = await (await fetch(`${BASE}/api/public/site-config?key=shop_bank_info`)).json();
    const original = cfgBefore?.data ?? null;
    const testCfg = {
      accountName: "测试收款单位",
      bankName: "测试银行",
      accountNo: "0000",
      branch: "",
      remark: "",
      methods: { bank: true, offline: false, wechat: true, alipay: true, contact: true },
      wechatQr: "/uploads/tmp-wx.webp",
      alipayQr: "/uploads/tmp-ali.webp",
      instructions: "中文说明",
      instructionsEn: "EN note",
    };
    try {
      const cfgPut = await fetch(`${BASE}/api/admin/site-config`, { method: "PUT", headers, body: JSON.stringify({ shop_bank_info: testCfg }) });
      check("PUT 收款管理配置", cfgPut.ok, `HTTP ${cfgPut.status}`);
      const cfgAfter: any = await (await fetch(`${BASE}/api/public/site-config?key=shop_bank_info`, { cache: "no-store" } as any)).json();
      const v = cfgAfter?.data || {};
      check("收款方式开关已落库", v?.methods?.offline === false && v?.methods?.wechat === true, JSON.stringify(v?.methods));
      check("收款码 + 前台说明已落库", v?.wechatQr === testCfg.wechatQr && v?.instructionsEn === "EN note");
    } finally {
      await fetch(`${BASE}/api/admin/site-config`, { method: "PUT", headers, body: JSON.stringify({ shop_bank_info: original }) });
      const restored: any = await (await fetch(`${BASE}/api/public/site-config?key=shop_bank_info`, { cache: "no-store" } as any)).json();
      check("收款管理配置已还原为原值", JSON.stringify(restored?.data ?? null) === JSON.stringify(original));
    }
  } finally {
    if (id) {
      await fetch(`${BASE}/api/admin/shop/products/${id}`, { method: "DELETE", headers });
      const still = await prisma.shopProduct.findUnique({ where: { id: BigInt(id) } });
      check("测试商品已清理", !still);
    }
    await prisma.$disconnect();
  }
  console.log(bad === 0 ? "\n✅ 全部通过" : `\n❌ 失败 ${bad} 项`);
  process.exit(bad === 0 ? 0 : 1);
})();
