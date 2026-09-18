"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Search, Link2, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";

interface Backlink {
  id: string;
  platform: string;
  platformType: string;
  title: string;
  url: string;
  targetUrl: string;
  status: string;
  priority: number;
  keyword: string;
  note: string;
  publishDate: string | null;
  checkDate: string | null;
  createdAt: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  zhihu: "知乎",
  baijiahao: "百家号",
  sohu: "搜狐号",
  toutiao: "头条号",
  tieba: "百度贴吧",
  forum: "行业论坛",
  weibo: "微博",
  other: "其他",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "待发布",
  published: "已发布",
  live: "生效中",
  failed: "已失败",
  expired: "已失效",
};

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-gray-100 text-gray-600",
  published: "bg-blue-50 text-blue-600",
  live: "bg-green-50 text-green-600",
  failed: "bg-red-50 text-red-600",
  expired: "bg-yellow-50 text-yellow-600",
};

const EMPTY_FORM = {
  platform: "",
  platformType: "zhihu",
  title: "",
  url: "",
  targetUrl: "",
  status: "planned",
  priority: 3,
  keyword: "",
  note: "",
  publishDate: "",
};

export default function BacklinksPage() {
  const [items, setItems] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [keyword, setKeyword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Backlink | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("platformType", filterType);
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/admin/backlinks?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, keyword]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (it: Backlink) => {
    setEditing(it);
    setForm({
      platform: it.platform,
      platformType: it.platformType,
      title: it.title || "",
      url: it.url,
      targetUrl: it.targetUrl || "",
      status: it.status,
      priority: it.priority,
      keyword: it.keyword || "",
      note: it.note || "",
      publishDate: it.publishDate ? it.publishDate.slice(0, 10) : "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.platform || !form.url) {
      alert("平台名称与外链地址为必填项");
      return;
    }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/admin/backlinks/${editing.id}` : "/api/admin/backlinks";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, priority: Number(form.priority) || 3 }),
      });
      const data = await res.json();
      if (data.error) {
        alert("保存失败: " + data.error);
      } else {
        setShowForm(false);
        fetchItems();
      }
    } catch (e: any) {
      alert("保存失败: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (it: Backlink) => {
    if (!window.confirm(`确认删除「${it.platform}」外链？`)) return;
    try {
      await fetch(`/api/admin/backlinks/${it.id}`, { method: "DELETE" });
      fetchItems();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-dark">外链回链管理</h1>
          <p className="text-dark-500 text-sm mt-1">
            在第三方平台（知乎、百家号、搜狐号、头条号、百度贴吧、行业论坛等）发布带本站链接的内容，形成数据回链，助力搜索引擎收录与权重沉淀。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/backlinks/posts"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
          >
            <Sparkles size={16} /> 外链软文营销
          </Link>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} /> 新增外链
          </button>
        </div>
      </div>

      {/* 平台优先级参考 */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
        <div className="font-semibold mb-1">平台优先级建议（权重从高到低）</div>
        <div className="flex flex-wrap gap-2">
          {["知乎专栏", "百家号 / 搜狐号 / 头条号", "百度贴吧", "行业论坛"].map((p) => (
            <span key={p} className="px-2 py-0.5 bg-white rounded border border-blue-100">{p}</span>
          ))}
        </div>
        <div className="text-xs text-blue-600 mt-2">
          ⚠️ 反作弊提醒：外链需自然、与内容相关；勿堆砌垃圾外链、勿短时间内批量群发，避免被搜索引擎判定为作弊降权。优先在知乎等高质量平台创作真实内容并嵌入官网链接。
        </div>
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-lg border border-dark-100 p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchItems()}
            placeholder="搜索平台/标题/关键词..."
            className="w-full pl-9 pr-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary bg-white"
        >
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary bg-white"
        >
          <option value="">全部平台</option>
          {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={fetchItems}
          className="flex items-center gap-2 px-4 py-2 border border-dark-200 rounded hover:bg-dark-50 transition-colors"
        >
          <RefreshCw size={14} /> 查询
        </button>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg border border-dark-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-dark-400">加载中...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-dark-400">暂无外链记录，点击右上角「新增外链」开始建立数据回链</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-dark-50 text-left text-dark-500">
              <tr>
                <th className="px-4 py-3">平台</th>
                <th className="px-4 py-3">标题/外链</th>
                <th className="px-4 py-3">回链目标</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">优先级</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-dark-100 hover:bg-dark-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link2 size={14} className="text-primary" />
                      <span className="font-medium text-dark">{it.platform}</span>
                    </div>
                    <span className="text-xs text-dark-400">{PLATFORM_LABELS[it.platformType] || it.platformType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[280px] truncate">{it.title || "(无标题)"}</div>
                    <a href={it.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink size={12} /> {it.url.slice(0, 60)}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs text-dark-500 max-w-[160px] truncate">{it.targetUrl || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_STYLES[it.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[it.status] || it.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= it.priority ? "text-primary" : "text-dark-200"}>★</span>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(it)} className="text-dark-400 hover:text-primary" title="编辑">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => remove(it)} className="text-dark-400 hover:text-red-500" title="删除">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-dark mb-4">{editing ? "编辑外链" : "新增外链"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-1">平台名称 *</label>
                <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="如：知乎专栏" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">平台类型</label>
                <select value={form.platformType} onChange={(e) => setForm({ ...form, platformType: e.target.value })} className="w-full px-3 py-2 border border-dark-200 rounded bg-white">
                  {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-dark mb-1">发文标题</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="第三方平台发布的文章标题" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-dark mb-1">外链地址 *</label>
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://zhuanlan.zhihu.com/p/xxx" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-dark mb-1">回链目标（本站页面）</label>
                <input value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} placeholder="如：/products（默认首页）" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">状态</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-dark-200 rounded bg-white">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">优先级（1-5，1 最高）</label>
                <input type="number" min={1} max={5} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-dark mb-1">主关键词</label>
                <input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="如：工业阀门" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">发布日期</label>
                <input type="date" value={form.publishDate} onChange={(e) => setForm({ ...form, publishDate: e.target.value })} className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-dark mb-1">备注</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="记录发文计划、账号、注意事项等" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-dark-200 rounded hover:bg-dark-50">取消</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
