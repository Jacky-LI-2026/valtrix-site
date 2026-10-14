"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Languages } from "lucide-react";

/**
 * 商品规格编辑器（多维度规格组合定价）—— **六语种**
 * ==========================================================================
 * owner 2026-10-14：「（规格组合定价）需要增加多语言翻译功能」
 *
 * 为什么必须做：规格**维度名与选项名会直接显示在前台**（商品详情页的选择区、
 *   加入购物车后的"型号/规格"列），而此前只有「中文 + 英文」两栏 ⇒
 *   日/韩/法/阿 语种的访客看到的是一串中文（英文站则是中英混排）。
 *
 * 字段命名沿用 G4：中文=基础名（`name` / `label`），其余语种=基础名+语言首字母大写
 *   （`nameEn/nameJa/nameKo/nameFr/nameAr`、`labelEn/…`）。存在 `specs` Json 列里，
 *   **不加表、不加列**，老数据（只有 zh/En）照样能读。
 *
 * UI 取舍：默认仍是紧凑一行（中文 + 英文），点「其它语种」才展开 ja/ko/fr/ar；
 *   「翻译」按钮用中文原文调 `/api/admin/translate` 一次性补齐其余 5 个语种
 *   （与多语言卡片 `MultiLangFieldV2` 用同一个接口，口径一致）。
 *
 * 规则：每个维度选择一个选项，组合单价 = 基础售价(price) + Σ各维度选中选项价格(price)
 */

/** 除中文外的 5 个语种（zh 是基础列，不在这里） */
const OTHER_LANGS = [
  { code: "en", label: "英" },
  { code: "ja", label: "日" },
  { code: "ko", label: "韩" },
  { code: "fr", label: "法" },
  { code: "ar", label: "阿" },
] as const;

/** zh → ""；en → "En"（与 G4 字段命名一致） */
const suffixOf = (code: string) => (code === "zh" ? "" : code.charAt(0).toUpperCase() + code.slice(1));

export interface SpecOption {
  label: string;
  labelEn?: string;
  labelJa?: string;
  labelKo?: string;
  labelFr?: string;
  labelAr?: string;
  price?: string; // 该选项价格分量（元），组合单价 = 基础售价 + Σ选中选项价格
}

export interface SpecDim {
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameKo?: string;
  nameFr?: string;
  nameAr?: string;
  options: SpecOption[];
}

interface SpecEditorProps {
  value: SpecDim[];
  onChange: (v: SpecDim[]) => void;
}

