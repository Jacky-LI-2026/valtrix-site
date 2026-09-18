"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone, Mail, Building2, Trash2, Eye, X, Download, Check, Ban, Sparkles } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  new: { label: "新询价", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  processing: { label: "处理中", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  deal: { label: "已成交", cls: "bg-green-50 text-green-600 border-green-200" },
  closed: { label: "已关闭", cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

const REVIEW_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: "待审核", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  approved: { label: "已通过", cls: "bg-green-50 text-green-600 border-green-200" },
  rejected: { label: "已驳回", cls: "bg-red-50 text-red-600 border-red-200" },
};

const TABS = [
  { key: "all", label: "全部" },
  { key: "new", label: "新询价" },
  { key: "processing", label: "处理中" },
  { key: "deal", label: "已成交" },
  { key: "closed", label: "已关闭" },
];

interface QuoteItem {
  id: string;
  quoteNo: string;
  company: string;
  companyVerified?: { exists: boolean | null; confidence?: string; reason?: string; verified?: boolean; checkedAt?: string } | null;
  name: string;
  phone: string;
  email: string;
  message: string;
  items: any[];
  options: any[];
  totalMin: string | null;
  totalMax: string | null;
  status: string;
  reviewStatus: string;
  reviewedBy: string;
  reviewedAt: string;
  notes: string;
  sourcePage: string;
  createdAt: string;
  ip?: string;
  country?: string;
  city?: string;
}

