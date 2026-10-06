"use client";

/**
 * 产品快速选型器（插件 product-selector 的前台主体）
 * ==========================================================================
 * owner 2026-10-06：
 *   「使用（产品手册\html版）原型页面风格，制作一个产品快速选型插件，要求和产品中心的产品关联」
 *
 * 与原型（`选型页/隔膜阀选型中心.html`）的对应关系：
 *   · 原型三步：① 选系列 → ② 配参数（chips，实时结果框）→ ③ 型号代码规则；
 *   · 本实现三步：① 选类别（产品中心的二级目录 + 分类）→ ② 选参数（**从该类别产品规格自动推导**的 chips，
 *     右侧实时结果框）→ ③ 全部匹配产品（可直接跳产品详情 / 加询价车）。
 *   · 视觉沿用原型：浅纸底 `#f6f4f0`、深色页头 + 品牌红底边、步骤条、红编号、白卡片、chip、红框结果区。
 *
 * **与产品中心关联**：数据源就是产品中心那棵树（`/api/public/products`），
 *   结果卡片点进去就是产品详情页；「加入询价车」走 `lib/quote-cart.ts`。
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Loader2, RotateCcw, Search, ShoppingCart } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { addToQuoteCart } from "@/lib/quote-cart";
import { deriveFacets, rowMatches, naturalCompare, LABEL_FACET, type SpecRow } from "@/lib/spec-facets";

/** 选型器界面词（i18n 字典暂无对应键，就地兜底 6 语种） */
const T: Record<string, Record<string, string>> = {
  zh: { title: "产品快速选型", sub: "按应用与参数逐步筛选，直接给出可询价的产品型号", s1: "选择类别", s2: "选择参数", s3: "匹配产品", h1: "先选一个产品类别", h1s: "按流量、压力、端口与材质需求选择类别，再进入参数筛选。", h2: "按参数筛选", h3: "全部匹配产品", hint: "点击参数即时筛选，右侧实时显示匹配结果。", matched: "匹配", items: "个产品", viewAll: "查看全部匹配", clear: "重置", detail: "查看详情", addCart: "加入询价车", added: "已加入询价车", backP: "返回上一步", next: "下一步", search: "搜索名称 / 型号 / 参数", detailSpecs: "关键参数", noMatch: "没有匹配的产品，试试放宽条件", models: "个型号" },
  en: { title: "Product Quick Selector", sub: "Filter by application and parameters to get quotable part numbers", s1: "Select category", s2: "Select parameters", s3: "Matched products", h1: "Start with a product category", h1s: "Choose by flow, pressure, port and material needs, then refine with parameters.", h2: "Filter by parameters", h3: "All matched products", hint: "Click a parameter to filter; results update live on the right.", matched: "Matched", items: "products", viewAll: "View all matches", clear: "Reset", detail: "View details", addCart: "Add to quote cart", added: "Added", backP: "Back", next: "Next", search: "Search name / model / specs", detailSpecs: "Key specs", noMatch: "No product matches — try relaxing the filters", models: "models" },
  ja: { title: "製品クイック選定", sub: "用途とパラメータで絞り込み、見積可能な型番を提示します", s1: "カテゴリ選択", s2: "パラメータ選択", s3: "該当製品", h1: "まずカテゴリを選択", h1s: "流量・圧力・ポート・材質の要件でカテゴリを選び、パラメータで絞り込みます。", h2: "パラメータで絞り込み", h3: "該当製品一覧", hint: "パラメータをクリックすると右側に結果が即時表示されます。", matched: "該当", items: "件", viewAll: "該当をすべて表示", clear: "リセット", detail: "詳細を見る", addCart: "見積に追加", added: "追加しました", backP: "戻る", next: "次へ", search: "名称 / 型番 / 仕様で検索", detailSpecs: "主要仕様", noMatch: "該当製品がありません。条件を緩めてください", models: "型番" },
  ko: { title: "제품 간편 선택", sub: "용도와 파라미터로 좁혀 견적 가능한 모델을 제시합니다", s1: "카테고리 선택", s2: "파라미터 선택", s3: "일치 제품", h1: "먼저 카테고리를 선택하세요", h1s: "유량·압력·포트·재질 요건으로 카테고리를 고른 뒤 파라미터로 좁힙니다.", h2: "파라미터 필터", h3: "전체 일치 제품", hint: "파라미터를 클릭하면 오른쪽에 결과가 즉시 표시됩니다.", matched: "일치", items: "개", viewAll: "전체 일치 보기", clear: "초기화", detail: "상세 보기", addCart: "견적 카트에 추가", added: "추가됨", backP: "이전", next: "다음", search: "이름 / 모델 / 사양 검색", detailSpecs: "주요 사양", noMatch: "일치하는 제품이 없습니다. 조건을 완화해 보세요", models: "모델" },
  fr: { title: "Sélecteur rapide", sub: "Filtrez par application et paramètres pour obtenir des références chiffrables", s1: "Catégorie", s2: "Paramètres", s3: "Produits correspondants", h1: "Commencez par une catégorie", h1s: "Choisissez selon débit, pression, ports et matériau, puis affinez par paramètres.", h2: "Filtrer par paramètres", h3: "Tous les produits correspondants", hint: "Cliquez un paramètre : les résultats s'actualisent à droite.", matched: "Correspondances", items: "produits", viewAll: "Voir tout", clear: "Réinitialiser", detail: "Voir le détail", addCart: "Ajouter au panier", added: "Ajouté", backP: "Retour", next: "Suivant", search: "Nom / référence / specs", detailSpecs: "Specs clés", noMatch: "Aucun produit ne correspond — élargissez les filtres", models: "modèles" },
  ar: { title: "محدد المنتجات السريع", sub: "رشّح حسب التطبيق والمعايير للحصول على أرقام قابلة للتسعير", s1: "اختر الفئة", s2: "اختر المعايير", s3: "المنتجات المطابقة", h1: "ابدأ باختيار فئة المنتج", h1s: "اختر حسب التدفق والضغط والمنافذ والمادة ثم رشّح بالمعايير.", h2: "الترشيح بالمعايير", h3: "كل المنتجات المطابقة", hint: "اضغط أي معيار ليُحدَّث الناتج فوراً على اليمين.", matched: "مطابق", items: "منتج", viewAll: "عرض كل المطابقات", clear: "إعادة تعيين", detail: "عرض التفاصيل", addCart: "أضف إلى السلة", added: "تمت الإضافة", backP: "السابق", next: "التالي", search: "ابحث بالاسم / الطراز / المواصفات", detailSpecs: "أهم المواصفات", noMatch: "لا يوجد منتج مطابق — جرّب توسيع الشروط", models: "طراز" },
};

