"use client";

/**
 * 规格选型器（SpecPicker）
 * ==========================================================================
 * owner 2026-10-06（阀门站 `/products/fittings/metal-face-seal-g-series`，184 条规格）：
 *   「类似这种技术规格非常多的产品，可以用下拉菜单或级联及关联选择的方式展现」「类似选型的方式」
 *
 * 设计口径（**通用、零硬编码**，换产品/换语种都能用）：
 *   1. 每条 `specs` 在数据上就是**一个可选变体**：`label`=规格项名、`value`="键: 值; 键: 值"、
 *      `groupName`=**货号**（如 `316L-GE-MR4-N2`）。
 *   2. 选型维度**从数据里自动推导**：把 value 按 `;`/`；`/`؛` 拆成「键: 值」，
 *      取「出现够多（≥5% 且 ≥3 行）＋ 取值个数适中（2~12）」的键做下拉，取覆盖最广的前 3 个；
 *      再加一个「规格项」下拉（label 去重）。本产品即自动得到 规格项(44) / 管外径 D(in.) / MR尺寸 (in.) / 壁厚 (in.)…
 *   3. **原表格一条都不丢**：完整规格表折叠在下方（`children` 原样渲染），SEO 与"找全尺寸"不受影响。
 *   4. 规格少于 `minRows`（默认 9）时不启用选型器，直接渲染原表格 —— 简单产品零回归。
 *
 * ⚠️ 过滤是**纯前端**的（数据已在页面里），不额外发请求。
 */
import { useMemo, useState } from "react";
import { ChevronDown, Copy, Search, ShoppingCart, X } from "lucide-react";

/** `createLocalizedGetter(locale)` 的返回类型（只用到 get） */
interface LocFn {
  get(obj: any, key: string): string;
}

export interface SpecPickerProps {
  /** 原始 specs（含多语种字段，由 loc 取值） */
  specs: any[];
  loc: LocFn;
  /** 当前语种（界面词兜底用；缺省 zh） */
  locale?: string;
  /** 少于这么多条规格就不启用选型器（默认 9） */
  minRows?: number;
  /** 传入后，每个选型结果卡片会出现「加入询价车」按钮（把该**货号**一起带进询价车） */
  onAddToCart?: (code: string) => void;
  /** 完整规格表（原样渲染，折叠在选型器下方） */
  children?: React.ReactNode;
}

/** 选型器界面词（i18n 字典暂无对应键，就地兜底 6 语种） */
const T: Record<string, Record<string, string>> = {
  zh: { title: "快速选型", label: "规格项", all: "全部", matched: "匹配", items: "项", clear: "清空", empty: "当前条件下没有匹配的规格，试试放宽条件：", search: "搜索货号 / 尺寸 / 关键字", copy: "复制货号", copied: "已复制", add: "加入询价车", full: "查看完整规格表", code: "货号", more: "显示全部匹配项", collapse: "收起" },
  en: { title: "Quick selector", label: "Type", all: "All", matched: "Matched", items: "items", clear: "Clear", empty: "No specification matches the current filters — try relaxing them: ", search: "Search part no. / size / keyword", copy: "Copy part no.", copied: "Copied", add: "Add to quote cart", full: "View full specification table", code: "Part no.", more: "Show all matches", collapse: "Collapse" },
  ja: { title: "かんたん選定", label: "種類", all: "すべて", matched: "該当", items: "件", clear: "クリア", empty: "現在の条件に合う仕様がありません。条件を緩めてください：", search: "品番 / サイズ / キーワードで検索", copy: "品番をコピー", copied: "コピー済み", add: "見積に追加", full: "仕様表をすべて表示", code: "品番", more: "該当をすべて表示", collapse: "閉じる" },
  ko: { title: "간편 선택", label: "유형", all: "전체", matched: "일치", items: "개", clear: "초기화", empty: "현재 조건에 맞는 사양이 없습니다. 조건을 완화해 보세요: ", search: "품번 / 크기 / 키워드 검색", copy: "품번 복사", copied: "복사됨", add: "견적 카트에 추가", full: "전체 사양표 보기", code: "품번", more: "전체 일치 항목 보기", collapse: "접기" },
  fr: { title: "Sélecteur rapide", label: "Type", all: "Tous", matched: "Correspondances", items: "éléments", clear: "Effacer", empty: "Aucune spécification ne correspond aux filtres — élargissez-les : ", search: "Réf. / dimension / mot-clé", copy: "Copier la réf.", copied: "Copié", add: "Ajouter au panier", full: "Voir le tableau complet", code: "Réf.", more: "Voir toutes les correspondances", collapse: "Réduire" },
  ar: { title: "محدد سريع", label: "النوع", all: "الكل", matched: "مطابق", items: "عنصر", clear: "مسح", empty: "لا توجد مواصفات مطابقة للشروط الحالية — جرّب توسيعها: ", search: "بحث بالرقم / المقاس / كلمة", copy: "نسخ رقم القطعة", copied: "تم النسخ", add: "أضف إلى سلة العرض", full: "عرض جدول المواصفات الكامل", code: "رقم القطعة", more: "عرض كل المطابقات", collapse: "طي" },
};