export default function AdminQuotesPage() {
  const [list, setList] = useState<QuoteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<QuoteItem | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // 人工编辑报价（明细 + 总价区间）
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editTotalMin, setEditTotalMin] = useState("");
  const [editTotalMax, setEditTotalMax] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status: activeTab });
      if (keyword.trim()) qs.set("keyword", keyword.trim());
      const res = await fetch(`/api/admin/quotes?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setList(data.list || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const aiQuote = async (q: QuoteItem) => {
    if (aiBusy) return;
    if (!window.confirm(`为报价单 ${q.quoteNo} 生成 AI 报价草稿？将基于询价内容估算建议单价与商务条款。`)) return;
    setAiBusy(true); setAiMsg("");
    try {
      const r = await fetch(`/api/admin/quotes/${q.id}/ai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json();
      if (d.error) { setAiMsg("AI 报价失败：" + d.error); return; }
      setAiResult(d.aiQuote);
      setAiMsg("AI 报价草稿已生成，请在弹窗中核对后人工审核发送");
      load();
    } catch (e: any) {
      setAiMsg("AI 报价异常：" + (e.message || ""));
    } finally { setAiBusy(false); }
  };

  const openDetail = (q: QuoteItem) => {
    setDetail(q);
    setNotes(q.notes || "");
    setEditItems(Array.isArray(q.items) ? q.items.map((it) => ({ ...it })) : []);
    setEditTotalMin(q.totalMin ? String(Number(q.totalMin)) : "");
    setEditTotalMax(q.totalMax ? String(Number(q.totalMax)) : "");
  };

  const closeDetail = () => {
    setDetail(null);
  };

  const saveDetail = async (payload?: any) => {
    if (!detail) return;
    setSaving(true);
    try {
      const body: any = payload || {
        status: detail.status,
        notes,
        items: editItems.map((it) => ({
          id: it.id,
          model: it.model,
          name: it.name,
          qty: it.qty,
          unit: it.unit,
          priceMin: it.priceMin,
          priceMax: it.priceMax,
        })),
        totalMin: editTotalMin === "" ? null : Number(editTotalMin),
        totalMax: editTotalMax === "" ? null : Number(editTotalMax),
      };
      const res = await fetch(`/api/admin/quotes/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = data.data;
        if (payload?.reviewStatus) {
          alert(
            payload.reviewStatus === "approved"
              ? "已通过审核，报价单 PDF 已发送至客户邮箱（若已配置 SMTP）"
              : "已驳回该报价单"
          );
        }
        setDetail(updated);
        openDetail(updated);
        load();
      } else {
        alert(data.error || "保存失败");
      }
    } catch (e) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const review = (status: string) => {
    if (!detail) return;
    if (status === "approved" && !confirm(`确认通过报价单 ${detail.quoteNo}？系统将发送报价单 PDF 至客户邮箱。`)) return;
    if (status === "rejected" && !confirm(`确认驳回报价单 ${detail.quoteNo}？`)) return;
    saveDetail({ reviewStatus: status });
  };

  const downloadPdf = async () => {
    if (!detail) return;
    try {
      const res = await fetch("/api/quote/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteNo: detail.quoteNo }),
      });
      if (!res.ok) {
        alert("生成 PDF 失败");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${detail.quoteNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("下载失败");
    }
  };

  const removeQuote = async (q: QuoteItem) => {
    if (!confirm(`确认删除报价单 ${q.quoteNo}？`)) return;
    const res = await fetch(`/api/admin/quotes/${q.id}`, { method: "DELETE" });
    if (res.ok) {
      setDetail(null);
      load();
    } else {
      alert("删除失败");
    }
  };

  const setItemField = (i: number, field: string, v: any) => {
    setEditItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [field]: v } : it)));
  };

  const fmtTotal = (q: QuoteItem) => {
    const min = q.totalMin ? Number(q.totalMin) : null;
    const max = q.totalMax ? Number(q.totalMax) : null;
    if (min !== null && max !== null && min > 0 && max > 0) {
      return `¥${min.toLocaleString()} - ¥${max.toLocaleString()}`;
    }
    return <span className="text-gray-400">面议</span>;
  };

  const checkedOptions = (q: QuoteItem) =>
    Array.isArray(q.options) ? q.options.filter((o: any) => o?.checked) : [];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">报价询价单</h1>
          <p className="text-sm text-gray-500 mt-1">前台「加入询价车」提交的报价请求自动算价，审核通过后可发送报价单 PDF 至客户邮箱</p>
        </div>
        <a
          href="/admin/quotes/template"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          报价单模板设置
        </a>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {TABS.filter((t) => t.key !== "all").map((t) => {
          const n = list.filter((q) => q.status === t.key).length;
          return (
            <div key={t.key} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">{t.label}</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">{n}</div>
            </div>
          );
        })}
      </div>

      {/* 筛选 + 搜索 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 text-sm ${activeTab === t.key ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="搜索单号/公司/联系人/电话"
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg w-64 outline-none focus:ring-2 focus:ring-red-500"
          />
          <button onClick={load} className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700">
            搜索
          </button>
        </div>

        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-4 py-2.5 font-medium">报价单号</th>
              <th className="px-4 py-2.5 font-medium">公司 / 联系人</th>
              <th className="px-4 py-2.5 font-medium">产品数</th>
              <th className="px-4 py-2.5 font-medium">预估总价</th>
              <th className="px-4 py-2.5 font-medium">审核</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
              <th className="px-4 py-2.5 font-medium">位置</th>
              <th className="px-4 py-2.5 font-medium">提交时间</th>
              <th className="px-4 py-2.5 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">暂无报价单</td></tr>
            ) : (
              list.map((q) => (
                <tr key={q.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-red-600">{q.quoteNo}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{q.company || "-"}</div>
                    <div className="text-xs text-gray-500">{q.name} {q.phone}</div>
                    {q.companyVerified?.exists === true && (
                      <div className="text-[11px] text-green-600 mt-0.5" title={q.companyVerified?.reason || ""}>✓ 公司已核实</div>
                    )}
                    {q.companyVerified?.exists === false && (
                      <div className="text-[11px] text-red-600 mt-0.5" title={q.companyVerified?.reason || ""}>✕ 公司存疑</div>
                    )}
                    {q.companyVerified?.exists === null && q.companyVerified && (
                      <div className="text-[11px] text-amber-600 mt-0.5" title={q.companyVerified?.reason || ""}>? 无法确认</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{Array.isArray(q.items) ? q.items.length : 0}</td>
                  <td className="px-4 py-3 font-medium">{fmtTotal(q)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${REVIEW_MAP[q.reviewStatus]?.cls || REVIEW_MAP.pending.cls}`}>
                      {REVIEW_MAP[q.reviewStatus]?.label || "待审核"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_MAP[q.status]?.cls || STATUS_MAP.new.cls}`}>
                      {STATUS_MAP[q.status]?.label || "新询价"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{q.country || q.city || q.ip ? <>{[q.country, q.city].filter(Boolean).join(" ")}{q.ip ? <span className="ml-1 font-mono">{q.ip}</span> : null}</> : <span className="text-gray-400">历史数据</span>}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{new Date(q.createdAt).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openDetail(q)} className="p-1.5 text-gray-500 hover:text-red-600" title="查看详情">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => aiQuote(q)} className="p-1.5 text-purple-500 hover:text-purple-700" title="AI 生成报价草稿">
                      <Sparkles size={16} />
                    </button>
                    <button onClick={() => removeQuote(q)} className="p-1.5 text-gray-400 hover:text-red-600" title="删除">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">共 {total} 条</div>
      </div>

      {/* 详情 Modal */}
      {aiResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAiResult(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Sparkles size={16} className="text-purple-600" /> AI 报价草稿</div>
              <button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">产品</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">型号</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500">数量</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500">建议单价</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500">金额</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">交期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(aiResult.items || []).map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-700">{it.name || "-"}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{it.model || "-"}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{it.qty ?? "-"}</td>
                      <td className="px-3 py-2 text-right text-gray-900 font-medium">{it.unitPrice ?? "-"}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{it.amount ?? "-"}</td>
                      <td className="px-3 py-2 text-gray-500">{it.delivery || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded p-3"><div className="text-xs text-gray-500">合计总价</div><div className="text-lg font-semibold text-red-600">{aiResult.total ?? "-"} {aiResult.currency || ""}</div></div>
                <div className="bg-gray-50 rounded p-3"><div className="text-xs text-gray-500">报价有效期</div><div className="text-gray-800">{aiResult.validity || "-"}</div></div>
                <div className="bg-gray-50 rounded p-3 col-span-2"><div className="text-xs text-gray-500">付款条款</div><div className="text-gray-800 whitespace-pre-wrap">{aiResult.payment || "-"}</div></div>
                <div className="bg-gray-50 rounded p-3 col-span-2"><div className="text-xs text-gray-500">商务备注</div><div className="text-gray-800 whitespace-pre-wrap">{aiResult.notes || "-"}</div></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setAiResult(null)} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">关闭</button>
                <button onClick={() => { if (detail) openDetail(detail); setAiResult(null); }} className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">在详情中核对并审核</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="font-mono text-sm text-red-600">{detail.quoteNo}</div>
                <div className="text-lg font-semibold text-gray-900">{detail.company || detail.name}</div>
              </div>
              <button onClick={closeDetail} className="p-2 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* 客户信息 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Building2 size={16} className="text-gray-400" />
                  <span className="text-gray-500">公司：</span>{detail.company || "-"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone size={16} className="text-gray-400" />
                  <span className="text-gray-500">电话：</span>{detail.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-gray-500">联系人：</span>{detail.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail size={16} className="text-gray-400" />
                  <span className="text-gray-500">邮箱：</span>{detail.email || "-"}
                  {(detail.country || detail.city || detail.ip) && (
                    <span className="text-gray-500">位置：</span>
                  )}
                  {(detail.country || detail.city) && <span>{[detail.country, detail.city].filter(Boolean).join(" ")}</span>}
                  {detail.ip && <span className="ml-1 font-mono text-xs text-gray-400">{detail.ip}</span>}
                </div>
              </div>

              {/* 审核状态 */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 flex flex-wrap items-center gap-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${REVIEW_MAP[detail.reviewStatus]?.cls || REVIEW_MAP.pending.cls}`}>
                  {REVIEW_MAP[detail.reviewStatus]?.label || "待审核"}
                </span>
                {detail.reviewedBy && (
                  <span className="text-xs text-gray-500">
                    审核人：{detail.reviewedBy}
                    {detail.reviewedAt ? ` · ${new Date(detail.reviewedAt).toLocaleString("zh-CN")}` : ""}
                  </span>
                )}
                <div className="flex-1" />
                {detail.reviewStatus !== "approved" && (
                  <button
                    onClick={() => review("approved")}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check size={14} /> 通过（发送 PDF 至邮箱）
                  </button>
                )}
                {detail.reviewStatus !== "rejected" && (
                  <button
                    onClick={() => review("rejected")}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Ban size={14} /> 驳回
                  </button>
                )}
                <button
                  onClick={downloadPdf}
                  className="inline-flex items-center gap-1 rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
                >
                  <Download size={14} /> 下载 PDF
                </button>
              </div>

              {/* 附加需求 */}
              {checkedOptions(detail).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {checkedOptions(detail).map((o: any, i: number) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs text-red-600 border border-red-100">
                      {o?.label || o?.key}
                    </span>
                  ))}
                </div>
              )}

              {/* 产品明细（可人工修改报价） */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-900">产品明细（可人工修改报价）</div>
                  <span className="text-xs text-gray-400">修改后点击保存生效，PDF 按修改后内容生成</span>
                </div>
                <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-left">
                      <th className="px-3 py-2 font-medium">产品</th>
                      <th className="px-3 py-2 font-medium w-20">数量</th>
                      <th className="px-3 py-2 font-medium w-28">参考价下限(¥)</th>
                      <th className="px-3 py-2 font-medium w-28">参考价上限(¥)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((it: any, i: number) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{it.name}</div>
                          <div className="text-xs text-gray-400">{it.model}</div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={it.qty}
                            onChange={(e) => setItemField(i, "qty", Number(e.target.value))}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-red-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={it.priceMin ?? ""}
                            onChange={(e) => setItemField(i, "priceMin", e.target.value === "" ? null : Number(e.target.value))}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-red-400"
                            placeholder="面议"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={it.priceMax ?? ""}
                            onChange={(e) => setItemField(i, "priceMax", e.target.value === "" ? null : Number(e.target.value))}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-red-400"
                            placeholder="面议"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex flex-wrap items-end gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">预估总价下限(¥)</div>
                    <input
                      type="number"
                      value={editTotalMin}
                      onChange={(e) => setEditTotalMin(e.target.value)}
                      className="w-40 rounded border border-gray-200 px-2 py-1 outline-none focus:border-red-400"
                      placeholder="面议"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">预估总价上限(¥)</div>
                    <input
                      type="number"
                      value={editTotalMax}
                      onChange={(e) => setEditTotalMax(e.target.value)}
                      className="w-40 rounded border border-gray-200 px-2 py-1 outline-none focus:border-red-400"
                      placeholder="面议"
                    />
                  </div>
                </div>
              </div>

              {/* 需求说明 */}
              {detail.message && (
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">需求说明</div>
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{detail.message}</div>
                </div>
              )}

              {/* 来源页面 */}
              {detail.sourcePage && (
                <div className="text-xs text-gray-400">来源页面：{detail.sourcePage}</div>
              )}

              {/* 处理备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">处理备注</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="记录跟进情况、报价折扣等"
                />
              </div>

              {/* 状态流转 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <div className="flex flex-wrap gap-2">
                  {TABS.filter((t) => t.key !== "all").map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setDetail((prev) => (prev ? { ...prev, status: t.key } : prev))}
                      className={`px-3 py-1.5 text-sm rounded-lg border ${detail.status === t.key ? "bg-red-600 text-white border-red-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => saveDetail()}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存（含人工修改的报价）"}
                </button>
                <button
                  onClick={() => removeQuote(detail)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
