"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Download, X, Search, Inbox, Loader2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface OrderItem {
  id: string;
  orderNo: string;
  name: string;
  phone: string;
  email: string;
  company: string | null;
  address: string | null;
  amount: number;
  currency: string;
  status: string;
  statusLabel: string;
  payMethod: string;
  poNo?: string | null;
  invoiceTitle?: string | null;
  taxNo?: string | null;
  payStatus?: string;
  payVoucher?: string | null;
  paidAt?: string | null;
  items: any[];
  remark: string | null;
  ipInfo: { ip?: string; country?: string; city?: string } | null;
  shippingCompany?: string | null;
  trackingNo?: string | null;
  shippedAt?: string | null;
  shippingStatus?: string;
  deliveredAt?: string | null;
  history?: any[];
  // 销售跟进
  salesUserId?: string | null;
  salesUser?: { id: string; username: string; displayName: string; email: string | null } | null;
  assignedAt?: string | null;
  respondedAt?: string | null;
  escalationCount?: number;
  createdAt: string;
}

interface SalesCandidate {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  bound: boolean;
  current: boolean;
}

interface Stats {
  pending: number;
  shipPending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  totalAmount: number;
}

// 物流商（用户指定：顺丰 / 跨越 / 京东）
const SHIPPING_LIST = [
  { code: "SF", name: "顺丰速运", url: "https://www.sf-express.com/chn/sc/waybill/waybill-detail" },
  { code: "KY", name: "跨越速运", url: "https://www.ky-express.com/waybill" },
  { code: "JD", name: "京东物流", url: "https://www.jd.com/waybill" },
];
const shippingName = (code?: string | null) => SHIPPING_LIST.find((s) => s.code === code)?.name || code || "";
const shippingUrl = (code?: string | null) => SHIPPING_LIST.find((s) => s.code === code)?.url || "";
const shippingBadge = (st?: string) =>
  st === "delivered" ? { text: "已送达", cls: "bg-green-50 text-green-600 border-green-200" }
  : st === "shipped" ? { text: "已发货", cls: "bg-blue-50 text-blue-600 border-blue-200" }
  : { text: "待发货", cls: "bg-gray-50 text-gray-500 border-gray-200" };

