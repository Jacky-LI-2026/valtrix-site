"use client";

import { useCallback, useEffect, useState } from "react";
import UrlUploadInput from "@/components/admin/UrlUploadInput";

interface QuoteOption {
  key: string;
  icon: string;
  enabled: boolean;
  label: { zh: string; en: string; ja: string; ko: string; fr: string; ar: string };
}

interface Tpl {
  headerName: string;
  headerNameEn: string;
  logo: string;
  primaryColor: string;
  quoteTitle: string;
  showPriceRange: boolean;
  validityDays: number;
  footerText: string;
  options: QuoteOption[];
}

const DEFAULT_OPTIONS: QuoteOption[] = [
  { key: "support", icon: "support", enabled: true, label: { zh: "配套设备及辅材", en: "Supporting Equipment & Materials", ja: "付属設備・副資材", ko: "부속 장비 및 자재", fr: "Équipements & matériaux associés", ar: "المعدات والمواد الداعمة" } },
  { key: "turnkey", icon: "turnkey", enabled: true, label: { zh: "交钥匙工程", en: "Turnkey Engineering", ja: "ターンキーエンジニアリング", ko: "턴키 엔지니어링", fr: "Ingénierie clé en main", ar: "الهندسة المتكاملة" } },
  { key: "training", icon: "training", enabled: true, label: { zh: "工艺培训包", en: "Process Training Package", ja: "プロセス研修パッケージ", ko: "공정 교육 패키지", fr: "Pack de formation process", ar: "حزمة التدريب التقني" } },
  { key: "custom", icon: "custom", enabled: true, label: { zh: "定制化服务", en: "Customization Service", ja: "カスタマイズサービス", ko: "맞춤형 서비스", fr: "Service de personnalisation", ar: "خدمة التخصيص" } },
  { key: "other", icon: "other", enabled: true, label: { zh: "其他需求", en: "Other Requirements", ja: "その他のご要望", ko: "기타 요구사항", fr: "Autres besoins", ar: "احتياجات أخرى" } },
];

const ICON_OPTIONS = ["support", "turnkey", "training", "custom", "other"];
const LANG_KEYS: (keyof QuoteOption["label"])[] = ["zh", "en", "ja", "ko", "fr", "ar"];

const DEFAULTS: Tpl = {
  headerName: "",
  headerNameEn: "",
  logo: "",
  primaryColor: "#CC0000",
  quoteTitle: "报价单 QUOTATION",
  showPriceRange: true,
  validityDays: 15,
  footerText: "本报价单仅供参考，最终价格与交货期以双方书面确认为准。",
  options: DEFAULT_OPTIONS,
};

