"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Trash2, Play, Clock, CheckCircle, XCircle, Edit3, X, Sparkles } from "lucide-react";

interface CollectionSource {
  id: string;
  name: string;
  url: string;
  type: string;
  categoryId: string | null;
  category?: { name: string };
  enabled: boolean;
  intervalMin: number;
  autoPublish: boolean;
  useAI: boolean;
  aiMode?: string;
  lastFetched: string | null;
  lastStatus: string | null;
  lastError: string | null;
  createdAt: string;
}

const AI_MODE_OPTIONS = [
  { value: "off", label: "不使用 AI", desc: "原文直接入库，最快" },
  { value: "summary", label: "AI 生成摘要", desc: "大模型提炼 60 字摘要" },
  { value: "polish", label: "AI 润色正文", desc: "大模型润色正文更专业通顺" },
];

const TYPE_OPTIONS = [
  { value: "rss", label: "RSS" },
  { value: "html", label: "HTML" },
  { value: "api", label: "API" },
];

const AI_MODE_BADGE: Record<string, { label: string; cls: string }> = {
  off: { label: "原文", cls: "bg-dark-100 text-dark-500" },
  summary: { label: "AI摘要", cls: "bg-amber-50 text-amber-600" },
  polish: { label: "AI润色", cls: "bg-primary/10 text-primary" },
};

const EMPTY_FORM = {
  name: "",
  url: "",
  type: "rss",
  categoryId: "",
  intervalMin: 60,
  autoPublish: false,
  aiMode: "off" as string,
};

export default function CollectionSourcesPage() {
  const [sources, setSources] = useState<CollectionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CollectionSource | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/admin/collection-sources");
      const data = await res.json();
      if (Array.isArray(data)) setSources(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runCollection = async (id: string) => {
    setRunning(id);
    try {
      const res = await fetch("/api/admin/collection/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id }),
      });
      const data = await res.json();
      alert(data.message || (data.success ? "采集完成" : "采集失败"));
      fetchSources();
    } catch (e: any) {
      alert("采集失败: " + e.message);
    } finally {
      setRunning(null);
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("确定删除该采集源？")) return;
    try {
      await fetch(`/api/admin/collection-sources/${id}`, { method: "DELETE" });
      fetchSources();
    } catch (e) {
      console.error(e);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (s: CollectionSource) => {
    setEditing(s);
    setForm({
      name: s.name,
      url: s.url,
      type: s.type || "rss",
      categoryId: s.categoryId || "",
      intervalMin: s.intervalMin || 60,
      autoPublish: s.autoPublish,
      aiMode: s.aiMode || (s.useAI ? "polish" : "off"),
    });
    setShowModal(true);
  };

  const saveSource = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      alert("请填写名称和 URL");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        categoryId: form.categoryId ? form.categoryId : null,
        intervalMin: Number(form.intervalMin) || 60,
        enabled: true,
        useAI: form.aiMode !== "off",
      };
      const res = await fetch(editing ? `/api/admin/collection-sources/${editing.id}` : "/api/admin/collection-sources", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setShowModal(false);
      fetchSources();
    } catch (e: any) {
      alert("保存失败: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-dark-400">加载中...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-dark">新闻采集管理</h1>
          <p className="text-dark-500 text-sm mt-1">管理新闻采集源，支持定时采集与任务级 AI 摘要 / 润色</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors"
        >
          <Plus size={18} />
          新增采集源
        </button>
      </div>

      <div className="bg-white rounded-lg border border-dark-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-50 border-b border-dark-100">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">名称</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">类型</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">分类</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">间隔</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">AI 处理</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">状态</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">上次采集</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-dark-400">
                  暂无采集源，点击“新增采集源”创建
                </td>
              </tr>
            ) : (
              sources.map((source) => {
                const badge = AI_MODE_BADGE[source.aiMode || (source.useAI ? "polish" : "off")] || AI_MODE_BADGE.off;
                return (
                  <tr key={source.id} className="border-b border-dark-50 hover:bg-dark-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-dark">{source.name}</div>
                      <div className="text-xs text-dark-400 truncate max-w-xs">{source.url}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-dark-100 text-dark-600 px-2 py-1 rounded">
                        {source.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-600">
                      {source.category?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-600">
                      {source.intervalMin}分钟
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 w-fit ${badge.cls}`}>
                        {source.aiMode && source.aiMode !== "off" ? <Sparkles size={11} /> : null}
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {source.enabled ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle size={14} /> 启用
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-dark-400">
                            <XCircle size={14} /> 禁用
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-500">
                      {source.lastFetched
                        ? new Date(source.lastFetched).toLocaleString("zh-CN")
                        : "未采集"}
                      {source.lastStatus === "failed" && (
                        <div className="text-xs text-red-500 truncate max-w-xs">{source.lastError}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => runCollection(source.id)}
                          disabled={running === source.id}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded disabled:opacity-50"
                          title="立即采集"
                        >
                          {running === source.id ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(source)}
                          className="p-1.5 text-dark-500 hover:bg-dark-100 rounded"
                          title="编辑"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteSource(source.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-dark-50 rounded-lg">
        <h3 className="font-medium text-dark mb-2">采集说明</h3>
        <ul className="text-sm text-dark-500 space-y-1">
          <li>• 支持RSS、HTML、API三种采集类型</li>
          <li>• 任务级 AI 处理：每个采集源可单独设置为「原文 / AI生成摘要 / AI润色」，自动调用大模型</li>
          <li>• 定时采集任务在服务器后台运行，按设置的间隔自动执行</li>
          <li>• 采集到的新闻默认保存为草稿，可在新闻管理中审核发布</li>
        </ul>
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark">{editing ? "编辑采集源" : "新增采集源"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-dark-400 hover:bg-dark-50 rounded">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-1">名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如：行业资讯频道"
                  className="w-full px-3 py-2 border border-dark-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">URL *</label>
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com/rss.xml"
                  className="w-full px-3 py-2 border border-dark-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">采集类型</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-dark-100 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">采集间隔（分钟）</label>
                  <input
                    type="number"
                    min={5}
                    value={form.intervalMin}
                    onChange={(e) => setForm({ ...form, intervalMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-dark-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">
                  <span className="flex items-center gap-1"><Sparkles size={13} className="text-primary" /> AI 处理模式</span>
                </label>
                <div className="space-y-2">
                  {AI_MODE_OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        form.aiMode === o.value ? "border-primary bg-primary/5" : "border-dark-100 hover:border-dark-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="aiMode"
                        value={o.value}
                        checked={form.aiMode === o.value}
                        onChange={() => setForm({ ...form, aiMode: o.value })}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-sm font-medium text-dark">{o.label}</span>
                        <span className="block text-xs text-dark-400">{o.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-dark">
                <input
                  type="checkbox"
                  checked={form.autoPublish}
                  onChange={(e) => setForm({ ...form, autoPublish: e.target.checked })}
                />
                采集后自动发布（不勾选则保存为草稿）
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-dark-200 rounded text-sm text-dark-600 hover:bg-dark-50"
              >
                取消
              </button>
              <button
                onClick={saveSource}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded text-sm hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                {editing ? "保存修改" : "创建采集源"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