const SPLIT = /[;；؛]/;
const LABEL_FACET = " __label__";

/** 把一行规格解析成 { label, code, attrs } */
function parseRow(spec: any, loc: LocFn) {
  const label = String(loc.get(spec, "label") || "").trim();
  const value = String(loc.get(spec, "value") || "").trim();
  const attrs: [string, string][] = [];
  for (const seg of value.split(SPLIT)) {
    const s = seg.trim();
    if (!s) continue;
    const i = s.indexOf(":") >= 0 ? s.indexOf(":") : s.indexOf("：");
    if (i <= 0) continue;
    const k = s.slice(0, i).trim();
    const v = s.slice(i + 1).trim();
    if (k && v) attrs.push([k, v]);
  }
  return { label, value, code: String(spec?.groupName || "").trim(), attrs };
}

/** 自然序比较（1/8 < 1/4 < 1/2 < 3/4 < 1） */
function naturalCompare(a: string, b: string) {
  const num = (s: string) => {
    const m = s.match(/^(\d+)\/(\d+)$/);
    if (m) return Number(m[1]) / Number(m[2]);
    const n = Number(s.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  };
  const na = num(a);
  const nb = num(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}

export default function SpecPicker({ specs, loc, locale = "zh", minRows = 9, onAddToCart, children }: SpecPickerProps) {
  const dict = T[locale] || T.zh;
  const rows = useMemo(() => (Array.isArray(specs) ? specs.map((s) => parseRow(s, loc)) : []), [specs, loc]);

  /** 从数据自动推导选型维度（出现够多 + 取值个数适中） */
  const facets = useMemo(() => {
    const stat = new Map<string, { count: number; values: Set<string> }>();
    for (const r of rows) {
      for (const [k, v] of r.attrs) {
        if (v.length > 24) continue;
        const s = stat.get(k) || { count: 0, values: new Set<string>() };
        s.count += 1;
        s.values.add(v);
        stat.set(k, s);
      }
    }
    const keyFacets = Array.from(stat.entries())
      .filter(([, s]) => s.values.size >= 2 && s.values.size <= 12 && s.count >= Math.max(3, Math.floor(rows.length * 0.05)))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([key, s]) => ({ key, values: Array.from(s.values).sort(naturalCompare) }));
    const labels = Array.from(new Set(rows.map((r) => r.label).filter(Boolean)));
    return labels.length >= 2 ? [{ key: LABEL_FACET, values: labels.sort(naturalCompare) }, ...keyFacets] : keyFacets;
  }, [rows]);

  const [picked, setPicked] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState("");

  const matched = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) => {
      for (const [k, v] of Object.entries(picked)) {
        if (!v) continue;
        if (k === LABEL_FACET) {
          if (r.label !== v) return false;
        } else if (!r.attrs.some(([ak, av]) => ak === k && av === v)) return false;
      }
      if (kw && !`${r.code} ${r.label} ${r.value}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [rows, picked, q]);

  /**
   * **级联可用性预判**：某个维度的某个取值，在当前其它条件不变的前提下还能命中几行？
   * 为 0 的选项在 UI 上**置灰**（这是"选型"该有的行为）。
   * 为什么必须做：不同产品族用的属性键不一样（长对焊接管用「管外径 D」，别族用「MR尺寸」），
   * 若不管，用户随手两个下拉就能选到 0 条结果，体验直接崩。
   * ⚠️ 必须放在**任何提前 return 之前**（Hooks 顺序，lint 会拦）。
   */
  const availability = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const f of facets) {
      map[f.key] = {};
      const others = Object.entries(picked).filter(([k, v]) => v && k !== f.key);
      for (const v of f.values) {
        let n = 0;
        for (const r of rows) {
          if (f.key === LABEL_FACET ? r.label !== v : !r.attrs.some(([ak, av]) => ak === f.key && av === v)) continue;
          let ok = true;
          for (const [ok2, ov] of others) {
            if (ok2 === LABEL_FACET) {
              if (r.label !== ov) { ok = false; break; }
            } else if (!r.attrs.some(([ak, av]) => ak === ok2 && av === ov)) { ok = false; break; }
          }
          if (ok) n += 1;
        }
        map[f.key][v] = n;
      }
    }
    return map;
  }, [facets, picked, rows]);

  // 规格太少：不启用选型器，原样渲染（⚠️ 必须在所有 hook 之后）
  if (rows.length < minRows) return <>{children}</>;

  const activeCount = Object.values(picked).filter(Boolean).length;
  const list = showAll ? matched : matched.slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-dark-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-dark">{dict.title}</div>
          <div className="text-xs text-dark-400">
            {dict.matched} <b className="text-primary">{matched.length}</b> / {rows.length} {dict.items}
            {activeCount > 0 && (
              <button type="button" onClick={() => setPicked({})} className="ms-3 underline hover:text-primary">
                {dict.clear}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {facets.map((f) => (
            <label key={f.key} className="block">
              <span className="block text-[11px] text-dark-400 mb-1 truncate" title={f.key === LABEL_FACET ? dict.label : f.key}>
                {f.key === LABEL_FACET ? dict.label : f.key}
              </span>
              <span className="relative block">
                <select
                  value={picked[f.key] || ""}
                  onChange={(e) => setPicked((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 pe-8 text-sm border border-dark-100 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">{dict.all}</option>
                  {f.values.map((v) => {
                    const n = availability[f.key]?.[v] ?? 0;
                    const disabled = n === 0 && picked[f.key] !== v;
                    return (
                      <option key={v} value={v} disabled={disabled}>
                        {disabled ? `${v} —` : n > 0 && n < rows.length ? `${v}（${n}）` : v}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown size={14} className="absolute end-2 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
              </span>
            </label>
          ))}
          <label className="block">
            <span className="block text-[11px] text-dark-400 mb-1">&nbsp;</span>
            <span className="relative block">
              <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-dark-300" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={dict.search}
                className="w-full ps-8 pe-7 py-2 text-sm border border-dark-100 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
              />
              {q && (
                <button type="button" onClick={() => setQ("")} className="absolute end-2 top-1/2 -translate-y-1/2 text-dark-300 hover:text-dark">
                  <X size={14} />
                </button>
              )}
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        {list.map((r, i) => (
          <div key={`${r.code}-${i}`} className="bg-white border border-dark-100 rounded-xl p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-dark truncate">{r.label}</div>
                {r.code && (
                  <div className="text-[11px] text-dark-400 mt-0.5">
                    {dict.code}: <b className="text-dark-600">{r.code}</b>
                  </div>
                )}
              </div>
              {r.code && (
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(r.code);
                      setCopied(r.code);
                      setTimeout(() => setCopied(""), 1500);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 border border-dark-100 rounded-md hover:bg-dark-50"
                  >
                    <Copy size={11} />
                    {copied === r.code ? dict.copied : dict.copy}
                  </button>
                  {/* owner 2026-10-06：把选定的**货号**一起加进询价车（同产品不同货号算两行） */}
                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={() => onAddToCart(r.code)}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-primary text-white rounded-md hover:bg-primary-600"
                    >
                      <ShoppingCart size={11} />
                      {dict.add}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {r.attrs.slice(0, 6).map(([k, v]) => (
                <span key={k} className="text-[11px] text-dark-500">
                  <span className="text-dark-300">{k}:</span> {v}
                </span>
              ))}
            </div>
          </div>
        ))}
        {matched.length === 0 && (
          <div className="text-sm text-dark-400 py-6 text-center">
            {dict.empty}
            <button type="button" onClick={() => setPicked({})} className="underline hover:text-primary">
              {dict.clear}
            </button>
          </div>
        )}
        {matched.length > 12 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full text-xs py-2 border border-dark-100 rounded-lg hover:bg-dark-50">
            {showAll ? dict.collapse : `${dict.more}（${matched.length}）`}
          </button>
        )}
      </div>

      <details className="bg-white border border-dark-100 rounded-xl">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-dark select-none">
          {dict.full}（{rows.length}）
        </summary>
        <div className="px-4 pb-4 overflow-x-auto">{children}</div>
      </details>
    </div>
  );
}