interface Item {
  id: string;
  slug: string;
  name: string;
  model: string;
  image: string;
  href: string;
  tabId: string;
  tabName: string;
  catId: string;
  catName: string;
  catDesc: string;
  attrs: [string, string][]; // 该产品全部规格键值（去重后）
  keySpecs: [string, string][]; // 展示用：前 4 条
}

const pick = (loc: any, obj: any, base: string) => String(loc.get(obj, base) || "").trim();

export default function ProductSelector() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const dict = T[locale] || T.zh;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [catKey, setCatKey] = useState(""); // `${tabId}::${catId}`
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [added, setAdded] = useState("");

  useEffect(() => {
    let alive = true;
    // 选型需要**较多规格行**才能推导维度（普通列表接口只给 3 条）⇒ 这里要 40 条 + lite（省掉六语种富文本）
    fetch("/api/public/products?specs=40&lite=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const tabs: any[] = d?.data || [];
        const out: Item[] = [];
        for (const tab of tabs) {
          for (const cat of tab.categories || []) {
            for (const m of cat.models || []) {
              const specs: any[] = Array.isArray(m.specs) ? m.specs : [];
              const attrs: [string, string][] = [];
              const seen = new Set<string>();
              for (const s of specs) {
                const label = pick(loc, s, "label");
                const value = pick(loc, s, "value");
                for (const seg of value.split(/[;；؛]/)) {
                  const g = seg.trim();
                  const i = g.indexOf(":") >= 0 ? g.indexOf(":") : g.indexOf("：");
                  if (i <= 0) continue;
                  const k = g.slice(0, i).trim();
                  const v = g.slice(i + 1).trim();
                  if (!k || !v || v.length > 40) continue;
                  const kk = `${k}=${v}`;
                  if (seen.has(kk)) continue;
                  seen.add(kk);
                  attrs.push([k, v]);
                }
                if (label && !seen.has(`L=${label}`)) {
                  seen.add(`L=${label}`);
                  attrs.push(["#label", label]);
                }
              }
              out.push({
                id: String(m.id),
                slug: String(m.id),
                name: pick(loc, m, "name") || String(m.model || m.id),
                model: String(m.model || ""),
                image: String(m.image || (Array.isArray(m.images) ? m.images[0] : "") || ""),
                href: `/products/${encodeURIComponent(tab.id)}/${encodeURIComponent(m.id)}`,
                tabId: String(tab.id),
                tabName: pick(loc, tab, "name"),
                catId: String(cat.id),
                catName: pick(loc, cat, "name"),
                catDesc: pick(loc, cat, "description"),
                attrs,
                keySpecs: attrs.filter(([k]) => k !== "#label").slice(0, 4),
              });
            }
          }
        }
        setItems(out);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [loc]);

  /** 类别（二级目录 + 分类）聚合：卡片展示用 */
  const categories = useMemo(() => {
    const map = new Map<string, { key: string; tabId: string; tabName: string; name: string; desc: string; image: string; count: number; values: string[] }>();
    for (const it of items) {
      const key = `${it.tabId}::${it.catId}`;
      const e = map.get(key) || { key, tabId: it.tabId, tabName: it.tabName, name: it.catName, desc: it.catDesc, image: it.image, count: 0, values: [] };
      e.count += 1;
      if (!e.image && it.image) e.image = it.image;
      // 卡片上的"关键规格"：取该类别里出现最多的前若干属性值
      for (const [, v] of it.attrs.slice(0, 2)) if (e.values.length < 3 && !e.values.includes(v)) e.values.push(v);
      map.set(key, e);
    }
    return Array.from(map.values());
  }, [items]);

  const catItems = useMemo(() => (catKey ? items.filter((it) => `${it.tabId}::${it.catId}` === catKey) : []), [items, catKey]);

  /** 该类别下的可筛维度（**从产品规格自动推导**，含「规格项」伪维度） */
  const facets = useMemo(() => {
    if (!catItems.length) return [];
    const rows: SpecRow[] = catItems.map((it) => ({
      label: it.attrs.find(([k]) => k === "#label")?.[1] || it.name,
      value: "",
      code: it.model,
      attrs: it.attrs.filter(([k]) => k !== "#label"),
    }));
    return deriveFacets(rows, { max: 4, includeLabel: true });
  }, [catItems]);

  const matched = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return catItems.filter((it) => {
      for (const [k, v] of Object.entries(picked)) {
        if (!v) continue;
        if (k === LABEL_FACET) {
          const lbl = it.attrs.find(([ak]) => ak === "#label")?.[1] || it.name;
          if (lbl !== v) return false;
          continue;
        }
        if (!it.attrs.some(([ak, av]) => ak === k && av === v)) return false;
      }
      if (kw && !`${it.name} ${it.model} ${it.attrs.map(([k, v]) => `${k} ${v}`).join(" ")}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [catItems, picked, q]);

  /** chip 可用性预判（选了它会 0 条的置灰）——与产品页选型器同口径 */
  const availability = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const rows: SpecRow[] = catItems.map((it) => ({
      label: it.attrs.find(([k]) => k === "#label")?.[1] || it.name,
      value: "",
      code: it.model,
      attrs: it.attrs.filter(([k]) => k !== "#label"),
    }));
    for (const f of facets) {
      map[f.key] = {};
      const others = Object.entries(picked).filter(([k, v]) => v && k !== f.key);
      for (const v of f.values) {
        let n = 0;
        for (let i = 0; i < rows.length; i++) {
          if (!rowMatches(rows[i], f.key, v)) continue;
          let ok = true;
          for (const [ok2, ov] of others) if (!rowMatches(rows[i], ok2, ov)) { ok = false; break; }
          if (ok) n += 1;
        }
        map[f.key][v] = n;
      }
    }
    return map;
  }, [facets, picked, catItems]);

  const pickCategory = (key: string) => {
    setCatKey(key);
    setPicked({});
    setStep(2);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggle = (key: string, v: string) => setPicked((p) => ({ ...p, [key]: p[key] === v ? "" : v }));
  const addCart = (it: Item) => {
    addToQuoteCart(it.slug, 1);
    setAdded(it.id);
    setTimeout(() => setAdded(""), 2000);
  };
  const activeCat = categories.find((c) => c.key === catKey);
  const activeCount = Object.values(picked).filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#5c6169]">
        <Loader2 className="animate-spin me-2" size={18} /> {t("loading")}
      </div>
    );
  }

  return (
    <div className="bg-[#f6f4f0] min-h-screen">
      {/* 页头（原型：深色渐变 + 品牌红底边） */}
      <div className="bg-[linear-gradient(135deg,#0b0b0d_0%,#17181c_55%,#241a1b_100%)] text-white border-b-[3px] border-[#a8141a]">
        <div className="max-w-[1180px] mx-auto px-5 py-6 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-xl font-extrabold tracking-wide">{dict.title}</h1>
            <p className="text-[12.5px] text-[#a6adb8] mt-1">{dict.sub}</p>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-full border border-white/25 hover:bg-white/10">
            {t("productsPageTitle")} <ChevronRight size={14} className="rtl-flip" />
          </Link>
        </div>
      </div>

      {/* 步骤条 */}
      <div className="bg-[#111214] text-white border-b-[3px] border-[#a8141a]">
        <div className="max-w-[1180px] mx-auto px-5 flex">
          {[
            { n: 1, label: dict.s1 },
            { n: 2, label: dict.s2 },
            { n: 3, label: dict.s3 },
          ].map((s) => (
            <button
              key={s.n}
              onClick={() => (s.n === 1 || catKey ? setStep(s.n) : null)}
              className={`flex-1 py-3 text-center text-[13.5px] border-b-[3px] transition-colors ${
                step === s.n ? "text-white border-[#a8141a] bg-[#a8141a]/10" : "text-[#9aa1ac] border-transparent hover:text-white"
              } ${s.n !== 1 && !catKey ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <b className={`block text-[11px] mb-0.5 ${step === s.n ? "text-[#c63036]" : "text-[#6e757f]"}`}>{s.n}</b>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-5 py-6">
        {/* ===== 第 1 步：选类别 ===== */}
        {step === 1 && (
          <section className="bg-white border border-[#e4e0d8] rounded-[14px] p-6">
            <h2 className="text-[18px] font-extrabold flex items-center gap-2.5 mb-1">
              <span className="bg-[#a8141a] text-white w-[26px] h-[26px] rounded-[7px] inline-flex items-center justify-center text-[14px]">1</span>
              {dict.h1}
            </h2>
            <p className="text-[#5c6169] text-[13px] mb-4">{dict.h1s}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {categories.map((c) => (
                <button
                  key={c.key}
                  onClick={() => pickCategory(c.key)}
                  className="text-start border-2 border-[#e4e0d8] rounded-xl overflow-hidden bg-white hover:border-[#c63036] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(168,20,26,.08)] transition-all"
                >
                  <div className="h-[110px] bg-white flex items-center justify-center p-2 border-b border-[#e4e0d8]">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt={c.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[#c63036] font-bold">{c.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-extrabold text-[15px]">{c.name}</div>
                    <div className="text-[12px] text-[#5c6169] mt-1 min-h-[34px] line-clamp-2">{c.desc}</div>
                    <div className="text-[11.5px] text-[#5c6169] mt-1.5 flex flex-wrap gap-x-2">
                      <span>{c.count} {dict.models}</span>
                      {c.values.slice(0, 2).map((v, i) => (
                        <span key={i} className="text-[#2a2d33]">{v}</span>
                      ))}
                    </div>
                    <div className="mt-2 text-[11.5px] text-[#5c6169]">{c.tabName}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ===== 第 2 步：选参数 + 实时结果 ===== */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5">
            <section className="bg-white border border-[#e4e0d8] rounded-[14px] p-6">
              <h2 className="text-[18px] font-extrabold flex items-center gap-2.5 mb-1">
                <span className="bg-[#a8141a] text-white w-[26px] h-[26px] rounded-[7px] inline-flex items-center justify-center text-[14px]">2</span>
                {dict.h2}
                <span className="text-[12px] font-medium text-[#5c6169] ms-2">{activeCat?.name}</span>
              </h2>
              <p className="text-[#5c6169] text-[13px] mb-4">{dict.hint}</p>

              <div className="relative mb-4">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#9aa1ac]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={dict.search}
                  className="w-full ps-9 pe-3 py-2 text-[13px] border border-[#e4e0d8] rounded-lg outline-none focus:border-[#c63036]"
                />
              </div>

              {facets.map((f) => (
                <div key={f.key} className="mb-4">
                  <div className="text-[13px] font-bold text-[#2a2d33] mb-2">{f.key === LABEL_FACET ? dict.s2 : f.key}</div>
                  <div className="flex flex-wrap gap-2">
                    {f.values.map((v) => {
                      const n = availability[f.key]?.[v] ?? 0;
                      const dis = n === 0 && picked[f.key] !== v;
                      const on = picked[f.key] === v;
                      return (
                        <button
                          key={v}
                          disabled={dis}
                          onClick={() => toggle(f.key, v)}
                          className={`border-[1.5px] rounded-lg px-3 py-1.5 text-[12.5px] transition-all ${
                            on
                              ? "bg-[#111214] border-[#111214] text-white"
                              : dis
                                ? "opacity-35 border-[#e4e0d8] text-[#5c6169] cursor-not-allowed"
                                : "border-[#e4e0d8] bg-white text-[#2a2d33] hover:border-[#c63036] hover:text-[#a8141a]"
                          }`}
                          title={dis ? dict.noMatch : ""}
                        >
                          <span className="font-bold">{v}</span>
                          {!dis && n > 0 && n < catItems.length && <span className={`ms-1 text-[10.5px] ${on ? "text-[#c9cdd4]" : "text-[#5c6169]"}`}>({n})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 pt-3 border-t border-[#e4e0d8]">
                <button onClick={() => setStep(1)} className="text-[12.5px] px-3 py-1.5 border border-[#e4e0d8] rounded-lg hover:bg-[#f6f4f0]">
                  {dict.backP}
                </button>
                <button
                  onClick={() => { setPicked({}); setQ(""); }}
                  className="text-[12.5px] px-3 py-1.5 border border-[#e4e0d8] rounded-lg hover:bg-[#f6f4f0] inline-flex items-center gap-1"
                >
                  <RotateCcw size={12} /> {dict.clear}
                </button>
                <button onClick={() => setStep(3)} className="ms-auto text-[12.5px] px-4 py-1.5 bg-[#a8141a] text-white rounded-lg hover:bg-[#7d0f13] inline-flex items-center gap-1">
                  {dict.next} <ArrowRight size={13} className="rtl-flip" />
                </button>
              </div>
            </section>

            {/* 实时结果框（原型 .result） */}
            <section className="border-2 border-[#a8141a] rounded-[14px] overflow-hidden bg-[linear-gradient(180deg,#fff,#fbf7f7)] self-start">
              <div className="bg-[#a8141a] text-white px-4 py-2.5 font-extrabold text-[14px] flex items-center justify-between">
                <span>{dict.matched}</span>
                <span className="text-[13px] font-semibold">
                  {matched.length} / {catItems.length} {dict.items}
                </span>
              </div>
              <div className="p-4 space-y-3">
                {matched.slice(0, 4).map((it) => (
                  <div key={it.id} className="bg-white border border-[#e4e0d8] rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      {it.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt={it.name} className="w-14 h-14 object-contain rounded-lg border border-[#e4e0d8] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-[13.5px] truncate">{it.name}</div>
                        <div className="text-[11.5px] text-[#5c6169] font-mono">{it.model}</div>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                          {it.keySpecs.slice(0, 2).map(([k, v]) => (
                            <span key={k} className="text-[10.5px] text-[#5c6169]">
                              <span className="text-[#9aa1ac]">{k}:</span> {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Link href={it.href} className="text-[11.5px] px-2.5 py-1 border border-[#e4e0d8] rounded-lg hover:bg-[#f6f4f0] inline-flex items-center gap-1">
                        {dict.detail} <ChevronRight size={11} className="rtl-flip" />
                      </Link>
                      <button onClick={() => addCart(it)} className="text-[11.5px] px-2.5 py-1 bg-[#a8141a] text-white rounded-lg hover:bg-[#7d0f13] inline-flex items-center gap-1">
                        {added === it.id ? <Check size={11} /> : <ShoppingCart size={11} />}
                        {added === it.id ? dict.added : dict.addCart}
                      </button>
                    </div>
                  </div>
                ))}
                {matched.length === 0 && <div className="text-center text-[12.5px] text-[#5c6169] py-6">{dict.noMatch}</div>}
                {matched.length > 4 && (
                  <button onClick={() => setStep(3)} className="w-full text-[12px] py-2 border border-[#e4e0d8] rounded-lg hover:bg-[#f6f4f0]">
                    {dict.viewAll}（{matched.length}）
                  </button>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ===== 第 3 步：全部匹配产品 ===== */}
        {step === 3 && (
          <section className="bg-white border border-[#e4e0d8] rounded-[14px] p-6">
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <h2 className="text-[18px] font-extrabold flex items-center gap-2.5">
                <span className="bg-[#a8141a] text-white w-[26px] h-[26px] rounded-[7px] inline-flex items-center justify-center text-[14px]">3</span>
                {dict.h3}
              </h2>
              <span className="text-[12.5px] text-[#5c6169]">{activeCat?.name}{activeCount > 0 ? ` · ${activeCount} 项条件` : ""}</span>
              <button onClick={() => setStep(2)} className="ms-auto text-[12.5px] px-3 py-1.5 border border-[#e4e0d8] rounded-lg hover:bg-[#f6f4f0]">
                {dict.backP}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {matched.map((it) => (
                <div key={it.id} className="border border-[#e4e0d8] rounded-xl overflow-hidden bg-white flex flex-col">
                  <div className="h-[150px] bg-white border-b border-[#e4e0d8] flex items-center justify-center p-2">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt={it.name} className="max-w-full max-h-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[#c63036] font-bold">{it.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col">
                    <div className="font-bold text-[14px]">{it.name}</div>
                    <div className="text-[11.5px] text-[#5c6169] font-mono mt-0.5">{it.model}</div>
                    <div className="mt-2 space-y-0.5 flex-1">
                      {it.keySpecs.slice(0, 3).map(([k, v]) => (
                        <div key={k} className="text-[11px] flex justify-between gap-2">
                          <span className="text-[#9aa1ac] truncate">{k}</span>
                          <span className="text-[#2a2d33] font-medium text-end">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Link href={it.href} className="flex-1 text-center text-[12px] py-1.5 border border-[#e4e0d8] rounded-lg hover:bg-[#f6f4f0]">
                        {dict.detail}
                      </Link>
                      <button onClick={() => addCart(it)} className="flex-1 text-[12px] py-1.5 bg-[#a8141a] text-white rounded-lg hover:bg-[#7d0f13] inline-flex items-center justify-center gap-1">
                        {added === it.id ? <Check size={12} /> : <ShoppingCart size={12} />}
                        {added === it.id ? dict.added : dict.addCart}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {matched.length === 0 && <div className="text-center text-[13px] text-[#5c6169] py-10">{dict.noMatch}</div>}
          </section>
        )}

        <p className="text-center text-[11.5px] text-[#9aa1ac] mt-6">{dict.sub}</p>
      </div>
    </div>
  );
}
