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
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Copy, FileText, Search, ShoppingCart, Wrench, X } from "lucide-react";
import { parseSpecRow, deriveFacets, rowMatches, naturalCompare, LABEL_FACET, type LocGetter } from "@/lib/spec-facets";
import { buildConnFields, connSummary } from "@/lib/conn-spec";
import { findManualSeries } from "@/lib/manual-codes";

/** `createLocalizedGetter(locale)` 的返回类型（只用到 get） */
type LocFn = LocGetter;

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
  /** 当前产品型号（如 `DV1`、`ZW-10D`）：命中手册系列时，货号生成器改用**手册权威段位** */
  productModel?: string;
  /** 完整规格表（原样渲染，折叠在选型器下方） */
  children?: React.ReactNode;
}

/** 选型器界面词（i18n 字典暂无对应键，就地兜底 6 语种） */
const T: Record<string, Record<string, string>> = {
  zh: { title: "快速选型", label: "规格项", all: "全部", matched: "匹配", items: "项", clear: "清空", empty: "当前条件下没有匹配的规格，试试放宽条件：", search: "搜索货号 / 尺寸 / 关键字", copy: "复制货号", copied: "已复制", add: "加入询价车", full: "查看完整规格表", code: "货号", more: "显示全部匹配项", collapse: "收起",
        minBar: "工况：工作压力 ≥", bar: "bar", codeGen: "货号生成器", genHint: "按段位选择生成货号（段位取值来自本产品已有机型）", genMatch: "命中已有机型", genNoMatch: "库里暂无该组合，可作为定制需求提交（复制货号发给客服）", sheet: "生成选型单", sheetTitle: "产品选型单", conditions: "筛选条件", none: "无", connCol: "接口 / 端接", pressureCol: "工作压力", generated: "生成货号" },
  en: { title: "Quick selector", label: "Type", all: "All", matched: "Matched", items: "items", clear: "Clear", empty: "No specification matches the current filters — try relaxing them: ", search: "Search part no. / size / keyword", copy: "Copy part no.", copied: "Copied", add: "Add to quote cart", full: "View full specification table", code: "Part no.", more: "Show all matches", collapse: "Collapse" },
  ja: { title: "かんたん選定", label: "種類", all: "すべて", matched: "該当", items: "件", clear: "クリア", empty: "現在の条件に合う仕様がありません。条件を緩めてください：", search: "品番 / サイズ / キーワードで検索", copy: "品番をコピー", copied: "コピー済み", add: "見積に追加", full: "仕様表をすべて表示", code: "品番", more: "該当をすべて表示", collapse: "閉じる" },
  ko: { title: "간편 선택", label: "유형", all: "전체", matched: "일치", items: "개", clear: "초기화", empty: "현재 조건에 맞는 사양이 없습니다. 조건을 완화해 보세요: ", search: "품번 / 크기 / 키워드 검색", copy: "품번 복사", copied: "복사됨", add: "견적 카트에 추가", full: "전체 사양표 보기", code: "품번", more: "전체 일치 항목 보기", collapse: "접기" },
  fr: { title: "Sélecteur rapide", label: "Type", all: "Tous", matched: "Correspondances", items: "éléments", clear: "Effacer", empty: "Aucune spécification ne correspond aux filtres — élargissez-les : ", search: "Réf. / dimension / mot-clé", copy: "Copier la réf.", copied: "Copié", add: "Ajouter au panier", full: "Voir le tableau complet", code: "Réf.", more: "Voir toutes les correspondances", collapse: "Réduire" },
  ar: { title: "محدد سريع", label: "النوع", all: "الكل", matched: "مطابق", items: "عنصر", clear: "مسح", empty: "لا توجد مواصفات مطابقة للشروط الحالية — جرّب توسيعها: ", search: "بحث بالرقم / المقاس / كلمة", copy: "نسخ رقم القطعة", copied: "تم النسخ", add: "أضف إلى سلة العرض", full: "عرض جدول المواصفات الكامل", code: "رقم القطعة", more: "عرض كل المطابقات", collapse: "طي" },
};