export default function QuoteTemplatePage() {
  const [form, setForm] = useState<Tpl>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/quotes/template");
      const data = await res.json();
      if (data.success && data.data) setForm({ ...DEFAULTS, ...data.data });
    } catch (e) {
      setMsg({ type: "err", text: "读取模板配置失败" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof Tpl, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/quotes/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "保存失败");
      setMsg({ type: "ok", text: "模板已保存，新的报价单 PDF 将按此模板生成。" });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "保存失败" });
    } finally {
      setSaving(false);
    }
  }

  /** 用当前表单实时生成预览 PDF（不依赖保存） */
  async function preview() {
    setMsg(null);
    try {
      const res = await fetch("/api/quote/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: true, template: form }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`生成预览失败：${t.slice(0, 120)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "报价单模板预览.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "生成预览失败" });
    }
  }

  const inputCls =
    "w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-500";

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        <h1 className="mb-4 text-base font-semibold text-gray-800">报价单模板</h1>
        加载中…
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">报价单模板</h1>
        <div className="flex gap-2">
          <button
            onClick={preview}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            生成预览 PDF
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存模板"}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`mb-4 rounded-md border px-4 py-2.5 text-sm ${
            msg.type === "ok"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="max-w-3xl space-y-5 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">
              公司抬头 <span className="text-gray-400">（留空则用站点名称）</span>
            </label>
            <input className={inputCls} value={form.headerName} onChange={(e) => set("headerName", e.target.value)} placeholder="例如：深圳市VALTRIX Co., Ltd." />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">英文抬头</label>
            <input className={inputCls} value={form.headerNameEn} onChange={(e) => set("headerNameEn", e.target.value)} placeholder="例如：ABC Technology Co., Ltd." />
          </div>
        </div>

        <div>
          <UrlUploadInput
            value={form.logo}
            onChange={(v) => set("logo", v)}
            label="公司 LOGO"
            placeholder="上传/输入公司 LOGO 图片 URL"
            accept="image/*"
          />
          <p className="mt-1 text-xs text-gray-400">LOGO 将显示在报价单页眉左侧（建议透明背景 PNG，高度 ≤ 56px）。上传后自动压缩适配 WEB。</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">主题色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(form.primaryColor) ? form.primaryColor : "#CC0000"}
                onChange={(e) => set("primaryColor", e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-gray-200"
              />
              <input className={inputCls} value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">报价有效期（天，0=不显示）</label>
            <input type="number" min={0} className={inputCls} value={form.validityDays} onChange={(e) => set("validityDays", Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-gray-600">报价单标题</label>
          <input className={inputCls} value={form.quoteTitle} onChange={(e) => set("quoteTitle", e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.showPriceRange}
            onChange={(e) => set("showPriceRange", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          显示价格区间（关闭后合计区显示“价格面议”）
        </label>

        <div>
          <label className="mb-1.5 block text-sm text-gray-600">页脚声明</label>
          <textarea
            className={inputCls}
            rows={2}
            value={form.footerText}
            onChange={(e) => set("footerText", e.target.value)}
          />
        </div>

        {/* 询价附加需求选项（后台可增删、多语） */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">询价附加需求选项</label>
            <button
              type="button"
              onClick={() => {
                const next = [...form.options];
                next.push({
                  key: "opt_" + Date.now().toString(36),
                  icon: "other",
                  enabled: true,
                  label: { zh: "", en: "", ja: "", ko: "", fr: "", ar: "" },
                });
                set("options", next);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              + 新增选项
            </button>
          </div>
          <p className="mb-3 text-xs text-gray-400">前台询价车与报价单 PDF 均按此选项展示，支持六语显示。取消勾选「启用」后前台不展示该选项。</p>
          {form.options.length === 0 ? (
            <div className="py-3 text-center text-sm text-gray-400">暂无选项，点击「+ 新增选项」添加</div>
          ) : (
            <div className="space-y-3">
              {form.options.map((o, idx) => (
                <div key={idx} className="rounded-md border border-gray-100 bg-gray-50/60 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={o.enabled}
                        onChange={(e) => {
                          const next = [...form.options];
                          next[idx] = { ...next[idx], enabled: e.target.checked };
                          set("options", next);
                        }}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                      />
                      启用
                    </label>
                    <select
                      value={o.icon}
                      onChange={(e) => {
                        const next = [...form.options];
                        next[idx] = { ...next[idx], icon: e.target.value };
                        set("options", next);
                      }}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                    >
                      {ICON_OPTIONS.map((ic) => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-400">标识: {o.key}</span>
                    <button
                      type="button"
                      onClick={() => set("options", form.options.filter((_, i) => i !== idx))}
                      className="ml-auto rounded-md border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {LANG_KEYS.map((lk) => (
                      <input
                        key={lk}
                        className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-red-400"
                        placeholder={lk === "zh" ? "中文名称 *" : `名称(${lk.toUpperCase()})`}
                        value={o.label[lk] || ""}
                        onChange={(e) => {
                          const next = [...form.options];
                          next[idx] = { ...next[idx], label: { ...next[idx].label, [lk]: e.target.value } };
                          set("options", next);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
          说明：报价单 PDF 由系统按此模板即时生成（页眉 LOGO/抬头、主题色、标题、价格区间、有效期与页脚声明）。
          报价单按询价客户语言自动生成：中文客户收到中文版，非中文客户（英/日/韩/法/阿）直接发送英文版。
          保存后，前台询价产生的报价单与后台下载/审核发送的报价单 PDF 均使用此模板。
        </div>
      </div>
    </div>
  );
}
