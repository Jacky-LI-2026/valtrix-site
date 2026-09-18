"use client";

import { useEffect, useState } from "react";
import { Sparkles, Wand2, Copy, Check, Loader2, Building2 } from "lucide-react";

/**
 * AI 建站向导 — R3
 * 输入公司信息 → AI 一键生成整站文案骨架 → 复制/填入各模块
 */
export default function AiSiteWizardPage() {
  const [packs, setPacks] = useState<any[]>([]);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    business: "",
    extra: "",
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/admin/templates/industry")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPacks(d.packs || []); })
      .catch(() => {});
  }, []);

  const flash = (m: string, t: "ok" | "err" = "ok") => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

  const generate = async () => {
    if (!form.companyName.trim() || !form.business.trim()) {
      flash("公司名称与核心业务描述为必填项", "err");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const r = await fetch("/api/admin/ai-site-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "生成失败");
      setResult(d.data);
      flash("整站文案骨架已生成");
    } catch (e: any) {
      flash(e.message || "生成失败", "err");
    } finally {
      setGenerating(false);
    }
  };

  const copyField = (key: string) => {
    const v = result?.[key];
    if (!v) return;
    const text = typeof v === "string" ? v : JSON.stringify(v);
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const renderField = (key: string, label: string) => {
    if (!result) return null;
    const v = result[key];
    if (!v) return null;
    return (
      <div key={key} className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <button onClick={() => copyField(key)} className="text-blue-600 hover:text-blue-800 text-xs inline-flex items-center gap-1">
            {copied === key ? <Check size={14} /> : <Copy size={14} />}
            {copied === key ? "已复制" : "复制"}
          </button>
        </div>
        {typeof v === "string" ? (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{v}</p>
        ) : Array.isArray(v) ? (
          <div className="space-y-1.5">
            {v.map((item: any, i: number) => (
              <div key={i} className="text-sm text-gray-600">
                {item.title || item.label ? <span className="font-medium text-gray-700">{item.title || item.label}：</span> : null}
                {item.desc || item.value || item.text || ""}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Wand2 size={24} className="text-purple-600" />
            AI 建站向导
          </h1>
          <p className="text-gray-500 mt-1">输入公司信息，AI 一键生成整站文案骨架，快速搭建新站点</p>
        </div>
      </div>

      {msg && <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm">{msg}</div>}

      {/* 输入表单 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-purple-600" />
          <h2 className="font-semibold text-gray-800">公司信息</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">公司名称 *</label>
            <input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="如：XX科技有限公司"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">所属行业</label>
            <select
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">通用行业</option>
              {packs.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">核心业务描述 *</label>
          <textarea
            value={form.business}
            onChange={(e) => setForm({ ...form, business: e.target.value })}
            placeholder="如：我们专注于工业阀门与精密流体控制元件的研发制造，提供从产品、选型到系统的全链条解决方案…"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">附加要求（可选）</label>
          <input
            value={form.extra}
            onChange={(e) => setForm({ ...form, extra: e.target.value })}
            placeholder="如：突出国际化，强调自主研发，语气专业简洁"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="mt-5 inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "AI 生成中..." : "AI 生成整站文案"}
        </button>
      </div>

      {/* 生成结果 */}
      {result && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-800">生成结果（可复制到各内容模块）</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {renderField("heroTitle", "首页大标题 Hero")}
            {renderField("heroSubtitle", "首页副标题")}
            {renderField("aboutTitle", "关于我们标题")}
            {renderField("aboutText", "关于我们简介")}
            {renderField("stats", "数据统计")}
            {renderField("featureTitle", "核心优势标题")}
            {renderField("featureDesc", "核心优势描述")}
            {renderField("features", "核心优势列表")}
            {renderField("productTitle", "产品中心标题")}
            {renderField("productDesc", "产品中心描述")}
            {renderField("serviceTitle", "服务能力标题")}
            {renderField("serviceDesc", "服务能力描述")}
            {renderField("services", "服务能力列表")}
            {renderField("ctaTitle", "行动号召标题")}
            {renderField("ctaSubtitle", "行动号召副标题")}
            {renderField("seoTitle", "SEO 标题")}
            {renderField("seoDescription", "SEO 描述")}
            {renderField("seoKeywords", "SEO 关键词")}
          </div>
        </div>
      )}
    </div>
  );
}