/** 从一条机型的所有规格值里取**最大工作压力（bar）**；解析不出则返回 -1（不参与压力筛选） */
function rowMaxBar(attrs: [string, string][]): number {
  let max = -1;
  for (const [k, v] of attrs) {
    if (!/压力|pressure/i.test(k)) continue;
    const m = String(v).match(/\d+(?:\.\d+)?/);
    if (!m) continue;
    const n = Number(m[0]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

export default function SpecPicker({ specs, loc, locale = "zh", minRows = 9, onAddToCart, productModel, children }: SpecPickerProps) {
  const dict = T[locale] || T.zh;
  /** 手册权威规则（命中则货号生成器用它；未命中则退回"从已有机型货号推导"） */
  const manual = useMemo(() => (productModel ? findManualSeries(productModel) : null), [productModel]);
  const rows = useMemo(() => (Array.isArray(specs) ? specs.map((s) => parseSpecRow(s, loc)) : []), [specs, loc]);

  /** 从数据自动推导选型维度（出现够多 + 取值个数适中） */
  /**
   * 后台可覆盖的维度名 / 隐藏维度（`/admin/product-selector` 配置）：
   * 自动推导出来的键名可能不干净（实测有 `MR尺 (in.`、`础订购号` 这类脏键）⇒ 允许改名与隐藏。
   * 配置经 `/api/public/plugins` 的 **configs 白名单**下发（只含非敏感配置）。
   */
  const [facetLabels, setFacetLabels] = useState<Record<string, string>>({});
  const [hiddenFacets, setHiddenFacets] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/public/plugins", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const cfg = d?.configs?.["product-selector"];
        if (cfg?.facetLabels && typeof cfg.facetLabels === "object") setFacetLabels(cfg.facetLabels);
        if (Array.isArray(cfg?.hiddenFacets)) setHiddenFacets(cfg.hiddenFacets.map(String));
      })
      .catch(() => {});
  }, []);

  const facets = useMemo(
    () => deriveFacets(rows, { max: 3 }).filter((f) => !hiddenFacets.includes(f.key)),
    [rows, hiddenFacets]
  );

  const [picked, setPicked] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState("");
  const [minBar, setMinBar] = useState("");
  const [showGen, setShowGen] = useState(false);
  const [segPicks, setSegPicks] = useState<string[]>([]);

  const matched = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const min = Number(minBar);
    const useMin = minBar.trim() !== "" && Number.isFinite(min) && min > 0;
    return rows.filter((r) => {
      for (const [k, v] of Object.entries(picked)) {
        if (!v) continue;
        if (!rowMatches(r, k, v)) return false;
      }
      // 工况筛选：该型号的**最大工作压力**须 ≥ 输入值（数值从规格里解析，不猜测）
      if (useMin && rowMaxBar(r.attrs) < min) return false;
      if (kw && !`${r.code} ${r.label} ${r.value}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [rows, picked, q, minBar]);

  /**
   * 货号生成器：段位取值**从本产品已有机型的货号里推导**（如 316L-GE-MR4-N2 → 材质/系列/端接1/端接2/其他）。
   * ⚠️ 不发明段位含义：界面只显示"段位 N + 可选值"，含义由数据决定；生成的货号若命中已有机型即给出该机型。
   */
  const codeSegments = useMemo(() => {
    const codes = rows.map((r) => r.code).filter(Boolean);
    if (codes.length < 3) return [];
    const split = codes.map((c) => c.split("-"));
    const maxLen = Math.max(...split.map((x) => x.length));
    const out: { index: number; values: string[] }[] = [];
    for (let i = 0; i < maxLen; i++) {
      const vals = Array.from(new Set(split.map((x) => x[i]).filter(Boolean))) as string[];
      if (vals.length >= 1 && vals.length <= 80) out.push({ index: i, values: vals.sort(naturalCompare) });
    }
    return out.length >= 2 && out.length <= 6 ? out : [];
  }, [rows]);

  /**
   * 生成器的段位：**优先手册权威段位**（带中文含义）——
   * 手册把「系列 + 流道形式」连写（示例 `DV13A` = DV1 + 3A），故这里把这两段合并成一个选择项。
   */
  const genSegments = useMemo(() => {
    if (manual) {
      const s2 = manual.segments.find((s) => s.no === 2);
      const s3 = manual.segments.find((s) => s.no === 3);
      const combos: { code: string; label: string }[] = [];
      if (s2 && s3) {
        for (const a of s2.options)
          for (const b of s3.options) combos.push({ code: `${a.code}${b.code}`, label: `${a.code}${b.code} — ${a.label} · ${b.label}` });
      }
      return manual.segments
        .filter((s) => s.no !== 3)
        .map((s) => ({
          key: `m${s.no}`,
          label: s.no === 2 ? `${s.name} + 流道形式` : s.name,
          note: s.note || "",
          values: s.no === 2 ? combos : s.options.map((o) => ({ code: o.code, label: o.label })),
        }));
    }
    return codeSegments.map((seg, i) => ({
      key: `a${i}`,
      label: `#${i + 1}`,
      note: "",
      values: seg.values.map((v) => ({ code: v, label: v })),
    }));
  }, [manual, codeSegments]);

  const generatedCode = useMemo(() => {
    if (!genSegments.length) return "";
    // 缺省项（手册里留空/省略）不参与拼接，其余按段位顺序用 "-" 连接
    const values = segPicks.slice(0, genSegments.length).map((v) => v || "");
    if (values.filter(Boolean).length !== values.length) return "";
    return values.join("-");
  }, [genSegments, segPicks]);
  const generatedHit = useMemo(() => (generatedCode ? rows.find((r) => r.code === generatedCode) || null : null), [generatedCode, rows]);

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
          if (!rowMatches(r, f.key, v)) continue;
          let ok = true;
          for (const [ok2, ov] of others) {
            if (!rowMatches(r, ok2, ov)) { ok = false; break; }
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

  /** 生成并打开「选型单」（浏览器打印/另存为 PDF）——内容 = 当前筛选条件 + 匹配机型 */
  const openSheet = () => {
    if (typeof window === "undefined") return;
    const cond = [
      q.trim() ? `${dict.search}: ${q.trim()}` : "",
      minBar.trim() ? `${dict.minBar} ${minBar} ${dict.bar}` : "",
      ...Object.entries(picked).filter(([, v]) => v).map(([k, v]) => `${k === LABEL_FACET ? dict.label : k}: ${v}`),
    ].filter(Boolean);
    const rowsHtml = matched
      .map((r) => {
        const f = buildConnFields(r.attrs, r.label, "");
        const conn = connSummary(f, " · ") || "—";
        const press = f.filter((x) => x.group === "pressure").map((x) => `${x.zh} ${x.value}`).join(" / ") || "—";
        return `<tr><td>${r.code || "—"}</td><td>${r.label || "—"}</td><td>${conn}</td><td>${press}</td></tr>`;
      })
      .join("");
    const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${dict.sheetTitle}</title>
<style>body{font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;color:#111214;margin:24px}
h1{font-size:20px;margin:0 0 6px} .sub{color:#5c6169;font-size:12px;margin-bottom:14px}
.cond{background:#f6f4f0;border:1px solid #e4e0d8;border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:14px}
table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}
th{background:#a8141a;color:#fff;text-align:left;padding:7px 8px}
td{border-bottom:1px solid #eee;padding:7px 8px;word-break:break-all}
tr:nth-child(even) td{background:#fafafa}
.ft{margin-top:14px;color:#9aa1ac;font-size:11px}</style></head><body>
<h1>${dict.sheetTitle}</h1>
<div class="sub">${typeof window !== "undefined" ? location.origin : ""} · ${new Date().toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</div>
<div class="cond"><b>${dict.conditions}:</b> ${cond.length ? cond.join(" ｜ ") : dict.none} ｜ ${dict.matched} ${matched.length} / ${rows.length} ${dict.items}</div>
<table><thead><tr><th style="width:22%">${dict.code}</th><th style="width:26%">${dict.label}</th><th style="width:30%">${dict.connCol}</th><th style="width:22%">${dict.pressureCol}</th></tr></thead><tbody>${rowsHtml}</tbody></table>
<div class="ft">${dict.sheetTitle} · ${dict.more}</div>
<script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

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
              <span className="block text-[11px] text-dark-400 mb-1 truncate" title={f.key === LABEL_FACET ? dict.label : facetLabels[f.key] || f.key}>
                {f.key === LABEL_FACET ? dict.label : facetLabels[f.key] || f.key}
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

      {/* ===== 高级工具（owner 2026-10-06「全做」）：工况筛选 / 货号生成器 / 选型单 ===== */}
      <div className="bg-white border border-dark-100 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* 工况：工作压力下限 */}
          <label className="inline-flex items-center gap-2 text-xs text-dark-500">
            <span className="font-medium text-dark-600">{dict.minBar}</span>
            <input
              value={minBar}
              onChange={(e) => setMinBar(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="300"
              className="w-20 px-2 py-1.5 text-sm border border-dark-100 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span>{dict.bar}</span>
          </label>
          <span className="text-dark-200">|</span>
          {/* 货号生成器开关 */}
          <button
            type="button"
            onClick={() => setShowGen((v) => !v)}
            disabled={!genSegments.length}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-dark-100 rounded-lg hover:bg-dark-50 disabled:opacity-40"
            title={dict.genHint}
          >
            <Wrench size={13} /> {dict.codeGen}
          </button>
          {/* 选型单 */}
          <button
            type="button"
            onClick={openSheet}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-dark text-white rounded-lg hover:opacity-90"
            title={dict.sheetTitle}
          >
            <FileText size={13} /> {dict.sheet}
          </button>
        </div>

        {showGen && genSegments.length > 0 && (
          <div className="border-t border-dark-100 pt-3">
            <div className="text-[11px] text-dark-400 mb-2">
              {manual
                ? locale === "zh"
                  ? `按手册《型号说明-${manual.key}系列》生成（来源：${manual.source}）· 手册示例：${manual.example}`
                  : `Built from the catalog rule for series ${manual.key}. Example: ${manual.example}`
                : dict.genHint}
            </div>
            <div className="flex flex-wrap gap-2">
              {genSegments.map((seg, i) => (
                <label key={seg.key} className="inline-flex items-center gap-1.5">
                  <span className="text-[11px] text-dark-300" title={seg.note || ""}>
                    {manual ? seg.label : `#${i + 1}`}
                  </span>
                  <span className="relative inline-block">
                    <select
                      value={segPicks[i] || ""}
                      onChange={(e) =>
                        setSegPicks((p) => {
                          const next = [...p];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                      className="appearance-none ps-2.5 pe-7 py-1.5 text-sm border border-dark-100 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">—</option>
                      {seg.values.map((v) => (
                        <option key={v.code} value={v.code}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute end-2 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
                  </span>
                </label>
              ))}
            </div>
            {generatedCode && (
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm px-3 py-1.5 bg-dark text-white rounded-lg">{generatedCode}</span>
                {generatedHit ? (
                  <>
                    <span className="text-xs text-green-600">{dict.genMatch}：{generatedHit.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(generatedCode);
                        setCopied(generatedCode);
                        setTimeout(() => setCopied(""), 1500);
                      }}
                      className="text-xs px-2.5 py-1 border border-dark-100 rounded-lg hover:bg-dark-50 inline-flex items-center gap-1"
                    >
                      <Copy size={11} /> {copied === generatedCode ? dict.copied : dict.copy}
                    </button>
                    {onAddToCart && (
                      <button
                        type="button"
                        onClick={() => onAddToCart(generatedCode)}
                        className="text-xs px-2.5 py-1 bg-primary text-white rounded-lg hover:bg-primary-600 inline-flex items-center gap-1"
                      >
                        <ShoppingCart size={11} /> {dict.add}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-amber-600">{dict.genNoMatch}</span>
                )}
              </div>
            )}
          </div>
        )}
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
              {/*
                接口/端接按 Swagelok 口径展示（owner 2026-10-06：「要对接口详细描述，类似世伟洛克」）：
                规范成「端接 1（面密封（NPT））: 1/4」这种 (型式, 尺寸) 成对描述，而不是原始规格键名。
              */}
              {buildConnFields(r.attrs, r.label, "").slice(0, 5).map((f, fi) => (
                <span key={`${f.zh}-${fi}`} className="text-[11px] text-dark-500">
                  <span className="text-dark-300">{locale === "zh" ? f.zh : f.en}:</span> {f.value}
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
