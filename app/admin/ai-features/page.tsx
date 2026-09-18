"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, CheckCircle2, XCircle, Settings2 } from "lucide-react";

interface FeatureItem {
  key: string;
  name: string;
  description: string;
  pluginKey: string;
  category: string;
  categoryLabel: string;
  defaultEnabled: boolean;
  enabled: boolean;
  config: Record<string, any>;
  configFields?: { key: string; label: string; type: string; placeholder?: string; options?: { label: string; value: string }[] }[];
}

export default function AiFeaturesPage() {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [configTarget, setConfigTarget] = useState<FeatureItem | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await fetch("/api/admin/ai-features");
      const d = await r.json();
      if (d.ok) {
        setFeatures(d.list);
        setGlobalEnabled(d.globalEnabled);
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map: Record<string, FeatureItem[]> = {};
    features.forEach((f) => { (map[f.categoryLabel] = map[f.categoryLabel] || []).push(f); });
    return map;
  }, [features]);

  const toggle = async (f: FeatureItem) => {
    setFeatures((prev) => prev.map((x) => (x.key === f.key ? { ...x, enabled: !x.enabled } : x)));
    try {
      const r = await fetch("/api/admin/ai-features", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", key: f.key }),
      });
      const d = await r.json();
      if (!d.ok) { setError("切换失败：" + (d.error || "")); load(); }
    } catch { setError("网络异常"); load(); }
  };

  const toggleGlobal = async () => {
    const next = !globalEnabled;
    setGlobalEnabled(next);
    try {
      const r = await fetch("/api/admin/ai-features", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "global", enabled: next }),
      });
      const d = await r.json();
      if (!d.ok) { setGlobalEnabled(!next); setError("切换失败"); }
    } catch { setGlobalEnabled(!next); }
  };

  const saveConfig = async () => {
    if (!configTarget) return;
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/admin/ai-features", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: configTarget.key, config: configForm }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "保存失败");
      setConfigTarget(null); load();
    } catch (e: any) { setError(e.message || "保存失败"); }
    finally { setSaving(false); }
  };

  const renderConfigField = (f: any) => {
    const val = configForm[f.key];
    if (f.type === "boolean") {
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700 mt-1">
          <input type="checkbox" checked={!!val} onChange={(e) => setConfigForm({ ...configForm, [f.key]: e.target.checked })} className="w-4 h-4" />
          {f.label}
        </label>
      );
    }
    if (f.type === "select") {
      return (
        <div className="text-sm">
          <label className="block text-gray-600 mb-1">{f.label}</label>
          <select value={val || ""} onChange={(e) => setConfigForm({ ...configForm, [f.key]: e.target.value })}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm">
            {f.options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div className="text-sm">
        <label className="block text-gray-600 mb-1">{f.label}</label>
        <input type={f.type === "number" ? "number" : "text"} value={val || ""}
          onChange={(e) => setConfigForm({ ...configForm, [f.key]: e.target.value })}
          placeholder={f.placeholder || ""} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Sparkles size={24} className="text-red-600" /> AI 开关矩阵
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            每个功能独立 AI 开关：全局总闸 × AI 插件 × 功能点，三层全开才生效。关闭某功能点 = 该功能前台/后台的 AI 按钮隐藏或禁用。
          </p>
        </div>
        <button onClick={toggleGlobal}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${globalEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {globalEnabled ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          全局 AI {globalEnabled ? "已开启" : "已关闭"}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-4 py-2 mb-4">{error}</div>}

      {loading ? (
        <div className="text-gray-500 py-10">加载中...</div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">{cat} · {list.length}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((f) => (
                <div key={f.key} className={`bg-white rounded-xl border p-4 flex flex-col ${f.enabled ? "border-green-200" : "border-gray-200 opacity-80"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{f.name}</span>
                        {f.enabled ? <CheckCircle2 size={16} className="text-green-500" /> : <XCircle size={16} className="text-gray-400" />}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">依赖插件：{f.pluginKey}</div>
                    </div>
                    <button onClick={() => toggle(f)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${f.enabled ? "bg-green-500" : "bg-gray-300"}`}
                      aria-label={f.enabled ? "停用" : "启用"}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${f.enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed flex-1">{f.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {f.configFields && f.configFields.length > 0 && (
                      <button onClick={() => { setConfigTarget(f); setConfigForm({ ...(f.config || {}) }); }}
                        className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
                        <Settings2 size={12} /> 配置
                      </button>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">默认{f.defaultEnabled ? "开" : "关"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {configTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfigTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{configTarget.name} · 配置</h3>
            <p className="text-xs text-gray-500 mb-4">{configTarget.description}</p>
            <div className="space-y-4">
              {(configTarget.configFields || []).map((f) => <div key={f.key}>{renderConfigField(f)}</div>)}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setConfigTarget(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={saveConfig} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