const STATUS_LIST = [
  { value: "", label: "全部" },
  { value: "pending", label: "待确认" },
  { value: "confirmed", label: "已确认" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

const PAY_LABEL: Record<string, string> = {
  offline: "线下转账",
  bank: "对公汇款",
  contact: "联系销售",
  wechat: "微信支付",
  alipay: "支付宝",
};

const PAY_METHOD_BADGE: Record<string, string> = {
  offline: "bg-gray-50 text-gray-600 border-gray-200",
  bank: "bg-gray-50 text-gray-600 border-gray-200",
  contact: "bg-gray-50 text-gray-600 border-gray-200",
  wechat: "bg-green-50 text-green-600 border-green-200",
  alipay: "bg-blue-50 text-blue-600 border-blue-200",
};

const payBadge = (o: OrderItem) =>
  o.payStatus === "confirmed" ? { text: "已到账", cls: "bg-green-50 text-green-600 border-green-200" }
  : o.payStatus === "paid" ? { text: o.payVoucher ? "待确认·有凭证" : "待确认", cls: "bg-amber-50 text-amber-600 border-amber-200" }
  : (o.payMethod === "bank" || o.payMethod === "offline") ? { text: "未支付", cls: "bg-gray-50 text-gray-500 border-gray-200" }
  : { text: "在线支付", cls: "bg-blue-50 text-blue-600 border-blue-200" };

// 米思米式订单进度条：提交 → 确认 → 收款 → 发货 → 完成
function OrderSteps({ o }: { o: OrderItem }) {
  const steps = [
    { label: "订单提交", done: true },
    { label: "订单确认", done: o.status === "confirmed" || o.status === "completed" },
    { label: "确认收款", done: o.payStatus === "confirmed" },
    { label: "确认发货", done: o.shippingStatus === "shipped" || o.shippingStatus === "delivered" },
    { label: "交易完成", done: o.status === "completed" || o.shippingStatus === "delivered" },
  ];
  const activeIdx = steps.filter((s) => s.done).length;
  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const done = i < activeIdx || s.done;
        return (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center min-w-[72px]">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold border-2 transition-colors ${
                  done ? "border-[#CC0000] bg-[#CC0000] text-white" : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <div className={`mt-1 text-[11px] whitespace-nowrap ${done ? "text-[#CC0000] font-medium" : "text-gray-400"}`}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 mb-4 h-0.5 flex-1 rounded transition-colors ${i < activeIdx ? "bg-[#CC0000]" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminShopOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({ pending: 0, shipPending: 0, confirmed: 0, completed: 0, cancelled: 0, totalAmount: 0 });
  const [viewer, setViewer] = useState<{ isAdmin: boolean; isSales: boolean; displayName: string }>({ isAdmin: true, isSales: false, displayName: "" });
  const [candidates, setCandidates] = useState<SalesCandidate[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [followupOnly, setFollowupOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OrderItem | null>(null);
  const [shipForm, setShipForm] = useState({ shippingCompany: "", trackingNo: "" });
  const [shipSaving, setShipSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const loadSeq = useRef(0);

  function openDetail(o: OrderItem) {
    setShipForm({ shippingCompany: o.shippingCompany || "", trackingNo: o.trackingNo || "" });
    setDetail(o);
    loadCandidates(o.id);
  }

  const load = useCallback(async (keyword = q, st = status, p = page, fu = followupOnly) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/shop/orders?keyword=${encodeURIComponent(keyword)}&status=${st}&followup=${fu ? "1" : ""}&page=${p}&limit=20`);
      const d = await r.json();
      if (seq !== loadSeq.current) return; // 丢弃过期响应
      if (d.ok) {
        setOrders(d.items);
        setTotal(d.total);
        setStats(d.stats || { pending: 0, shipPending: 0, confirmed: 0, completed: 0, cancelled: 0, totalAmount: 0 });
        if (d.viewer) setViewer(d.viewer);
      }
    } catch { /* 忽略 */ } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [q, status, page, followupOnly]);

  useEffect(() => {
    load();
  }, [load]);

  // 弹窗：Esc 关闭
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetail(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  async function updateStatus(o: OrderItem, next: string) {
    const r = await fetch(`/api/admin/shop/orders/${o.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const d = await r.json();
    if (d.ok) {
      if (detail && detail.id === o.id) setDetail({ ...detail, status: next });
      load();
    } else {
      alert(d.error || "更新失败");
    }
  }

  // 确认收款（与前台同款：payStatus → confirmed + paidAt）
  async function confirmPay(o: OrderItem) {
    if (!window.confirm(`确认已收到订单 ${o.orderNo} 的货款 ¥${o.amount.toLocaleString()}？`)) return;
    setPaying(true);
    try {
      const r = await fetch(`/api/admin/shop/orders/${o.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payStatus: "confirmed" }),
      });
      const d = await r.json();
      if (d.ok) {
        const upd = { ...o, payStatus: "confirmed", paidAt: new Date().toISOString() };
        if (detail && detail.id === o.id) setDetail(upd);
        load();
        alert("已确认收到货款");
      } else {
        alert(d.error || "操作失败");
      }
    } finally {
      setPaying(false);
    }
  }

  async function saveShipping() {
    if (!detail) return;
    if (!shipForm.shippingCompany || !shipForm.trackingNo) {
      alert("请选择物流公司并填写物流单号");
      return;
    }
    setShipSaving(true);
    try {
      const r = await fetch(`/api/admin/shop/orders/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: detail.status, shippingCompany: shipForm.shippingCompany, trackingNo: shipForm.trackingNo }),
      });
      const d = await r.json();
      if (d.ok) {
        setDetail({ ...detail, shippingCompany: shipForm.shippingCompany || null, trackingNo: shipForm.trackingNo || null, shippingStatus: "shipped", shippedAt: new Date().toISOString() });
        load();
      } else {
        alert(d.error || "保存失败");
      }
    } finally {
      setShipSaving(false);
    }
  }

  async function markDelivered(o: OrderItem) {
    if (!window.confirm(`确认标记订单 ${o.orderNo} 已送达？`)) return;
    const r = await fetch(`/api/admin/shop/orders/${o.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: o.status, shippingMark: "delivered" }),
    });
    const d = await r.json();
    if (d.ok) {
      if (detail && detail.id === o.id) setDetail({ ...detail, shippingStatus: "delivered", deliveredAt: new Date().toISOString() });
      load();
    } else {
      alert(d.error || "操作失败");
    }
  }

  async function markResponded(o: OrderItem) {
    const r = await fetch(`/api/admin/shop/orders/${o.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: o.status, salesMark: "responded" }),
    });
    const d = await r.json();
    if (d.ok) {
      const upd = { ...o, respondedAt: new Date().toISOString() };
      if (detail && detail.id === o.id) setDetail(upd);
      load();
    } else {
      alert(d.error || "操作失败");
    }
  }

  // 跟进状态徽章：未跟进（红）/已跟进（绿）/超时未跟进（黄）
  const followupBadge = (o: OrderItem) => {
    if (o.respondedAt) return { text: "已跟进", cls: "bg-green-50 text-green-600" };
    if ((o.escalationCount || 0) > 0) return { text: `超时·已转${o.escalationCount}次`, cls: "bg-amber-50 text-amber-600" };
    return { text: "待跟进", cls: "bg-red-50 text-red-600" };
  };

  // 加载可分配销售候选（管理员）
  const loadCandidates = async (orderId: string) => {
    if (!viewer.isAdmin) return;
    try {
      const r = await fetch(`/api/admin/shop/orders/candidates?orderId=${orderId}`);
      const d = await r.json();
      if (d.ok) setCandidates(d.items || []);
    } catch { /* 忽略 */ }
  };

  const assignSales = async (o: OrderItem, salesUserId: string) => {
    if (!salesUserId) return;
    setAssigning(true);
    try {
      const r = await fetch(`/api/admin/shop/orders/${o.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assignSales", salesUserId }),
      });
      const d = await r.json();
      if (d.ok) {
        alert("已指派，销售将收到站内通知与邮件");
        load();
        if (detail && detail.id === o.id) {
          const picked = candidates.find((c) => String(c.id) === String(salesUserId));
          const upd: any = {
            ...detail,
            salesUserId,
            respondedAt: null,
            escalationCount: 0,
            assignedAt: new Date().toISOString(),
          };
          if (picked) upd.salesUser = { id: String(picked.id), username: picked.username, displayName: picked.displayName, email: picked.email || null };
          setDetail(upd);
          loadCandidates(o.id);
        }
      } else {
        alert(d.error || "指派失败");
      }
    } catch { alert("指派失败"); } finally {
      setAssigning(false);
    }
  };

  async function exportCsv() {
    const r = await fetch("/api/admin/shop/orders?format=csv");
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "shop-orders.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const statusColor = (s: string) =>
    s === "pending" ? "bg-amber-50 text-amber-600 border-amber-200" : s === "confirmed" ? "bg-blue-50 text-blue-600 border-blue-200" : s === "completed" ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200";

  const statCount = (v: string) =>
    v === "" ? total : v === "pending" ? stats.pending : v === "confirmed" ? stats.confirmed : v === "completed" ? stats.completed : stats.cancelled;

  const statsCards = [
    { label: "全部订单", value: total, cls: "text-gray-900", sub: "总订单数" },
    { label: "待确认", value: stats.pending, cls: "text-amber-600", sub: "需尽快确认" },
    { label: "待发货", value: stats.shipPending, cls: "text-blue-600", sub: "已确认待发货" },
    { label: "累计金额", value: `¥${stats.totalAmount.toLocaleString()}`, cls: "text-[#CC0000]", sub: "当前筛选口径" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const hasFilter = q !== "" || status !== "" || followupOnly;

  return (
    <div className="py-5">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">商城订单管理</h1>
            {viewer.isSales && !viewer.isAdmin ? (
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                {viewer.displayName} · 仅显示分配给我的订单
              </span>
            ) : (
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400">全量视角</span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">采购订单全流程管理 · 收款确认 / 发货登记 / 销售跟进</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFollowupOnly(!followupOnly); setPage(1); }}
            className={`flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-medium transition-colors ${followupOnly ? "border-[#CC0000] bg-[#CC0000] text-white shadow-sm" : "border-gray-300 bg-white text-gray-600 hover:border-[#CC0000] hover:text-[#CC0000]"}`}
            title="只看已分配销售但尚未跟进、且未超时转单的订单"
          >
            {followupOnly && "✓ "}待跟进
            {stats.pending > 0 && followupOnly && <span className="rounded-full bg-white/25 px-1.5 text-[10px] tabular-nums">{stats.pending}</span>}
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-[#CC0000] hover:text-[#CC0000]">
            <Download className="h-3.5 w-3.5" /> 导出 CSV
          </button>
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-800"
            title="刷新列表"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 米思米式统计条 */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsCards.map((s) => (
          <div key={s.label} className="admin-stat-card relative overflow-hidden rounded border border-gray-200 bg-white px-4 py-3">
            <span className="absolute left-0 top-0 h-full w-0.5 bg-[#CC0000]" />
            <div className="text-[11px] text-gray-400">{s.label}<span className="ml-1.5 text-[10px]">{s.sub}</span></div>
            <div className={`mt-1 text-xl font-bold tabular-nums ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 筛选工具条 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded border border-gray-200 bg-white p-0.5 shadow-sm">
          {STATUS_LIST.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatus(s.value); setPage(1); }}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${status === s.value ? "bg-[#CC0000] text-white" : "text-gray-500 hover:text-[#CC0000]"}`}
            >
              {s.label}
              <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${status === s.value ? "bg-white/25" : "bg-gray-100 text-gray-400"}`}>
                {statCount(s.value)}
              </span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-300" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), load(q, status, 1))}
            placeholder="订单号 / 客户 / 邮箱"
            className="w-60 rounded border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs outline-none transition-colors placeholder:text-gray-300 focus:border-[#CC0000]"
          />
        </div>
      </div>

      {/* 订单表格（米思米式紧凑） */}
      <div className="admin-table mt-3 overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="sticky top-0 z-10 bg-gray-50 text-left text-[11px] text-gray-500 shadow-[0_1px_0_0_#e5e7eb]">
              <th className="px-3 py-2.5 font-medium tracking-wide">订单号</th>
              <th className="px-3 py-2.5 font-medium tracking-wide">客户</th>
              <th className="px-3 py-2.5 font-medium tracking-wide">商品</th>
              <th className="px-3 py-2.5 text-right font-medium tracking-wide">金额</th>
              <th className="px-3 py-2.5 font-medium tracking-wide">支付</th>
              <th className="px-3 py-2.5 font-medium tracking-wide">物流</th>
              <th className="px-3 py-2.5 font-medium tracking-wide">负责销售</th>
              <th className="px-3 py-2.5 font-medium tracking-wide">时间</th>
              <th className="px-3 py-2.5 font-medium tracking-wide">状态</th>
              <th className="px-3 py-2.5 font-medium tracking-wide">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-14">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Inbox className="h-8 w-8 text-gray-200" />
                    <div className="text-sm">{hasFilter ? "没有符合条件的订单" : "暂无订单"}</div>
                    {hasFilter && (
                      <button
                        onClick={() => { setQ(""); setStatus(""); setFollowupOnly(false); setPage(1); }}
                        className="mt-1 rounded border border-gray-300 px-3 py-1 text-xs text-gray-500 hover:border-[#CC0000] hover:text-[#CC0000]"
                      >
                        清空筛选
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {orders.map((o) => {
              const pb = payBadge(o);
              const sb = shippingBadge(o.shippingStatus);
              const fb = followupBadge(o);
              return (
                <tr key={o.id} className="cursor-pointer transition-colors hover:bg-red-50/40" onClick={() => openDetail(o)}>
                  <td className="px-3 py-2.5">
                    <div className="font-mono text-xs font-semibold text-[#CC0000]">{o.orderNo}</div>
                    {o.poNo && <div className="text-[10px] text-gray-400">PO:{o.poNo}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-[13px] text-gray-800">{o.name}</div>
                    <div className="max-w-[150px] truncate text-[11px] text-gray-400">{o.company || o.email}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="max-w-[190px] truncate text-xs text-gray-600">
                      {(o.items || []).map((i: any) => `${i.name}×${i.qty}`).join("；")}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="text-[13px] font-semibold tabular-nums text-[#CC0000]">¥{o.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className={`inline-block rounded border px-1.5 py-0.5 text-[10px] whitespace-nowrap ${PAY_METHOD_BADGE[o.payMethod] || "border-gray-200 bg-gray-50 text-gray-500"}`}>
                      {PAY_LABEL[o.payMethod] || o.payMethod}
                    </div>
                    <div className={`mt-0.5 inline-block rounded border px-1.5 py-0.5 text-[10px] whitespace-nowrap ${pb.cls}`}>{pb.text}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className={`inline-block rounded border px-1.5 py-0.5 text-[10px] whitespace-nowrap ${sb.cls}`}>{sb.text}</div>
                    {o.trackingNo && <div className="mt-0.5 font-mono text-[10px] text-gray-400">{o.trackingNo}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    {o.salesUser ? (
                      <div>
                        <div className="text-xs font-medium text-gray-700">{o.salesUser.displayName || o.salesUser.username}</div>
                        <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] whitespace-nowrap ${fb.cls}`}>{fb.text}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">未分配</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-gray-500">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] whitespace-nowrap ${statusColor(o.status)}`}>{o.statusLabel}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5 whitespace-nowrap">
                      {o.status === "pending" && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(o, "confirmed"); }} className="text-xs font-medium text-[#CC0000] hover:underline">确认</button>
                      )}
                      {o.status === "confirmed" && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(o, "completed"); }} className="text-xs font-medium text-green-600 hover:underline">完成</button>
                      )}
                      {o.status !== "cancelled" && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(o, "cancelled"); }} className="text-xs text-red-400 hover:underline">取消</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* 底部信息栏 */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-4 py-2 text-xs text-gray-500">
          <span>共 <b className="tabular-nums text-gray-700">{total}</b> 条订单</span>
          {total > 20 && (
            <div className="flex items-center gap-3">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex items-center gap-0.5 rounded border border-gray-200 bg-white px-2.5 py-1 transition-colors hover:text-[#CC0000] disabled:opacity-40">
                <ChevronLeft className="h-3 w-3" /> 上一页
              </button>
              <span className="tabular-nums">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="flex items-center gap-0.5 rounded border border-gray-200 bg-white px-2.5 py-1 transition-colors hover:text-[#CC0000] disabled:opacity-40">
                下一页 <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 订单详情（米思米式双栏） */}
      {detail && (
        <div className="admin-modal-mask fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="admin-modal-panel mt-8 w-full max-w-3xl rounded-lg bg-white shadow-2xl">
            {/* 头部 */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <h2 className="font-mono text-base font-bold text-[#CC0000]">{detail.orderNo}</h2>
                <span className={`rounded border px-2 py-0.5 text-[11px] whitespace-nowrap ${statusColor(detail.status)}`}>{detail.statusLabel}</span>
              </div>
              <button onClick={() => setDetail(null)} className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" title="关闭 (Esc)"><X className="h-5 w-5" /></button>
            </div>

            <div className="px-5 py-4">
              {/* 订单进度条 */}
              <OrderSteps o={detail} />
            </div>

            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              {/* 左：客户 */}
              <div className="rounded border border-gray-200 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-gray-400">
                  <span className="h-1 w-1 rounded-full bg-[#CC0000]" />客户信息
                </div>
                <div className="mt-2 text-sm text-gray-800">{detail.name} · {detail.phone}</div>
                <div className="text-xs text-gray-500">{detail.email}</div>
                {detail.company && <div className="mt-1 text-xs text-gray-500">公司：{detail.company}</div>}
                {detail.address && <div className="mt-1 text-xs text-gray-500">地址：{detail.address}</div>}
                <div className="mt-2 border-t border-dashed border-gray-100 pt-2 text-[11px] text-gray-400">
                  IP：{detail.ipInfo?.ip || "-"} · {detail.ipInfo?.country || ""} {detail.ipInfo?.city || ""}
                </div>
              </div>

              {/* 右：支付（含确认收款） */}
              <div className="rounded border border-gray-200 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-gray-400">
                    <span className="h-1 w-1 rounded-full bg-[#CC0000]" />支付信息
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] ${payBadge(detail).cls}`}>{payBadge(detail).text}</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  方式：{PAY_LABEL[detail.payMethod] || detail.payMethod}
                  {detail.paidAt && <div className="mt-0.5 text-green-600">到账时间：{new Date(detail.paidAt).toLocaleString()}</div>}
                  {detail.payVoucher && <div className="mt-0.5 text-gray-400">已上传转账凭证</div>}
                </div>
                {(detail.payMethod === "bank" || detail.payMethod === "offline") && detail.payStatus !== "confirmed" && (
                  <button
                    onClick={() => confirmPay(detail)}
                    disabled={paying}
                    className="mt-2.5 rounded bg-[#CC0000] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#aa0000] disabled:opacity-50"
                  >
                    {paying ? "处理中..." : "确认收到货款"}
                  </button>
                )}
                {detail.payStatus === "confirmed" && (
                  <div className="mt-2.5 text-xs font-medium text-green-600">✓ 货款已确认到账</div>
                )}
              </div>

              {/* 左：销售跟进 */}
              <div className="rounded border border-gray-200 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-gray-400">
                    <span className="h-1 w-1 rounded-full bg-[#CC0000]" />销售跟进
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${followupBadge(detail).cls}`}>{followupBadge(detail).text}</span>
                </div>
                {detail.salesUser ? (
                  <div className="mt-2 text-xs text-gray-600">
                    当前负责：<b className="text-gray-800">{detail.salesUser.displayName || detail.salesUser.username}</b>
                    {detail.salesUser.email ? `（${detail.salesUser.email}）` : ""}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-amber-600">未分配销售，可手动指派或等待销售绑定产品后自动分配</div>
                )}
                <div className="mt-1.5 grid gap-0.5 text-[11px] text-gray-400">
                  <div>分配时间：{detail.assignedAt ? new Date(detail.assignedAt).toLocaleString() : "未分配"}</div>
                  <div>已轮转：{detail.escalationCount || 0} 次（超过 2 小时未跟进自动转下一位销售）</div>
                  {detail.respondedAt && <div>跟进时间：{new Date(detail.respondedAt).toLocaleString()}</div>}
                </div>
                {!detail.respondedAt && detail.salesUser && (
                  <button
                    onClick={() => markResponded(detail)}
                    className="mt-2 rounded border border-[#CC0000]/30 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-[#CC0000] transition-colors hover:bg-red-100"
                  >
                    标记已跟进（停止轮转）
                  </button>
                )}
                {viewer.isAdmin && (
                  <div className="mt-2.5 rounded border border-dashed border-gray-200 bg-gray-50/70 p-2.5">
                    <div className="text-[10px] font-medium text-gray-400">手动指派销售（管理员）</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <select
                        className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none transition-colors focus:border-[#CC0000]"
                        value=""
                        onChange={(e) => { const v = e.target.value; if (v) { assignSales(detail, v); e.target.value = ""; } }}
                      >
                        <option value="" disabled>选择销售...</option>
                        {candidates.filter((c) => !c.current).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.displayName || c.username}{c.bound ? "（已绑定本单产品）" : "（未绑定，谨慎指派）"}
                          </option>
                        ))}
                        {candidates.length === 0 && <option value="" disabled>无可用销售</option>}
                      </select>
                      {assigning && <span className="text-[10px] text-gray-400">指派中...</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* 右：发货（含物流表单） */}
              <div className="rounded border border-gray-200 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-gray-400">
                    <span className="h-1 w-1 rounded-full bg-[#CC0000]" />发货信息
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] ${shippingBadge(detail.shippingStatus).cls}`}>{shippingBadge(detail.shippingStatus).text}</span>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1.5">
                    <select
                      value={shipForm.shippingCompany}
                      onChange={(e) => setShipForm({ ...shipForm, shippingCompany: e.target.value })}
                      className="flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs outline-none transition-colors focus:border-[#CC0000]"
                    >
                      <option value="">物流公司</option>
                      {SHIPPING_LIST.map((s) => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      value={shipForm.trackingNo}
                      onChange={(e) => setShipForm({ ...shipForm, trackingNo: e.target.value })}
                      placeholder="物流单号"
                      className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs outline-none transition-colors placeholder:text-gray-300 focus:border-[#CC0000]"
                    />
                    <button
                      onClick={saveShipping}
                      disabled={shipSaving}
                      className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                    >
                      {shipSaving ? "保存中..." : "确认发货"}
                    </button>
                  </div>
                  {detail.shippingStatus === "shipped" && (
                    <button
                      onClick={() => markDelivered(detail)}
                      className="w-full rounded border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-medium text-green-600 transition-colors hover:bg-green-100"
                    >
                      标记已送达
                    </button>
                  )}
                  {(detail.shippingCompany || detail.trackingNo) ? (
                    <div className="text-[11px] text-gray-500">
                      当前：{shippingName(detail.shippingCompany)} {detail.trackingNo ? `· 单号 ${detail.trackingNo}` : ""}
                      {detail.trackingNo && shippingUrl(detail.shippingCompany) && (
                        <a href={shippingUrl(detail.shippingCompany)} target="_blank" rel="noopener noreferrer" className="ml-1 text-[#CC0000] hover:underline">查询物流 ↗</a>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400">选择物流公司（顺丰/跨越/京东）+ 运单号后，客户可在前台查看物流信息</div>
                  )}
                  {detail.shippedAt && <div className="text-[11px] text-gray-400">发货时间：{new Date(detail.shippedAt).toLocaleString()}</div>}
                  {detail.deliveredAt && <div className="text-[11px] font-medium text-green-600">送达：{new Date(detail.deliveredAt).toLocaleString()}</div>}
                </div>
              </div>
            </div>

            {/* 商品明细 */}
            <div className="px-5 pb-5">
              <div className="rounded border border-gray-200">
                <div className="border-b border-gray-100 bg-gray-50 px-3.5 py-2 text-[11px] font-semibold tracking-wide text-gray-500">商品明细</div>
                {(detail.items || []).map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border-b border-gray-50 px-3.5 py-2.5 text-[13px] last:border-0">
                    <div className="flex items-center gap-2.5">
                      {it.cover && <img src={it.cover} alt="" className="h-8 w-8 rounded border border-gray-100 object-cover" />}
                      <div>
                        <div className="text-gray-800">{it.name}</div>
                        <div className="text-[11px] text-gray-400">¥{it.price?.toLocaleString() || "面议"} × {it.qty}</div>
                      </div>
                    </div>
                    <span className="font-medium tabular-nums text-gray-700">{it.price ? `¥${(it.price * it.qty).toLocaleString()}` : "面议"}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3.5 py-3">
                  <span className="text-xs text-gray-400">合计</span>
                  <span className="text-lg font-bold tabular-nums text-[#CC0000]">¥{detail.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* 操作记录 */}
              {detail.history?.length ? (
                <div className="mt-3 rounded border border-gray-200 p-3.5">
                  <div className="text-[11px] font-semibold tracking-wide text-gray-400">操作记录</div>
                  <div className="mt-2 space-y-1.5">
                    {[{ status: "pending", at: detail.createdAt, note: "客户提交订单" }, ...detail.history].map((h: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className={`h-1.5 w-1.5 rounded-full ${statusColor(h.status)}`} />
                        <span className="text-gray-700">{STATUS_LIST.find((s) => s.value === h.status)?.label || h.status}</span>
                        <span className="tabular-nums text-gray-400">{new Date(h.at).toLocaleString()}</span>
                        {h.note && <span className="text-gray-500">· {h.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {detail.remark && <div className="mt-3 text-xs text-gray-500">备注：{detail.remark}</div>}
            </div>

            {/* 底部操作 */}
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
              {detail.status === "pending" && (
                <button onClick={() => updateStatus(detail, "confirmed")} className="rounded bg-[#CC0000] px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#aa0000]">确认订单</button>
              )}
              {detail.status === "confirmed" && (
                <button onClick={() => updateStatus(detail, "completed")} className="rounded border border-green-500 px-5 py-2 text-sm font-medium text-green-600 transition-colors hover:bg-green-50">标记完成</button>
              )}
              {detail.status !== "cancelled" && (
                <button onClick={() => updateStatus(detail, "cancelled")} className="rounded border border-gray-300 bg-white px-5 py-2 text-sm text-gray-600 transition-colors hover:border-red-300 hover:text-red-500">取消订单</button>
              )}
              <button onClick={() => setDetail(null)} className="rounded border border-gray-300 bg-white px-5 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 加载遮罩（首次加载骨架） */}
      {loading && orders.length === 0 && (
        <div className="mt-3 flex items-center justify-center rounded border border-gray-200 bg-white py-14 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-[#CC0000]" />
          <span className="ml-2 text-sm">正在加载订单...</span>
        </div>
      )}
    </div>
  );
}
