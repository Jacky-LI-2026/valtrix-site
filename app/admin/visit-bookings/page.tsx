"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Trash2, Phone } from "lucide-react";

interface Booking {
  id: string;
  bookingNo: string;
  company?: string;
  name: string;
  phone: string;
  email?: string;
  preferredDate?: string;
  visitTime?: string;
  visitors: number;
  message?: string;
  status: string;
  notes?: string;
  sourcePage?: string;
  createdAt?: string;
  ip?: string;
  country?: string;
  city?: string;
}

export default function VisitBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/visit-bookings?status=${tab}`);
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        setItems(data.items);
        setStats(data.stats || { total: 0, pending: 0 });
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const setStatus = async (id: string, status: string) => {
    await fetch("/api/admin/visit-bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(id), status }),
    });
    load();
  };

  const doDelete = async (id: string) => {
    if (!window.confirm("确认删除该预约？")) return;
    await fetch(`/api/admin/visit-bookings?id=${id}`, { method: "DELETE" });
    load();
  };

  const statusBadge: Record<string, { label: string; cls: string }> = {
    pending: { label: "待确认", cls: "bg-amber-100 text-amber-700" },
    confirmed: { label: "已确认", cls: "bg-green-100 text-green-700" },
    declined: { label: "已婉拒", cls: "bg-gray-100 text-gray-500" },
    completed: { label: "已完成", cls: "bg-blue-100 text-blue-700" },
  };

  const tabCls = (key: string) =>
    `px-4 py-2 text-sm rounded-md transition-colors ${tab === key ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-100"}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">考察预约</h1>
        <p className="text-gray-500 mt-1">管理客户考察预约申请，确认后通知客户到访</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm">
          <div className="text-sm text-gray-500">预约总数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm">
          <div className="text-sm text-gray-500">待确认</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className={tabCls("all")} onClick={() => setTab("all")}>全部</button>
        <button className={tabCls("pending")} onClick={() => setTab("pending")}>待确认</button>
        <button className={tabCls("confirmed")} onClick={() => setTab("confirmed")}>已确认</button>
        <button className={tabCls("completed")} onClick={() => setTab("completed")}>已完成</button>
        <button className={tabCls("declined")} onClick={() => setTab("declined")}>已婉拒</button>
      </div>

      {loading && <div className="text-gray-500">加载中...</div>}
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-100 p-10 text-center text-gray-400 text-sm">暂无预约</div>
      )}

      <div className="space-y-4">
        {items.map((b) => (
          <div key={b.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CalendarDays size={18} className="text-red-600" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{b.bookingNo}</div>
                  <div className="text-xs text-gray-400">
                    {b.createdAt ? new Date(b.createdAt).toLocaleString("zh-CN") : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${(statusBadge[b.status] || statusBadge.pending).cls}`}>
                  {(statusBadge[b.status] || statusBadge.pending).label}
                </span>
                <select
                  value={b.status}
                  onChange={(e) => setStatus(b.id, e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="pending">待确认</option>
                  <option value="confirmed">已确认</option>
                  <option value="completed">已完成</option>
                  <option value="declined">已婉拒</option>
                </select>
                <button onClick={() => doDelete(b.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="删除">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
              <div><span className="text-gray-400 text-xs block">姓名</span><span className="text-gray-800">{b.name}</span></div>
              <div><span className="text-gray-400 text-xs block">公司</span><span className="text-gray-800">{b.company || "-"}</span></div>
              <div>
                <span className="text-gray-400 text-xs block">电话</span>
                <span className="text-gray-800 flex items-center gap-1">
                  <Phone size={12} /> {b.phone}
                </span>
              </div>
              <div><span className="text-gray-400 text-xs block">邮箱</span><span className="text-gray-800">{b.email || "-"}</span></div>
              <div><span className="text-gray-400 text-xs block">位置</span><span className="text-gray-800">{[b.country, b.city].filter(Boolean).join(" ") || <span className="text-gray-400">-</span>}{b.ip ? <span className="ml-1 font-mono text-xs text-gray-400">{b.ip}</span> : null}</span></div>
              <div>
                <span className="text-gray-400 text-xs block">预约日期</span>
                <span className="text-gray-800">{b.preferredDate ? new Date(b.preferredDate).toLocaleDateString("zh-CN") : "-"}</span>
              </div>
              <div><span className="text-gray-400 text-xs block">时段</span><span className="text-gray-800">{b.visitTime || "-"}</span></div>
              <div><span className="text-gray-400 text-xs block">人数</span><span className="text-gray-800">{b.visitors} 人</span></div>
              <div><span className="text-gray-400 text-xs block">来源</span><span className="text-gray-800 truncate">{b.sourcePage || "-"}</span></div>
            </div>
            {b.message && (
              <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3">{b.message}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
