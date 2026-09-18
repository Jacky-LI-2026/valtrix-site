"use client";

import PageTitle from "@/components/ui/PageTitle";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, FileText, MessageSquare, Download, Send, RefreshCw, LogIn, LifeBuoy } from "lucide-react";

interface PortalData {
  member: { id: string; name: string; email: string; company: string; customerNo: string; customerType: string; level: string };
  license: any;
  stats: { quoteCount: number; ticketCount: number; manualCount: number };
  tickets: any[];
  manuals: any[];
}

const STATUS_LABEL: Record<string, string> = {
  open: "待处理",
  replied: "已回复",
  closed: "已关闭",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-amber-50 text-amber-600",
  replied: "bg-blue-50 text-blue-600",
  closed: "bg-gray-100 text-gray-500",
};
const CATEGORY_LABEL: Record<string, string> = {
  general: "综合咨询",
  license: "授权相关",
  manual: "手册资料",
  quote: "报价相关",
  other: "其他",
};

export default function PortalPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "ticket">("overview");
  // 工单表单
  const [tSubject, setTSubject] = useState("");
  const [tCategory, setTCategory] = useState("general");
  const [tContent, setTContent] = useState("");
  const [tPriority, setTPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/overview");
      if (res.status === 401) {
        setError("unauth");
        setLoading(false);
        return;
      }
      const d = await res.json();
      if (d.ok) setData(d.data);
      else setError(d.error || "加载失败");
    } catch (e: any) {
      setError(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load() }, [load]);

  const submit = async () => {
    if (!tSubject.trim() || !tContent.trim()) { setMsg("请填写主题与内容"); return }
    setSubmitting(true); setMsg("");
    try {
      const res = await fetch("/api/portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: tSubject, category: tCategory, content: tContent, priority: tPriority }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "提交失败");
      setMsg("工单提交成功，我们将在 1 个工作日内回复");
      setTSubject(""); setTContent(""); setTCategory("general"); setTPriority("normal");
      load();
    } catch (e: any) {
      setMsg(e.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">加载中...</div>;

  if (error === "unauth") {
    return (
      <>
<PageTitle title="客户门户" fallback="VALTRIX VALTRIX" />
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <LogIn size={40} className="text-gray-300 mb-3" />
        <h1 className="text-lg font-bold mb-2">客户门户</h1>
        <p className="text-gray-500 text-sm mb-4">请先登录会员账号，即可查看授权信息、下载手册、提交工单。</p>
        <Link href="/member/login" className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
          前往登录
        </Link>
      </div>
      </>
    );
  }

  if (error) return <div className="min-h-[60vh] flex items-center justify-center text-red-500">{error}</div>;

  const m = data!.member;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck size={22} className="text-red-600" /> 客户门户</h1>
          <p className="text-sm text-gray-500 mt-1">{m.company || m.name} · 客户编号 {m.customerNo || '—'}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5">
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      {/* 状态卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 flex items-center gap-1"><ShieldCheck size={13} /> 授权状态</div>
          <div className="text-lg font-bold mt-1">
            {data!.license?.status === 'valid' ? <span className="text-green-600">已授权</span>
              : data!.license?.status === 'expired' ? <span className="text-red-600">已到期</span>
              : <span className="text-amber-600">试用中</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{data!.license?.edition || 'standard'}{data!.license?.expiresAt ? ` · ${String(data!.license.expiresAt).slice(0, 10)}` : ''}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 flex items-center gap-1"><FileText size={13} /> 我的询价</div>
          <div className="text-lg font-bold mt-1">{data!.stats.quoteCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">历史询价单</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 flex items-center gap-1"><LifeBuoy size={13} /> 我的工单</div>
          <div className="text-lg font-bold mt-1">{data!.stats.ticketCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">工单记录</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-gray-500 flex items-center gap-1"><Download size={13} /> 资料下载</div>
          <div className="text-lg font-bold mt-1">{data!.stats.manualCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">手册/资料</div>
        </div>
      </div>

      {/* 页签 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 text-sm mb-4 w-fit">
        <button onClick={() => setTab('overview')} className={`px-3 py-1.5 rounded-md ${tab === 'overview' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>概览 / 手册 / 工单</button>
        <button onClick={() => setTab('ticket')} className={`px-3 py-1.5 rounded-md flex items-center gap-1 ${tab === 'ticket' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
          <MessageSquare size={14} /> 提交工单
        </button>
      </div>

      {msg && (
        <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${msg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</div>
      )}

      {tab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 可下载资料 */}
          <div className="border rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">可下载资料</div>
            {data!.manuals.length === 0 ? (
              <div className="text-gray-300 text-sm py-8 text-center">暂无资料</div>
            ) : (
              <ul className="divide-y">
                {data!.manuals.map((r: any) => (
                  <li key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <span className="truncate mr-2">{r.title || r.name}</span>
                    <a href={`/downloads/${r.fileName}`} className="text-red-600 text-xs shrink-0 flex items-center gap-1 hover:underline">
                      <Download size={12} /> 下载
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 我的工单 */}
          <div className="border rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">我的工单</div>
            {data!.tickets.length === 0 ? (
              <div className="text-gray-300 text-sm py-8 text-center">暂无工单</div>
            ) : (
              <ul className="divide-y max-h-[300px] overflow-y-auto">
                {data!.tickets.map((t: any) => (
                  <li key={t.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate mr-2">{t.subject}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[t.status] || ''}`}>{STATUS_LABEL[t.status] || t.status}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{t.ticketNo} · {CATEGORY_LABEL[t.category] || t.category} · {new Date(t.createdAt).toLocaleString('zh-CN')}</div>
                    {t.reply && (
                      <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs text-gray-600">
                        <span className="font-semibold">官方回复：</span>{t.reply}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-xl border rounded-xl p-5 bg-white">
          <h2 className="font-semibold mb-4">提交工单</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">分类</label>
                <select value={tCategory} onChange={(e) => setTCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="general">综合咨询</option>
                  <option value="license">授权相关</option>
                  <option value="manual">手册资料</option>
                  <option value="quote">报价相关</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">优先级</label>
                <select value={tPriority} onChange={(e) => setTPriority(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="normal">普通</option>
                  <option value="high">紧急</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">主题 *</label>
              <input value={tSubject} onChange={(e) => setTSubject(e.target.value)} maxLength={200} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="简述问题" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">内容 *</label>
              <textarea value={tContent} onChange={(e) => setTContent(e.target.value)} rows={5} maxLength={10000} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="详细描述问题，如有报错请附截图/报错信息" />
            </div>
            <button onClick={submit} disabled={submitting} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              <Send size={14} /> {submitting ? '提交中...' : '提交工单'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
