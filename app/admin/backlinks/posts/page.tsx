"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Sparkles, Edit, Trash2, ExternalLink, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Post {
  id: string;
  backlinkId: string | null;
  platform: string;
  platformType: string;
  title: string;
  content: any;
  status: string;
  publishUrl: string | null;
  targetUrl: string | null;
  aiGenerated: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface Backlink {
  id: string;
  platform: string;
  title: string;
  url: string;
  targetUrl: string;
  keyword: string;
}

const STATUS_LABELS: Record<string, string> = { draft: "草稿", published: "已发布", failed: "失败" };
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-50 text-green-600",
  failed: "bg-red-50 text-red-600",
};

const LANG_LABELS: Record<string, string> = { zh: "中文", en: "English", ja: "日本語", ko: "한국어", fr: "Français", ar: "العربية" };

export default function BacklinkPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // 编辑态
  const [editing, setEditing] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLang, setEditLang] = useState("zh");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  const [editPublishUrl, setEditPublishUrl] = useState("");

  // AI 生成参数
  const [aiBacklinkId, setAiBacklinkId] = useState("");
  const [aiKeyword, setAiKeyword] = useState("");
  const [aiPlatform, setAiPlatform] = useState("zhihu");
  const [aiTopic, setAiTopic] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/backlinks/posts");
      const d = await r.json();
      setPosts(Array.isArray(d) ? d : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/backlinks").then(r => r.json()).then(d => {
      setBacklinks(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  // AI 生成
  const aiGenerate = async () => {
    setBusy(true);
    try {
      const bl = backlinks.find(b => String(b.id) === aiBacklinkId);
      const r = await fetch("/api/admin/backlinks/posts/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backlinkId: aiBacklinkId || undefined,
          platform: bl ? bl.platform : aiPlatform,
          keyword: aiKeyword || bl?.keyword || "工业阀门",
          targetUrl: bl?.targetUrl || undefined,
          topic: aiTopic || undefined,
        }),
      });
      const d = await r.json();
      if (d.error) { flash("生成失败：" + d.error); return; }
      flash("AI 已生成软文草稿");
      setAiKeyword(""); setAiTopic("");
      load();
    } catch (e: any) { flash("生成异常：" + e.message); }
    finally { setBusy(false); }
  };

  // 打开编辑
  const openEdit = (p: Post) => {
    setEditing(p);
    setEditTitle(p.title);
    setEditLang("zh");
    const c = p.content || {};
    setEditContent(typeof c === "string" ? c : (c.zh || ""));
    setEditStatus(p.status);
    setEditPublishUrl(p.publishUrl || "");
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const c = editing.content || {};
      const next = { ...(typeof c === "string" ? {} : c), [editLang]: editContent };
      const r = await fetch(`/api/admin/backlinks/posts/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: next, status: editStatus, publishUrl: editPublishUrl }),
      });
      const d = await r.json();
      if (d.error) { flash("保存失败：" + d.error); return; }
      flash("已保存");
      setEditing(null);
      load();
    } catch (e: any) { flash("保存异常：" + e.message); }
    finally { setBusy(false); }
  };

  // 删除
  const remove = async (p: Post) => {
    if (!confirm(`删除软文「${p.title}」？`)) return;
    await fetch(`/api/admin/backlinks/posts/${p.id}`, { method: "DELETE" });
    load();
  };

  // 标记发布
  const markPublished = async (p: Post) => {
    setBusy(true);
    await fetch(`/api/admin/backlinks/posts/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published", publishUrl: p.publishUrl || "" }),
    });
    setBusy(false);
    flash("已标记为发布");
    load();
  };

  const langContent = (p: Post, lang: string) => {
    const c = p.content || {};
    return typeof c === "string" ? c : (c[lang] || "");
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/admin/backlinks" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-2">
            <ArrowLeft size={14} /> 返回外链台账
          </Link>
          <h1 className="text-[22px] font-bold tracking-tight text-dark">外链软文营销</h1>
          <p className="text-gray-500 text-sm mt-1">
            针对目标外链生成营销软文，AI 自动创作草稿，人工编辑后复制到第三方平台发布，发布后记录回链地址。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { load(); }} className="flex items-center gap-1 px-3 py-2 border border-dark-200 rounded hover:bg-dark-50 text-sm">
            <RefreshCw size={14} /> 刷新
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 px-4 py-2 bg-green-50 border border-green-100 text-green-700 text-sm rounded">{msg}</div>}

      {/* AI 生成区 */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 font-semibold text-indigo-800 mb-3">
          <Sparkles size={16} /> AI 生成外链软文
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={aiBacklinkId}
            onChange={e => setAiBacklinkId(e.target.value)}
            className="px-3 py-2 border border-dark-200 rounded text-sm bg-white"
          >
            <option value="">选择外链目标（可选）</option>
            {backlinks.map(b => (
              <option key={b.id} value={String(b.id)}>{b.platform} - {b.title || b.keyword || b.url}</option>
            ))}
          </select>
          <input
            value={aiKeyword}
            onChange={e => setAiKeyword(e.target.value)}
            placeholder="核心关键词（如：工业阀门）"
            className="px-3 py-2 border border-dark-200 rounded text-sm"
          />
          <input
            value={aiTopic}
            onChange={e => setAiTopic(e.target.value)}
            placeholder="主题（可选，如：闸阀在石化行业的应用）"
            className="px-3 py-2 border border-dark-200 rounded text-sm"
          />
          <button
            onClick={aiGenerate}
            disabled={busy}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            <Sparkles size={15} /> {busy ? "AI 创作中..." : "AI 生成草稿"}
          </button>
        </div>
      </div>

      {/* 软文列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-400">暂无软文，点击上方「AI 生成草稿」开始创建</div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="border border-dark-100 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-dark">{p.title}</span>
                    {p.aiGenerated && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-xs rounded">AI 生成</span>}
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_STYLES[p.status] || ""}`}>{STATUS_LABELS[p.status] || p.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>平台：{p.platform}</span>
                    {p.targetUrl && <span>回链：<a className="text-blue-500 hover:underline" href={p.targetUrl} target="_blank" rel="noreferrer">{p.targetUrl}</a></span>}
                    {p.publishUrl && <span>发布地址：<a className="text-blue-500 hover:underline" href={p.publishUrl} target="_blank" rel="noreferrer">{p.publishUrl}</a></span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3 whitespace-pre-wrap">{langContent(p, "zh")}</p>
                  <div className="text-xs text-gray-400 mt-1">
                    中文 {langContent(p, "zh").length} 字 · 英文 {langContent(p, "en")?.length || 0} 字 · 日文 {langContent(p, "ja")?.length || 0} 字
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => openEdit(p)} className="flex items-center gap-1 px-3 py-1.5 border border-dark-200 rounded text-xs hover:bg-dark-50">
                    <Edit size={12} /> 编辑
                  </button>
                  {p.status !== "published" && (
                    <button onClick={() => markPublished(p)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                      <ExternalLink size={12} /> 标记已发布
                    </button>
                  )}
                  <button onClick={() => remove(p)} className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded text-xs hover:bg-red-50">
                    <Trash2 size={12} /> 删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">编辑软文</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">标题</label>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">语种：</label>
                <select value={editLang} onChange={e => setEditLang(e.target.value)} className="px-3 py-2 border border-dark-200 rounded text-sm">
                  {Object.entries(LANG_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <div className="text-xs text-gray-400">{langContent(editing, editLang)?.length || 0} 字</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">正文（{LANG_LABELS[editLang]}）</label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-dark-200 rounded font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">状态</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-3 py-2 border border-dark-200 rounded text-sm">
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                    <option value="failed">失败</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">发布地址（第三方平台文章链接）</label>
                  <input value={editPublishUrl} onChange={e => setEditPublishUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-dark-200 rounded text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-dark-200 rounded hover:bg-dark-50">取消</button>
              <button onClick={saveEdit} disabled={busy} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50">
                {busy ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
