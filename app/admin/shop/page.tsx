"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Sparkles } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import SpecEditor from "@/components/admin/SpecEditor";
import UrlUploadInput from "@/components/admin/UrlUploadInput";
import MultiLangFieldV2 from "@/components/admin/MultiLangFieldV2";
import SeoGeoConfig from "@/components/admin/SeoGeoConfig";

interface ShopItem {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  nameJa: string | null;
  nameKo: string | null;
  nameFr: string | null;
  nameAr: string | null;
  summary: string | null;
  coverImage: string | null;
  price: number | null;
  originalPrice: number | null;
  unit: string | null;
  stock: number;
  minOrder: number;
  status: string;
  featured: boolean;
  sortOrder: number;
}

const LANGS = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
];

const emptyForm = () => ({
  slug: "",
  name: "", nameEn: "", nameJa: "", nameKo: "", nameFr: "", nameAr: "",
  summary: "", summaryEn: "", summaryJa: "", summaryKo: "", summaryFr: "", summaryAr: "",
  description: "", descriptionEn: "", descriptionJa: "", descriptionKo: "", descriptionFr: "", descriptionAr: "",
  coverImage: "",
  images: "",
  categoryId: "",
  priceTiers: [] as any[],
  specs: [] as any[],
  modelFiles: [] as any[],
  price: "",
  originalPrice: "",
  unit: "",
  stock: "0",
  minOrder: "1",
  status: "published",
  featured: false,
  sortOrder: "0",
  // SEO / GEO（owner 2026-10-14「商品页同时也要增加 SEO 和 GEO 功能」）
  seoTitle: "", seoTitleEn: "",
  seoDescription: "", seoDescriptionEn: "",
  seoKeywords: "", seoKeywordsEn: "",
  geoRegion: "", geoCity: "",
});

