"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Mail, Inbox, FileDown, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Lead {
  id?: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  resourceName?: string;
  downloadUrl?: string;
  status: string; // pending / approved / rejected
  remark?: string;
  source: "db" | "jsonl";
  createdAt: string;
  ip?: string;
  country?: string;
  city?: string;
}

interface Stats {
  total: number;
  today: number;
  pendingCount?: number;
  manualCount?: number;
}

const STATUS_TEXT: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function DownloadLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, pendingCount: 0, manualCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/download-leads", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "加载失败");
      setLeads(data.leads || []);
      setStats(data.stats || { total: 0, today: 0, pendingCount: 0 });
    } catch (e: any) {
      setError(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** 后台确认/拒绝下载申请 */
  async function review(id: string, action: "approve" | "reject") {
    if (!window.confirm(action === "approve" ? "确认通过该下载申请？通过后访客可下载，且系统将发送下载链接至申请人邮箱（若已配置 SMTP 邮件）。" : "确认拒绝该下载申请？")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/download-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "操作失败");
      await load();
    } catch (e: any) {
      setError(e.message || "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    window.location.href = "/api/admin/download-leads?format=csv";
  }

  function fmt(t: string) {
    try {
      return new Date(t).toLocaleString("zh-CN", { hour12: false });
    } catch {
      return t;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">下载留资</h1>
          <p className="text-gray-500 mt-1">
            访客下载资料时通过邮箱验证码留资。审核模式的资料（如行业解决方案）需后台确认通过后才开放下载
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={15} />
            刷新
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            <FileDown size={15} />
            导出 CSV
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="text-sm text-gray-500 flex items-center gap-1.5">
            <Download size={14} className="text-red-500" />
            累计留资
          </div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="text-sm text-gray-500 flex items-center gap-1.5">
            <Mail size={14} className="text-red-500" />
            今日新增
          </div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.today}</div>
        </div>
        <div className="bg-white rounded-lg border border-yellow-200 bg-yellow-50/50 shadow-sm p-5">
          <div className="text-sm text-yellow-700 flex items-center gap-1.5">
            <Clock size={14} />
            待审核下载
          </div>
          <div className="text-3xl font-bold text-yellow-700 mt-2">{stats.pendingCount ?? 0}</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
      )}

      {/* 留资列表 */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">加载中...</div>
        ) : leads.length === 0 ? (
          <div className="p-16 text-center">
            <Inbox size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">暂无下载留资记录</p>
            <p className="text-gray-400 text-xs mt-1">访客在前台下载资料并完成邮箱验证后，会显示在这里</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">时间</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">邮箱</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">姓名</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">公司</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">电话</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">位置</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">下载资料</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">状态</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l, i) => (
                  <tr key={l.id || `jsonl-${i}`} className={`border-b border-gray-50 hover:bg-gray-50/50 ${l.status === "pending" ? "bg-yellow-50/40" : ""}`}>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-800">{l.email}</td>
                    <td className="px-4 py-3 text-gray-800">{l.name || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{l.company || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l.phone || "-"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l.country || l.city || l.ip ? <>{[l.country, l.city].filter(Boolean).join(" ")}{l.ip ? <span className="ml-1 text-gray-400 text-xs font-mono">{l.ip}</span> : null}</> : <span className="text-gray-400">历史数据</span>}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={l.resourceName || ""}>
                      {l.resourceName || l.downloadUrl || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${STATUS_CLASS[l.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {STATUS_TEXT[l.status] || l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {l.source === "db" && l.status === "pending" ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => review(l.id!, "approve")}
                            disabled={busyId === l.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={13} />
                            通过
                          </button>
                          <button
                            onClick={() => review(l.id!, "reject")}
                            disabled={busyId === l.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <XCircle size={13} />
                            拒绝
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">{l.source === "jsonl" ? "即时下载" : "-"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
