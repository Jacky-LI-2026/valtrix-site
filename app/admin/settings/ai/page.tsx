"use client";

import { useEffect, useState } from "react";

const LANGS = [
  { code: "", label: "中文" },
  { code: "En", label: "English" },
  { code: "Ja", label: "日本語" },
  { code: "Ko", label: "한국어" },
  { code: "Fr", label: "Français" },
  { code: "Ar", label: "العربية" },
];

const FIELD = {
  input: "w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] bg-white",
  label: "block text-sm font-medium text-gray-700 mb-1",
  card: "rounded-lg border border-gray-100 bg-white p-4",
};

export default function AiSettingsPage() {
  const [form, setForm] = useState<any>({
    enabled: true, name: "AI 智能客服", welcome: "", nameEn: "", welcomeEn: "",
    nameJa: "", welcomeJa: "", nameKo: "", welcomeKo: "", nameFr: "", welcomeFr: "", nameAr: "", welcomeAr: "",
    apiKey: "", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", maxTurns: 8,
  });
  const [lang, setLang] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [cv, setCv] = useState({ enabled: true, strict: true });
  const [savingCv, setSavingCv] = useState(false);
  const [cvMsg, setCvMsg] = useState("");
  const [genWelcome, setGenWelcome] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/ai")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.config) setForm({ ...form, ...d.config });
      })
      .catch(() => {});
    fetch("/api/admin/settings/company-verify")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.config) setCv({ ...cv, ...d.config });
      })
      .catch(() => {});
  }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // AI 一键生成六语欢迎语
  const handleGenWelcome = async () => {
    setGenWelcome(true); setWelcomeMsg("")
    try {
      const res = await fetch("/api/admin/ai-config/generate-welcome", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成失败")
      const w = data.welcome || {}
      for (const l of LANGS) {
        const k = l.code === "" ? "zh" : l.code.toLowerCase()
        set("welcome" + l.code, w[k] || "")
      }
      setWelcomeMsg("已生成六语种欢迎语，请核对后保存")
    } catch (e: any) { setWelcomeMsg("生成失败：" + (e.message || "")) }
    finally { setGenWelcome(false) }
  }

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      setMsg(d?.ok ? d.message || "已保存" : d?.message || "保存失败");
    } catch (e) {
      setMsg("保存失败，请稍后再试");
    } finally {
      setSaving(false);
    }
  };

  const saveCv = async () => {
    setSavingCv(true);
    setCvMsg("");
    try {
      const res = await fetch("/api/admin/settings/company-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cv),
      });
      const d = await res.json();
      setCvMsg(d?.ok ? d.message || "已保存" : d?.message || "保存失败");
    } catch (e) {
      setCvMsg("保存失败，请稍后再试");
    } finally {
      setSavingCv(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 bg-white p-4">
        <h1 className="text-base font-semibold">AI 智能客服</h1>
        <p className="mt-1 text-sm text-gray-500">
          前台右下角悬浮 AI 客服（DeepSeek RAG），按语种回答本站产品/新闻/服务/应用领域问题，命中报价/价格/联系/定制等关键词时引导转人工留资，写入商机台账。未配置 API Key 时前台不显示。
        </p>
      </div>

      <div className={FIELD.card}>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-medium">启用 AI 客服（前台显示悬浮窗）</span>
        </label>
      </div>

      <div className={FIELD.card}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">客服名称 / 欢迎语（六语种）</span>
          <button type="button" onClick={handleGenWelcome} disabled={genWelcome}
            className="ml-auto rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-primary, #CC0000)" }}>
            {genWelcome ? "AI 生成中..." : "✨ AI 一键生成欢迎语"}
          </button>
          {welcomeMsg && <span className={"w-full text-xs " + (welcomeMsg.includes("失败") ? "text-red-500" : "text-green-600")}>{welcomeMsg}</span>}
          <div className="flex flex-wrap gap-1">
          {LANGS.map((l) => (
              <button key={l.code} type="button" onClick={() => setLang(l.code)}
                className={"rounded px-2 py-1 text-xs " + (lang === l.code ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-600")}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className={FIELD.label}>名称</label>
            <input className={FIELD.input} value={form["name" + lang] || ""} onChange={(e) => set("name" + lang, e.target.value)} />
          </div>
          <div>
            <label className={FIELD.label}>欢迎语</label>
            <textarea className={FIELD.input} rows={3} value={form["welcome" + lang] || ""} onChange={(e) => set("welcome" + lang, e.target.value)} />
          </div>
        </div>
      </div>

      <div className={FIELD.card}>
        <h3 className="mb-3 text-sm font-medium">DeepSeek / OpenAI 兼容接口配置</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={FIELD.label}>API Key（留空保留原值）</label>
            <input type="password" className={FIELD.input} value={form.apiKey} onChange={(e) => set("apiKey", e.target.value)} placeholder="sk-..." />
          </div>
          <div>
            <label className={FIELD.label}>Base URL</label>
            <input className={FIELD.input} value={form.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} />
          </div>
          <div>
            <label className={FIELD.label}>模型</label>
            <input className={FIELD.input} value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="deepseek-chat" />
          </div>
          <div>
            <label className={FIELD.label}>最大上下文轮数</label>
            <input type="number" min={1} max={20} className={FIELD.input} value={form.maxTurns} onChange={(e) => set("maxTurns", e.target.value)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          未填 API Key 时自动回退使用「AI 翻译」已配置的 DeepSeek Key。当前生产环境已配置 DeepSeek。
        </p>
      </div>

      <div className={FIELD.card}>
        <h3 className="mb-3 text-sm font-medium">询价公司名称核实（AI）</h3>
        <p className="mb-3 text-xs text-gray-500">
          询价提交时对中国企业名称联网核实（DeepSeek 判断真实性），非真实公司阻止提交。公司名含中文且带「公司/集团/股份/有限/科技」等标志时触发核实。
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={cv.enabled} onChange={(e) => setCv({ ...cv, enabled: e.target.checked })} className="h-4 w-4" />
            <span className="text-sm font-medium">启用公司名称核实</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={cv.strict} onChange={(e) => setCv({ ...cv, strict: e.target.checked })} className="h-4 w-4" />
            <span className="text-sm font-medium">严格模式（无法确认的公司也阻止提交）</span>
          </label>
          <p className="text-xs text-gray-400">默认宽松：仅拦截明确虚构/不存在的公司；无法确认的公司（多为真实但冷门的小公司）放行，避免误伤正常客户。</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={saveCv} disabled={savingCv}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-primary, #CC0000)" }}>
            {savingCv ? "保存中…" : "保存公司核实配置"}
          </button>
          {cvMsg && <span className={"text-sm " + (cvMsg.includes("失败") ? "text-red-500" : "text-green-600")}>{cvMsg}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className="rounded-md px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-primary, #CC0000)" }}>
          {saving ? "保存中…" : "保存配置"}
        </button>
        {msg && <span className={"text-sm " + (msg.includes("失败") ? "text-red-500" : "text-green-600")}>{msg}</span>}
      </div>
    </div>
  );
}
