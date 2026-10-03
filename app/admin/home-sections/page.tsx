"use client";

/**
 * 前台组件市场 · 后台页
 * 首页各区块的显示启停 + 排序
 */
import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Save, LayoutTemplate } from "lucide-react";

interface SectionRow {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
}

export default function HomeSectionsPage() {
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/home-sections")
      .then((r) => r.json())
      .then((d) => setRows(d.sections || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const move = (idx: number, dir: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[idx], next[to]] = [next[to], next[idx]];
      return next.map((r, i) => ({ ...r, sortOrder: i }));
    });
  };

  const toggle = (idx: number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, enabled: !r.enabled } : r)));
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/home-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: rows }),
      });
      const d = await r.json();
      setMsg(d.ok ? "保存成功，首页已按新配置渲染" : `保存失败：${d.error || ""}`);
    } catch (e: any) {
      setMsg(`保存失败：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">前台组件市场</h1>
          <p className="text-sm text-gray-500">可视化配置首页各区块：显示启停、展示顺序。关闭的区块前台不再渲染。</p>
        </div>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
          <Save size={15} /> {saving ? "保存中..." : "保存配置"}
        </button>
      </div>

      {msg && <div className={`px-4 py-2.5 rounded-md text-sm ${msg.startsWith("保存成功") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg}</div>}

      {loading && <div className="text-gray-500">加载中...</div>}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <LayoutTemplate size={16} className="text-purple-600" />
          <span className="text-sm font-medium text-gray-700">首页区块（共 {rows.length} 个，按展示顺序排列）</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.key} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 ${!r.enabled ? "bg-gray-50/60" : ""}`}>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-red-600 disabled:opacity-30" title="上移"><ArrowUp size={14} /></button>
              <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-gray-400 hover:text-red-600 disabled:opacity-30" title="下移"><ArrowDown size={14} /></button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${r.enabled ? "text-gray-900" : "text-gray-400 line-through"}`}>{r.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{r.key}</span>
              </div>
              <div className="text-xs text-gray-500">{r.description}</div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={r.enabled} onChange={() => toggle(i)} className="w-4 h-4 text-red-600 rounded" />
              <span className="text-xs text-gray-500">{r.enabled ? "显示" : "隐藏"}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
