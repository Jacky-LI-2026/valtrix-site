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
import { MANUAL_CATEGORIES, MANUAL_GROUPS, matchManualSeries, type ManualCategory } from "@/lib/manual-catalog";
import { MANUAL_SPECS } from "@/lib/manual-specs";

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
  /** 手册系列筛选（owner：细分严格按手册 —— 系列清单来自手册，不是我们从库里推的） */
  const [seriesKey, setSeriesKey] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [added, setAdded] = useState("");
  /** 工况：工作压力下限（bar）——数值从产品规格解析，不猜测 */
  const [minBar, setMinBar] = useState("");

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

  /**
   * 手册品类目录（owner 口径：**细分严格从 PDF 手册取**）
   * —— 品类/系列/维度名来自 `lib/manual-catalog.ts`（手册实测抽取）；
   *    这里只把**官网产品**按型号归到手册系列上，用来显示"官网在售数量/图片"与后续匹配。
   */
  const catalog = useMemo(() => {
    return MANUAL_CATEGORIES.map((c) => {
      const matched = items.filter((it) => {
        const m = matchManualSeries(`${it.model} ${it.name}`);
        return m?.category.key === c.key;
      });
      const bySeries = c.series.map((s) => ({
        series: s,
        count: matched.filter((it) => matchManualSeries(`${it.model} ${it.name}`)?.series === s).length,
      }));
      return {
        cat: c,
        matched,
        count: matched.length,
        image: matched.find((x) => x.image)?.image || "",
        bySeries,
      };
    });
  }, [items]);

  /** 目录页分组（原型 GROUP 顺序） */
  const catGroups = useMemo(
    () =>
      MANUAL_GROUPS.map((g) => ({
        key: g.key,
        tabId: g.key,
        tabName: g.zh,
        tabEn: g.en,
        cats: catalog.filter((c) => c.cat.group === g.key).map((c) => ({
          key: c.cat.key,
          name: c.cat.zh,
          desc: c.cat.en,
          image: c.image,
          count: c.count,
          values: c.cat.series,
          dims: c.cat.dimensions,
          rulePages: c.cat.rulePages || "",
        })),
      })).filter((g) => g.cats.length > 0),
    [catalog]
  );

  const tabsCount = catGroups.length;
  /** 统计卡：材料体系/洁净工艺 —— 从**官网产品规格**里汇总（手册未给全站常量） */
  const statsMaterials = useMemo(
    () => Array.from(new Set(items.flatMap((it) => it.attrs.filter(([k]) => /材质|material/i.test(k)).map(([, v]) => v)))).slice(0, 4),
    [items]
  );
  const statsClean = useMemo(
    () => Array.from(new Set(items.flatMap((it) => it.attrs.filter(([k]) => /洁净|clean/i.test(k)).map(([, v]) => v)))).slice(0, 3),
    [items]
  );

  /** 该手册品类下的**官网产品**（按型号归到手册系列） */
  const catItems = useMemo(
    () => (catKey ? items.filter((it) => matchManualSeries(`${it.model} ${it.name}`)?.category.key === catKey) : []),
    [items, catKey]
  );

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
      // 手册系列筛选
      if (seriesKey && matchManualSeries(`${it.model} ${it.name}`)?.series !== seriesKey) return false;
      // 工况：工作压力 ≥ 输入值（数值取自产品规格文本；解析不出则不参与过滤）
      const min = Number(minBar);
      if (minBar.trim() !== "" && Number.isFinite(min) && min > 0) {
        const max = it.attrs
          .filter(([k]) => /压力|pressure/i.test(k))
          .map(([, v]) => Number((String(v).match(/\d+(?:\.\d+)?/) || [""])[0]))
          .filter((n) => Number.isFinite(n) && n > 0)
          .reduce((a, b) => Math.max(a, b), -1);
        if (max >= 0 && max < min) return false;
      }
      if (kw && !`${it.name} ${it.model} ${it.attrs.map(([k, v]) => `${k} ${v}`).join(" ")}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [catItems, picked, q, seriesKey, minBar]);

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
  /** 当前选中的手册品类（来自手册目录） */
  const activeCat = catalog.find((c) => c.cat.key === catKey) || null;
  const activeManual: ManualCategory | null = activeCat?.cat || null;
  const activeCount = Object.values(picked).filter(Boolean).length;

  /**
   * 手册**数值规格表**（owner 2026-10-06：「不要加工图片，只把数值取出即可」）
   * 数据来自 `lib/manual-specs.ts`（由各品类目录页原型的 SERIES.rows 抽出，未做任何加工）。
   */
  const manualSpecTables = useMemo(() => {
    if (!activeManual) return [];
    const cat = MANUAL_SPECS.find((c) => c.category === activeManual.key);
    if (!cat) return [];
    const list = seriesKey ? cat.series.filter((s) => s.id === seriesKey) : cat.series;
    return list
      .filter((s) => s.rows.length > 0)
      .map((s) => ({ id: s.id, name: s.nameZh || s.nameEn, columns: cat.columns, rows: s.rows, forms: s.formsZh }));
  }, [activeManual, seriesKey]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#5c6169]">
        <Loader2 className="animate-spin me-2" size={18} /> {t("loading")}
      </div>
    );
  }

  return (
    /*
      目录页 —— **严格按芯阀产品手册 html 原型 `产品目录页.html` 移植**：
      样式来自 `app/globals.css` 里 `#vs-catalog` 作用域（由原型 <style> 逐条搬运，变量与数值未改），
      这里只用原型的类名（.crumb/.hero/.stats/.sec/.cards/.card/.thumb/.cbody/.cname/.chips/.chip/.go/footer）。
      说明：**站点自身的顶栏/页脚已由 layout 提供**，故此处不重复原型里那份独立 topbar（避免双导航）。
    */
    <div id="vs-catalog">
      {/* 面包屑（原型 .crumb） */}
      <div className="wrap">
        <div className="crumb">
          <Link href="/">{locale === "zh" ? "首页" : "Home"}</Link> &gt; <b>{t("productsPageTitle")}</b>
        </div>
      </div>

      {/* Hero + 四统计（原型 .hero / .stats / .stat）*/}
      {step === 1 && (
        <section className="hero">
          <div className="wrap">
            <div className="kicker">{locale === "zh" ? "PRODUCTS · 产品目录" : "PRODUCTS · CATALOG"}</div>
            <h1>{locale === "zh" ? "高纯管阀件全品类" : "High-purity valves & fittings"}</h1>
            <p className="desc">
              {locale === "zh"
                ? "接头、隔膜阀、球阀、针阀、波纹管阀、减压阀、单向阀、计量阀、过滤器与阀组，面向半导体、生物制药与高纯流体输送应用；316L 不锈钢，支持 GP / HP / UHP 工艺规范。"
                : "Fittings, diaphragm/ball/needle/bellows/regulator/check/metering valves, filters and manifolds for semiconductor, biopharma and UHP fluid systems. 316L stainless steel, GP / HP / UHP process specifications."}
            </p>
            <div className="stats">
              <div className="stat">
                <div className="l">{locale === "zh" ? "产品品类" : "Categories"}</div>
                <div className="v">{MANUAL_CATEGORIES.length}</div>
                <div className="s">{tabsCount} {locale === "zh" ? "个二级目录" : "sections"}</div>
              </div>
              <div className="stat">
                <div className="l">{locale === "zh" ? "型号" : "Models"}</div>
                <div className="v">{items.length}</div>
                <div className="s">{locale === "zh" ? "全部可询价" : "quotable"}</div>
              </div>
              <div className="stat">
                <div className="l">{locale === "zh" ? "材料体系" : "Materials"}</div>
                <div className="v">{statsMaterials[0] || "316L"}</div>
                <div className="s">{statsMaterials.slice(1, 4).join(" · ") || "316L SS"}</div>
              </div>
              <div className="stat">
                <div className="l">{locale === "zh" ? "洁净工艺" : "Cleanliness"}</div>
                <div className="v">{statsClean.join(" / ") || "GP / HP / UHP"}</div>
                <div className="s">{locale === "zh" ? "按产品规格汇总" : "from product specs"}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="wrap">
        {/* ===== 第 1 步：品类目录（原型 .sec / .ghead / .cards / .card）===== */}
        {step === 1 && (
          catGroups.map((g) => (
            <section className="sec" key={g.tabId}>
              <div className="ghead">
                <span className="en">{g.tabEn || g.tabId}</span>
                <h2>{g.tabName}</h2>
                <span className="cnt">
                  {g.cats.reduce((n, c) => n + c.count, 0)} {locale === "zh" ? "个型号" : "models"}
                </span>
              </div>
              <div className="cards">
                {g.cats.map((c) => (
                  <button key={c.key} className="card" onClick={() => pickCategory(c.key)} style={{ textAlign: "start" }}>
                    {c.count > 0 && <span className="st live">{locale === "zh" ? "官网在售" : "Available"}</span>}
                    <div className="thumb">
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt={c.name} loading="lazy" />
                      ) : (
                        <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="4" width="7" height="7" rx="1" />
                          <rect x="14" y="4" width="7" height="7" rx="1" />
                          <rect x="3" y="13" width="7" height="7" rx="1" />
                          <rect x="14" y="13" width="7" height="7" rx="1" />
                        </svg>
                      )}
                    </div>
                    <div className="cbody">
                      <div className="cname">
                        {c.name}
                        <span className="en">{c.desc.slice(0, 18)}</span>
                      </div>
                      <div className="chips">
                        {c.values.slice(0, 6).map((v, i) => (
                          <span className="chip" key={i}>
                            {v}
                          </span>
                        ))}
                      </div>
                      <span className="go">{locale === "zh" ? "进入选型" : "Start selecting"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}

        {/* ===== 第 2 步：选参数 + 实时结果 ===== */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5">
            <section className="bg-white border border-[#e4e0d8] rounded-[14px] p-6">
              <h2 className="text-[18px] font-extrabold flex items-center gap-2.5 mb-1">
                <span className="bg-[#a8141a] text-white w-[26px] h-[26px] rounded-[7px] inline-flex items-center justify-center text-[14px]">2</span>
                {dict.h2}
                <span className="text-[12px] font-medium text-[#5c6169] ms-2">{activeManual?.zh || ""}</span>
              </h2>
              <p className="text-[#5c6169] text-[13px] mb-4">{dict.hint}</p>

              {/* 手册系列（owner 口径：细分严格按手册；系列清单来自手册目录页） */}
              {activeCat && activeCat.bySeries.length > 0 && (
                <div className="mb-4">
                  <div className="text-[13px] font-bold text-[#2a2d33] mb-2">
                    {locale === "zh" ? "手册系列" : "Catalog series"}
                    <span className="text-[11px] font-normal text-[#5f666b] ms-2">
                      {activeManual?.series.length} {locale === "zh" ? "个系列" : "series"}
                      {activeManual?.rulePages ? ` · ${locale === "zh" ? "编码规则见" : "code rules:"} ${activeManual.rulePages}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSeriesKey("")}
                      className={`border-[1.5px] rounded-lg px-3 py-1.5 text-[12.5px] transition-all ${
                        seriesKey === "" ? "bg-[#111214] border-[#111214] text-white" : "border-[#e4e0d8] bg-white text-[#2a2d33] hover:border-[#c63036]"
                      }`}
                    >
                      {dict.all}
                    </button>
                    {activeCat.bySeries.map((s) => (
                      <button
                        key={s.series}
                        type="button"
                        onClick={() => setSeriesKey(seriesKey === s.series ? "" : s.series)}
                        title={s.count === 0 ? (locale === "zh" ? "手册有此系列，官网暂无型号" : "In catalog, not on site yet") : ""}
                        className={`border-[1.5px] rounded-lg px-3 py-1.5 text-[12.5px] transition-all ${
                          seriesKey === s.series
                            ? "bg-[#111214] border-[#111214] text-white"
                            : s.count === 0
                              ? "border-dashed border-[#e4e0d8] text-[#9aa1ac]"
                              : "border-[#e4e0d8] bg-white text-[#2a2d33] hover:border-[#c63036]"
                        }`}
                      >
                        <span className="font-bold">{s.series}</span>
                        {s.count > 0 && <span className="ms-1 text-[10.5px]">({s.count})</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 手册给出的筛选维度（维度名严格来自手册；下方取值取自官网产品规格） */}
              {activeManual && activeManual.dimensions.length > 0 && (
                <div className="mb-4 text-[11.5px] text-[#5f666b] bg-[#f4f5f6] border border-[#e2e4e6] rounded-lg px-3 py-2">
                  {locale === "zh" ? "手册筛选维度" : "Catalog filter dimensions"}：
                  <b className="text-[#2a2d33] font-semibold">{activeManual.dimensions.join(" · ")}</b>
                  <span className="ms-2">（{locale === "zh" ? "下方可选值取自官网产品规格" : "options come from product specs"}）</span>
                </div>
              )}

              {/* 手册数值规格表（owner：只把数值取出，不加工图片） */}
              {manualSpecTables.length > 0 && (
                <div className="mb-4 border border-[#e2e4e6] rounded-lg overflow-hidden">
                  <div className="bg-[#f4f5f6] px-3 py-2 text-[12px] font-bold text-[#2a2d33] flex items-center justify-between">
                    <span>{locale === "zh" ? "手册规格（数值）" : "Catalog specifications"}</span>
                    <span className="font-normal text-[#5f666b]">
                      {locale === "zh" ? "来源：手册目录页" : "from catalog"} · {manualSpecTables.reduce((n, t) => n + t.rows.length, 0)}{" "}
                      {locale === "zh" ? "行" : "rows"}
                    </span>
                  </div>
                  <div className="max-h-[420px] overflow-auto">
                    <table className="w-full text-[12px] border-collapse">
                      <thead>
                        <tr className="bg-[#a8141a] text-white">
                          {(manualSpecTables[0].columns.length
                            ? manualSpecTables[0].columns
                            : ["1", "2", "3", "4", "5"].map((n) => `列${n}`)
                          ).map((c, i) => (
                            <th key={i} className="text-start px-3 py-2 font-semibold whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {manualSpecTables.map((t) =>
                          t.rows.map((r, ri) => (
                            <tr key={`${t.id}-${ri}`} className={ri % 2 === 1 ? "bg-[#fafafa]" : "bg-white"}>
                              {r.map((v, vi) => (
                                <td key={vi} className="px-3 py-2 align-top text-[#2a2d33] border-b border-[#eee]">
                                  {v}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-3 py-2 text-[11px] text-[#5f666b] bg-white">
                    {locale === "zh"
                      ? "以上为手册原始数值（未做换算/加工）；「待确认」表示手册未给出该值。"
                      : "Values as printed in the catalog (no conversion); “待确认” = not stated in the catalog."}
                  </div>
                </div>
              )}

              {/* 工况：工作压力下限（车间常用"我要 ≥N bar"的选型方式） */}
              <label className="inline-flex items-center gap-2 text-[12.5px] text-[#5f666b] mb-4">
                <span className="font-medium text-[#2a2d33]">{locale === "zh" ? "工作压力 ≥" : "Working pressure ≥"}</span>
                <input
                  value={minBar}
                  onChange={(e) => setMinBar(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="300"
                  className="w-20 px-2 py-1.5 text-[13px] border border-[#e4e0d8] rounded-lg outline-none focus:border-[#c63036]"
                />
                <span>bar</span>
              </label>

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
              <span className="text-[12.5px] text-[#5c6169]">
                {activeManual?.zh || ""}
                {activeCount > 0 ? ` · ${activeCount} 项条件` : ""}
              </span>
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