export default function AdminShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const [showModal, setShowModal] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [cats, setCats] = useState<any[]>([]);
  const [bankInfo, setBankInfo] = useState<any>({});
  const [bankMsg, setBankMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/shop/categories")
      .then((r) => r.json())
      .then((d) => setCats(d.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/site-config")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.config && d.config.shop_bank_info) setBankInfo(d.config.shop_bank_info);
      })
      .catch(() => {});
  }, []);

  const load = async (keyword = q, p = page) => {
    const r = await fetch(`/api/admin/shop/products?keyword=${encodeURIComponent(keyword)}&page=${p}&limit=20`);
    const d = await r.json();
    if (d.ok) {
      setItems(d.items);
      setTotal(d.total);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  async function saveBankInfo() {
    const r = await fetch("/api/admin/site-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_bank_info: bankInfo }),
    });
    const d = await r.json();
    setBankMsg(d.error ? "保存失败：" + d.error : "已保存");
    setTimeout(() => setBankMsg(""), 3000);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEdit(it: ShopItem) {
    setEditing(it);
    setForm({
      slug: it.slug,
      name: it.name || "",
      nameEn: it.nameEn || "", nameJa: it.nameJa || "", nameKo: it.nameKo || "", nameFr: it.nameFr || "", nameAr: it.nameAr || "",
      summary: it.summary || "",
      // 🔴 2026-10-14 修：此前只回填中文，摘要/详情的其它语种**读不到** ⇒ 一保存就把已翻译的语种清空（真数据丢失）
      summaryEn: (it as any).summaryEn || "", summaryJa: (it as any).summaryJa || "", summaryKo: (it as any).summaryKo || "", summaryFr: (it as any).summaryFr || "", summaryAr: (it as any).summaryAr || "",
      description: (it as any).description || "",
      descriptionEn: (it as any).descriptionEn || "", descriptionJa: (it as any).descriptionJa || "", descriptionKo: (it as any).descriptionKo || "", descriptionFr: (it as any).descriptionFr || "", descriptionAr: (it as any).descriptionAr || "",
      coverImage: it.coverImage || "",
      images: Array.isArray((it as any).images) ? (it as any).images.map((x: any) => (typeof x === "string" ? x : x?.url || "")).join("\n") : "",
      categoryId: (it as any).categoryId ? String((it as any).categoryId) : "",
      priceTiers: Array.isArray((it as any).priceTiers)
        ? (it as any).priceTiers.map((t: any) => ({ qty: String(t?.qty ?? ""), price: t?.price === null || t?.price === undefined ? "" : String(t.price) }))
        : [],
      specs: Array.isArray((it as any).specs) ? (it as any).specs : [],
      price: it.price === null || it.price === undefined ? "" : String(it.price),
      originalPrice: it.originalPrice === null || it.originalPrice === undefined ? "" : String(it.originalPrice),
      unit: it.unit || "",
      stock: String(it.stock ?? 0),
      minOrder: String(it.minOrder ?? 1),
      status: it.status,
      featured: it.featured,
      sortOrder: String(it.sortOrder ?? 0),
      // SEO / GEO
      seoTitle: (it as any).seoTitle || "", seoTitleEn: (it as any).seoTitleEn || "",
      seoDescription: (it as any).seoDescription || "", seoDescriptionEn: (it as any).seoDescriptionEn || "",
      seoKeywords: (it as any).seoKeywords || "", seoKeywordsEn: (it as any).seoKeywordsEn || "",
      geoRegion: (it as any).geoRegion || "", geoCity: (it as any).geoCity || "",
    });
    setShowModal(true);
  }

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  /* ---------- 多语言 / 图集上传（owner 2026-10-14：商品封面与多图支持上传；多语言用产品管理同款卡片） ---------- */
  /** 语种 → 字段后缀：zh 无后缀，其余首字母大写（与 G4 字段命名口径一致） */
  const suffixOf = (lang: string) => (lang === "zh" ? "" : lang.charAt(0).toUpperCase() + lang.slice(1));
  /** 取某字段的六语种值对象，喂给 MultiLangFieldV2 */
  const langValuesOf = (base: string) =>
    Object.fromEntries(LANGS.map((l) => [l.code, String((form as any)[base + suffixOf(l.code)] ?? "")]));
  /** 单条翻译（MultiLangFieldV2 的「翻译」按钮调用，复用后台统一翻译接口） */
  const translateOne = async (zhValue: string, targetLang: string) => {
    const r = await fetch("/api/admin/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: zhValue, from: "zh", targetLang }),
    });
    const d = await r.json().catch(() => ({}));
    return d?.translatedText || "";
  };
  /** 图集上传（可多选）→ 追加到 images（换行分隔的 URL；后端保存时转成 [{url}]） */
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const uploadGallery = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setGalleryUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d?.success && d.url) urls.push(String(d.url));
        else alert(d?.error || `上传失败：${file.name}`);
      }
      if (urls.length) {
        const cur = String(form.images || "").split("\n").map((s: string) => s.trim()).filter(Boolean);
        setF("images", [...cur, ...urls].join("\n"));
      }
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };
  const removeGalleryImage = (idx: number) => {
    const cur = String(form.images || "").split("\n").map((s: string) => s.trim()).filter(Boolean);
    setF("images", cur.filter((_, i) => i !== idx).join("\n"));
  };

  async function save() {
    const url = editing ? `/api/admin/shop/products/${editing.id}` : "/api/admin/shop/products";
    const r = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.ok) {
      setEditing(null);
      setShowModal(false);
      load();
    } else {
      alert(d.error || "保存失败");
    }
  }

  async function remove(it: ShopItem) {
    if (!confirm(`删除商品「${it.name}」？`)) return;
    await fetch(`/api/admin/shop/products/${it.id}`, { method: "DELETE" });
    load();
  }

  async function autoTranslate() {
    setTranslating(true);
    try {
      const fieldMap = {
        name: ["name", "nameEn", "nameJa", "nameKo", "nameFr", "nameAr"],
        summary: ["summary", "summaryEn", "summaryJa", "summaryKo", "summaryFr", "summaryAr"],
        description: ["description", "descriptionEn", "descriptionJa", "descriptionKo", "descriptionFr", "descriptionAr"],
      } as Record<string, string[]>;
      for (const [base, keys] of Object.entries(fieldMap)) {
        const src = form[base];
        if (!src) continue;
        for (let i = 1; i < keys.length; i++) {
          const lang = keys[i].replace(base, "").toLowerCase();
          const r = await fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: src, targetLang: lang === "zh" ? "en" : lang }),
          });
          const d = await r.json();
          if (d.ok && d.translatedText) setF(keys[i], d.translatedText);
          await new Promise((res) => setTimeout(res, 1100));
        }
      }
      alert("翻译完成，请检查后保存");
    } catch {
      alert("翻译失败");
    } finally {
      setTranslating(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">商城商品管理</h1>
            <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400">共 {total} 件</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">在线商城插件 · B2B 询单制，下单后由销售确认</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), load(q, 1))}
            placeholder="搜索名称/slug"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-300 focus:border-[#CC0000]"
          />
          <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
            style={{ background: "var(--color-primary, #CC0000)" }}>
            <Plus className="h-4 w-4" /> 新增商品
          </button>
          <a href="/admin/shop/categories" className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#CC0000]/40 hover:text-[#CC0000]">
            分类管理
          </a>
        </div>
      </div>

      <div className="admin-table overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-[11px] tracking-wide text-gray-500">
              <th className="px-4 py-2.5 font-medium">商品</th>
              <th className="px-4 py-2.5 font-medium">价格</th>
              <th className="px-4 py-2.5 font-medium">库存</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
              <th className="px-4 py-2.5 font-medium">排序</th>
              <th className="px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-14 text-center text-gray-400">暂无商品，点击右上角新增</td></tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="transition-colors hover:bg-red-50/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {it.coverImage ? (
                      <img src={it.coverImage} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gray-100" />
                    )}
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-gray-400">{it.slug}</div>
                      {(it as any).categoryName ? (
                        <div className="text-xs text-gray-400">
                          {(it as any).categoryName}
                          {(it as any).categoryNameEn ? ` / ${(it as any).categoryNameEn}` : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {it.price !== null ? `¥${it.price.toLocaleString()}` : "面议"}
                  {it.originalPrice ? <span className="ml-1 text-xs text-gray-400 line-through">¥{it.originalPrice}</span> : null}
                </td>
                <td className="px-4 py-3">{it.stock === -1 ? "不限" : it.stock}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${it.status === "published" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {it.status === "published" ? "上架" : "草稿"}
                  </span>
                  {it.featured && <span className="ml-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-500">推荐</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{it.sortOrder}</td>
                <td className="px-4 py-3 space-x-2">
                  <button onClick={() => openEdit(it)} className="text-sm text-primary hover:underline"><Pencil className="inline h-3.5 w-3.5" /> 编辑</button>
                  <button onClick={() => remove(it)} className="text-sm text-red-500 hover:underline"><Trash2 className="inline h-3.5 w-3.5" /> 删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="flex justify-center gap-2 py-3">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40">上一页</button>
            <span className="text-sm text-gray-500 self-center">{page} / {Math.ceil(total / 20)}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40">下一页</button>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {showModal && form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? "编辑商品" : "新增商品"}</h2>
              <div className="flex items-center gap-2">
                <button onClick={autoTranslate} disabled={translating}
                  className="flex items-center gap-1 rounded-lg border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/5 disabled:opacity-50">
                  <Sparkles className="h-4 w-4" /> {translating ? "翻译中..." : "一键翻译全部"}
                </button>
                <button onClick={() => { setShowModal(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">slug（留空自动生成）</label>
                  <input className={inputCls} value={form.slug} onChange={(e) => setF("slug", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">单位（件/套/台）</label>
                  <input className={inputCls} value={form.unit} onChange={(e) => setF("unit", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">排序</label>
                  <input className={inputCls} value={form.sortOrder} onChange={(e) => setF("sortOrder", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">售价（元，空=面议）</label>
                  <input className={inputCls} value={form.price} onChange={(e) => setF("price", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">划线原价</label>
                  <input className={inputCls} value={form.originalPrice} onChange={(e) => setF("originalPrice", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">库存（-1=不限）</label>
                  <input className={inputCls} value={form.stock} onChange={(e) => setF("stock", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">最小起订</label>
                  <input className={inputCls} value={form.minOrder} onChange={(e) => setF("minOrder", e.target.value)} />
                </div>
              </div>
              {/* 封面图：支持**上传**（owner 2026-10-14「商品封面和多图需要增加上传功能」）—— 下拉选文件即传，也可继续手填 URL */}
              <UrlUploadInput
                label="封面图（可上传，也可填 URL）"
                value={form.coverImage}
                onChange={(url) => setF("coverImage", url)}
                accept="image/*"
                showPreview
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">商城分类</label>
                  <select className={inputCls} value={form.categoryId || ""} onChange={(e) => setF("categoryId", e.target.value)}>
                    <option value="">未分类</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.nameEn ? ` / ${c.nameEn}` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    阶梯价（批量价）：达到数量按档位{form.specs?.length ? "折扣（填 95=95折）" : "单价（元）"}
                  </label>
                  <div className="space-y-2">
                    {form.priceTiers.map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className={inputCls}
                          placeholder="数量（件）"
                          value={t.qty}
                          onChange={(e) => setF("priceTiers", form.priceTiers.map((x: any, xi: number) => (xi === i ? { ...x, qty: e.target.value } : x)))}
                        />
                        <span className="text-gray-400">≥</span>
                        <input
                          className={inputCls}
                          placeholder="单价（元）"
                          value={t.price}
                          onChange={(e) => setF("priceTiers", form.priceTiers.map((x: any, xi: number) => (xi === i ? { ...x, price: e.target.value } : x)))}
                        />
                        <button
                          type="button"
                          onClick={() => setF("priceTiers", form.priceTiers.filter((_: any, fi: number) => fi !== i))}
                          className="rounded p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setF("priceTiers", [...form.priceTiers, { qty: "", price: "" }])}
                      className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-primary hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" /> 添加档位
                    </button>
                  </div>
                </div>
              </div>
              <SpecEditor
                  value={form.specs || []}
                  onChange={(v) => setF("specs", v)}
                />

              <div className="rounded-xl border border-gray-100 p-4">
                <div className="mb-2 text-sm font-semibold text-gray-700">模型及图纸下载（CAD / PDF / 压缩包）</div>
                <div className="space-y-2">
                  {(form.modelFiles || []).map((f: any, fi: number) => (
                    <div key={fi} className="flex items-center gap-2">
                      <input className={inputCls} placeholder="文件名称（如 ZW-15D 3D模型.stp）" value={f.name || ""} onChange={(e) => setF("modelFiles", (form.modelFiles || []).map((x: any, xi: number) => xi === fi ? { ...x, name: e.target.value } : x))} />
                      <input className={inputCls} placeholder="下载链接（https://...）" value={f.url || ""} onChange={(e) => setF("modelFiles", (form.modelFiles || []).map((x: any, xi: number) => xi === fi ? { ...x, url: e.target.value } : x))} />
                      <button onClick={() => setF("modelFiles", (form.modelFiles || []).filter((_: any, xi: number) => xi !== fi))} className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-500">删</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setF("modelFiles", [...(form.modelFiles || []), { name: "", url: "" }])} className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-primary hover:text-primary">
                    <Plus className="h-3.5 w-3.5" /> 添加下载文件
                  </button>
                </div>
              </div>

              <div>
                {/* 多图：支持**批量上传**（可多选）；仍保留 URL 文本框（每行一张），上传结果追加到列表 */}
                <label className="block text-sm font-medium text-gray-700">多图（可批量上传；前台详情页画廊展示）</label>
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={galleryUploading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-400 disabled:opacity-50"
                  >
                    {galleryUploading ? "上传中…" : "上传图片（可多选）"}
                  </button>
                  <span className="text-[11px] text-gray-400">
                    已选 {String(form.images || "").split("\n").map((s: string) => s.trim()).filter(Boolean).length} 张
                  </span>
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadGallery(e.target.files)}
                />
                <textarea rows={3} className={inputCls} value={form.images || ""} onChange={(e) => setF("images", e.target.value)} placeholder={"上传后自动写入；也可手填 URL，每行一张"} />
                {form.images && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {String(form.images).split("\n").filter(Boolean).map((u: string, i: number) => (
                      <span key={i} className="relative">
                        <img src={u.trim()} alt="" className="h-16 w-20 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(i)}
                          title="移除这张"
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] text-white hover:bg-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setF("featured", e.target.checked)} /> 首页推荐
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <select className={inputCls} value={form.status} onChange={(e) => setF("status", e.target.value)}>
                    <option value="published">上架</option>
                    <option value="draft">草稿</option>
                  </select>
                </label>
              </div>

              {/*
                多语言字段（owner 2026-10-14：「商品详情多语言采用和产品管理同样风格的卡片式显示」）
                改用与产品管理同一套组件 `MultiLangFieldV2`：卡片式 + 语种 Tab + 中文改动可一键翻译。
                ⚠️ 与产品管理同源 ⇒ 以后统一改样式只需改这一个组件。
              */}
              <MultiLangFieldV2
                label="商品名称"
                values={langValuesOf("name")}
                onChange={(lang, v) => setF("name" + suffixOf(lang), v)}
                onTranslate={translateOne}
                renderEditor={(value, onChange) => (
                  <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
                )}
              />
              <MultiLangFieldV2
                label="简介"
                values={langValuesOf("summary")}
                onChange={(lang, v) => setF("summary" + suffixOf(lang), v)}
                onTranslate={translateOne}
                renderEditor={(value, onChange) => (
                  <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
                )}
              />
              <MultiLangFieldV2
                label="详情描述"
                values={langValuesOf("description")}
                onChange={(lang, v) => setF("description" + suffixOf(lang), v)}
                onTranslate={translateOne}
                renderEditor={(value, onChange) => (
                  <RichTextEditor
                    value={value}
                    onChange={onChange}
                    placeholder="支持富文本：加粗 / 列表 / 表格 / 图片 / 链接…"
                    height={220}
                  />
                )}
              />

              {/* SEO / GEO（owner 2026-10-14：「商品页同时也要增加 SEO 和 GEO 功能」）：与产品管理同一组件 */}
              <SeoGeoConfig
                seoTitle={form.seoTitle}
                seoTitleEn={form.seoTitleEn}
                seoDescription={form.seoDescription}
                seoDescriptionEn={form.seoDescriptionEn}
                seoKeywords={form.seoKeywords}
                seoKeywordsEn={form.seoKeywordsEn}
                geoRegion={form.geoRegion}
                geoCity={form.geoCity}
                onChange={(field, value) => setF(field, value)}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowModal(false); setEditing(null); }} className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600">取消</button>
                <button onClick={save} className="rounded-lg px-6 py-2 text-sm font-medium text-white"
                  style={{ background: "var(--color-primary, #CC0000)" }}>
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*
        收款管理（owner 2026-10-14：「商城需要增加收款管理设置」）
        ==========================================================================
        配置仍存在既有 `shop_bank_info`（**向后兼容**：订单页读 accountName/bankName/… 的老逻辑不变），
        新增：收款方式开关（结算页只列勾选的）、微信/支付宝收款码（上传图片）、前台说明（中/英）。
      */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-1 text-base font-semibold">收款管理</h3>
        <p className="mb-4 text-xs text-gray-400">
          ① 勾选客户可用的收款方式（结算页只显示勾选项）② 对公转账账户 ③ 微信/支付宝收款码（可上传图片）④ 前台说明 —— 保存后结算页与订单页立即生效
        </p>

        {/* 收款方式开关 */}
        <div className="mb-4 flex flex-wrap items-center gap-5 rounded-lg bg-gray-50 px-3 py-2.5">
          {[
            { key: "bank", label: "对公转账" },
            { key: "offline", label: "线下转账" },
            { key: "wechat", label: "微信支付" },
            { key: "alipay", label: "支付宝" },
            { key: "contact", label: "联系客服" },
          ].map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={bankInfo?.methods?.[m.key] !== false}
                onChange={(e) =>
                  setBankInfo((b: any) => ({ ...b, methods: { ...(b?.methods || {}), [m.key]: e.target.checked } }))
                }
              />
              {m.label}
            </label>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-600">收款单位</label>
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.accountName || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, accountName: e.target.value }))} placeholder="如：北京VALTRIX Co., Ltd." />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">开户银行</label>
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.bankName || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, bankName: e.target.value }))} placeholder="如：招商银行北京分行" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">银行账号</label>
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.accountNo || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, accountNo: e.target.value }))} placeholder="对公账号" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">开户支行</label>
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.branch || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, branch: e.target.value }))} placeholder="选填" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-600">转账备注</label>
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.remark || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, remark: e.target.value }))} placeholder="如：转账请备注订单号" />
          </div>
          {/* 收款码（上传图片；前台选微信/支付宝时展示） */}
          <UrlUploadInput
            label="微信收款码（选填）"
            value={bankInfo.wechatQr || ""}
            onChange={(url) => setBankInfo((b: any) => ({ ...b, wechatQr: url }))}
            accept="image/*"
            showPreview
          />
          <UrlUploadInput
            label="支付宝收款码（选填）"
            value={bankInfo.alipayQr || ""}
            onChange={(url) => setBankInfo((b: any) => ({ ...b, alipayQr: url }))}
            accept="image/*"
            showPreview
          />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-600">前台说明（中文）</label>
            <textarea rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.instructions || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, instructions: e.target.value }))} placeholder="如：付款后请上传凭证，我们会在 1 个工作日内确认到账" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-600">前台说明（英文）</label>
            <textarea rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.instructionsEn || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, instructionsEn: e.target.value }))} placeholder="e.g. Upload the payment receipt after paying; we will confirm within 1 business day." />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveBankInfo} className="rounded-lg px-5 py-2 text-sm font-medium text-white" style={{ background: "var(--color-primary, #CC0000)" }}>保存收款设置</button>
          {bankMsg && <span className="text-xs text-green-600">{bankMsg}</span>}
        </div>
      </div>
    </div>
  );
}