export default function SpecEditor({ value, onChange }: SpecEditorProps) {
  const dims: SpecDim[] = Array.isArray(value) ? value : [];
  /** 哪些行展开了「其它语种」（key：`dim-0` / `opt-0-1`） */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  /** 正在翻译的行（禁用按钮，避免重复点击） */
  const [busy, setBusy] = useState<string>("");

  const setDim = (i: number, d: SpecDim) => onChange(dims.map((x, xi) => (xi === i ? d : x)));
  const setOpt = (i: number, oi: number, o: SpecOption) =>
    setDim(i, { ...dims[i], options: dims[i].options.map((x, xi) => (xi === oi ? o : x)) });

  const toggle = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  /** 已填语种数（含中文），用于按钮上的 "3/6" 提示 */
  const filled = (obj: any, prefix: boolean) =>
    (prefix ? OTHER_LANGS.filter((l) => String(obj?.["name" + suffixOf(l.code)] || "").trim()).length + (String(obj?.name || "").trim() ? 1 : 0)
            : OTHER_LANGS.filter((l) => String(obj?.["label" + suffixOf(l.code)] || "").trim()).length + (String(obj?.label || "").trim() ? 1 : 0));

  /**
   * 一键翻译：拿中文原文逐个语种调后台统一翻译接口（与 `MultiLangFieldV2` 同一个接口）。
   *
   * ⚠️ **只填空语种**（`isEmpty` 返回 true 的才写）：已经手工校对过的译文**绝不覆盖** ——
   *   否则点一次翻译就把人工润色冲掉，属于静默丢数据（同族问题见多语言字段的老坑）。
   */
  const translateAll = async (
    zh: string,
    isEmpty: (code: string) => boolean,
    apply: (lang: string, v: string) => void,
    key: string
  ) => {
    const src = String(zh || "").trim();
    if (!src) {
      alert("请先填写中文内容，再点翻译");
      return;
    }
    setBusy(key);
    try {
      for (const l of OTHER_LANGS) {
        if (!isEmpty(l.code)) continue;
        let out = "";
        try {
          const r = await fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: src, from: "zh", targetLang: l.code }),
          });
          const d = await r.json().catch(() => ({}));
          out = String(d?.translatedText || "");
        } catch {
          out = "";
        }
        if (out) apply(l.code, out);
      }
    } finally {
      setBusy("");
    }
  };

  /** 一行里的「其它语种」展开区（en/ja/ko/fr/ar 五栏） */
  const langGrid = (
    base: "name" | "label",
    obj: any,
    onField: (field: string, v: string) => void
  ) => (
    <div className="mt-1.5 grid grid-cols-1 gap-1.5 rounded-lg border border-gray-100 bg-white/70 p-2 sm:grid-cols-5">
      {OTHER_LANGS.map((l) => {
        const field = base + suffixOf(l.code);
        return (
          <input
            key={l.code}
            className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
            placeholder={`${l.label}${base === "name" ? "文名" : "文选项"}`}
            value={obj?.[field] || ""}
            onChange={(e) => onField(field, e.target.value)}
          />
        );
      })}
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-700">规格组合定价</div>
          <div className="mt-0.5 text-xs text-gray-400">
            组合单价 = 基础售价 + 各维度选中选项价格之和；多个维度自由组合，形成不同型号价格
            <span className="ml-1 text-gray-400">（维度名与选项名支持六语种，前台按访客语种显示）</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...dims,
              { name: "", nameEn: "", nameJa: "", nameKo: "", nameFr: "", nameAr: "", options: [{ label: "", labelEn: "", labelJa: "", labelKo: "", labelFr: "", labelAr: "", price: "" }] },
            ])
          }
          className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" /> 添加规格维度
        </button>
      </div>

      {dims.length === 0 && (
        <div className="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400">
          未配置规格：商品按单一售价出售（数量档位为绝对单价）
        </div>
      )}

      <div className="space-y-3">
        {dims.map((d, i) => {
          const dimKey = `dim-${i}`;
          return (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-300" />
                <input
                  className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                  placeholder="维度名（如 净度/尺寸/功率）"
                  value={d.name || ""}
                  onChange={(e) => setDim(i, { ...d, name: e.target.value })}
                />
                <input
                  className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                  placeholder="英文名（如 Clarity/Size）"
                  value={d.nameEn || ""}
                  onChange={(e) => setDim(i, { ...d, nameEn: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => toggle(dimKey)}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:border-primary hover:text-primary"
                  title="其它语种（日/韩/法/阿）"
                >
                  <Languages className="mr-1 inline h-3.5 w-3.5" />
                  其它语种 {filled(d, true)}/6
                </button>
                <button
                  type="button"
                  disabled={busy === dimKey}
                  onClick={() =>
                    translateAll(
                      d.name,
                      (code) => !String((d as any)["name" + suffixOf(code)] || "").trim(),
                      (lang, v) => setDim(i, { ...d, ["name" + suffixOf(lang)]: v } as SpecDim),
                      dimKey
                    )
                  }
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:border-primary hover:text-primary disabled:opacity-50"
                  title="用中文名自动翻译其余 5 个语种"
                >
                  {busy === dimKey ? "翻译中…" : "翻译"}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(dims.filter((_, fi) => fi !== i))}
                  className="ml-auto rounded p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {expanded[dimKey] && langGrid("name", d, (f, v) => setDim(i, { ...d, [f]: v } as SpecDim))}

              <div className="space-y-1.5 pl-6">
                {d.options.map((o, oi) => {
                  const optKey = `opt-${i}-${oi}`;
                  return (
                    <div key={oi}>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                          placeholder="选项（如 VS / 1ct）"
                          value={o.label || ""}
                          onChange={(e) => setOpt(i, oi, { ...o, label: e.target.value })}
                        />
                        <input
                          className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                          placeholder="英文选项"
                          value={o.labelEn || ""}
                          onChange={(e) => setOpt(i, oi, { ...o, labelEn: e.target.value })}
                        />
                        <input
                          className="w-32 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                          placeholder="价格分量（元）"
                          value={o.price ?? ""}
                          onChange={(e) => setOpt(i, oi, { ...o, price: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => toggle(optKey)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:border-primary hover:text-primary"
                          title="其它语种（日/韩/法/阿）"
                        >
                          其它语种 {filled(o, false)}/6
                        </button>
                        <button
                          type="button"
                          disabled={busy === optKey}
                          onClick={() =>
                            translateAll(
                              o.label,
                              (code) => !String((o as any)["label" + suffixOf(code)] || "").trim(),
                              (lang, v) => setOpt(i, oi, { ...o, ["label" + suffixOf(lang)]: v } as SpecOption),
                              optKey
                            )
                          }
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:border-primary hover:text-primary disabled:opacity-50"
                          title="用中文选项自动翻译其余 5 个语种"
                        >
                          {busy === optKey ? "翻译中…" : "翻译"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDim(i, { ...d, options: d.options.filter((_, fi) => fi !== oi) })}
                          className="rounded p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {expanded[optKey] && langGrid("label", o, (f, v) => setOpt(i, oi, { ...o, [f]: v } as SpecOption))}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDim(i, { ...d, options: [...d.options, { label: "", labelEn: "", labelJa: "", labelKo: "", labelFr: "", labelAr: "", price: "" }] })}
                  className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" /> 添加选项
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
