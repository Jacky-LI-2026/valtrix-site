"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  nameJa?: string | null;
  nameKo?: string | null;
  nameFr?: string | null;
  nameAr?: string | null;
  type: string;
  amount: number;
  minAmount: number;
  maxDiscount: number;
  startAt: string | null;
  endAt: string | null;
  total: number;
  claimed: number;
  perUser: number;
  isActive: boolean;
  createdAt: string;
}

const EMPTY = {
  name: "", nameEn: "", nameJa: "", nameKo: "", nameFr: "", nameAr: "",
  code: "", type: "fixed", amount: "", minAmount: "0", maxDiscount: "",
  startAt: "", endAt: "", total: "0", perUser: "1", isActive: true,
};

export default function AdminShopCouponsPage() {
  const [list, setList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [tip, setTip] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/shop/coupons");
      const d = await r.json();
      if (d.ok) setList(d.coupons || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm({ ...EMPTY });
    setEditing(null);
    setTip("");
  };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      name: c.name, nameEn: c.nameEn || "", nameJa: c.nameJa || "", nameKo: c.nameKo || "", nameFr: c.nameFr || "", nameAr: c.nameAr || "",
      code: c.code, type: c.type, amount: String(c.amount), minAmount: String(c.minAmount), maxDiscount: c.maxDiscount ? String(c.maxDiscount) : "",
      startAt: c.startAt ? String(c.startAt).slice(0, 16) : "", endAt: c.endAt ? String(c.endAt).slice(0, 16) : "",
      total: String(c.total), perUser: String(c.perUser), isActive: c.isActive,
    });
    setTip("");
  };

  const save = async () => {
    setTip("");
    if (!form.name.trim()) return setTip("请填写券名称");
    const payload = {
      ...form,
      amount: Number(form.amount) || 0,
      minAmount: Number(form.minAmount) || 0,
      maxDiscount: Number(form.maxDiscount) || 0,
      total: Number(form.total) || 0,
      perUser: Number(form.perUser) || 1,
      startAt: form.startAt || null,
      endAt: form.endAt || null,
      isActive: !!form.isActive,
    };
    const r = await fetch(editing ? `/api/admin/shop/coupons/${editing.id}` : "/api/admin/shop/coupons", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!d.ok) return setTip(d.error || "保存失败");
    setTip("已保存");
    setEditing(null);
    load();
  };

  const toggle = async (c: Coupon) => {
    await fetch(`/api/admin/shop/coupons/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`确认删除券「${c.name}」？已领取记录将一并删除`)) return;
    await fetch(`/api/admin/shop/coupons/${c.id}`, { method: "DELETE" });
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => setTip(`已复制 ${code}`));
  };

  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "不限");
  const expired = (c: Coupon) => (c.endAt ? new Date(c.endAt).getTime() < Date.now() : false);

  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary";
  const label = "mb-1 block text-sm text-gray-700";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">优惠券管理</h1>
          <p className="text-sm text-gray-500">满减 / 折扣券 · 前台领券中心发放，下单时服务端校验</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
          <Plus className="h-4 w-4" /> 新建优惠券
        </button>
      </div>

      {tip && <p className="text-sm text-green-600">{tip}</p>}

      <div className="rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-400">加载中...</p>
        ) : list.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">暂无优惠券，点击右上角新建</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="px-4 py-3 font-medium">券名</th>
                <th className="px-4 py-3 font-medium">券码</th>
                <th className="px-4 py-3 font-medium">面额/折扣</th>
                <th className="px-4 py-3 font-medium">有效期</th>
                <th className="px-4 py-3 font-medium">领取/总量</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((c) => (
                <tr key={c.id} className={expired(c) ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {c.name}
                    {c.type === "percent" && <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">折扣</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-600">
                      {c.code}
                      <button onClick={() => copyCode(c.code)} className="text-gray-300 hover:text-primary"><Copy className="h-3.5 w-3.5" /></button>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.type === "percent"
                      ? `${c.amount / 10} 折${c.maxDiscount ? `（封顶 ¥${c.maxDiscount}）` : ""}`
                      : `满 ¥${c.minAmount} 减 ¥${c.amount}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.startAt)} ~ {fmtDate(c.endAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.claimed}{c.total > 0 ? ` / ${c.total}` : " / 不限"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.isActive && !expired(c) ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                      {expired(c) ? "已过期" : c.isActive ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button onClick={() => toggle(c)} className="text-xs text-gray-500 hover:text-primary">{c.isActive ? "停用" : "启用"}</button>
                      <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(c)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 新建/编辑弹窗 */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => { setEditing(null); setForm(null); }}>
          <div className="mt-8 w-full max-w-xl rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">{editing ? `编辑券 · ${editing.name}` : "新建优惠券"}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label}>券名称（中文）*</label>
                <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：新客满减券" />
              </div>
              {["En", "Ja", "Ko", "Fr", "Ar"].map((l) => (
                <div key={l}>
                  <label className={label}>名称 {l}</label>
                  <input className={input} value={form[`name${l}`]} onChange={(e) => setForm({ ...form, [`name${l}`]: e.target.value })} placeholder={l === "En" ? "English name (optional)" : `Name in ${l} (optional)`} />
                </div>
              ))}
              <div>
                <label className={label}>券码（留空自动生成）</label>
                <input className={`${input} font-mono`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CPNXXXXXXXX" />
              </div>
              <div>
                <label className={label}>类型</label>
                <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="fixed">满减券</option>
                  <option value="percent">折扣券</option>
                </select>
              </div>
              <div>
                <label className={label}>{form.type === "percent" ? "折扣率（90 = 9折）*" : "减免金额（¥）*"}</label>
                <input className={input} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className={label}>使用门槛（满 ¥）</label>
                <input className={input} type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} />
              </div>
              {form.type === "percent" && (
                <div>
                  <label className={label}>封顶优惠（¥，0=不限）</label>
                  <input className={input} type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
                </div>
              )}
              <div>
                <label className={label}>开始时间</label>
                <input className={input} type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
              </div>
              <div>
                <label className={label}>结束时间</label>
                <input className={input} type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
              </div>
              <div>
                <label className={label}>发行总量（0=不限）</label>
                <input className={input} type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
              </div>
              <div>
                <label className={label}>每人限领</label>
                <input className={input} type="number" value={form.perUser} onChange={(e) => setForm({ ...form, perUser: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                立即启用
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setEditing(null); setForm(null); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">取消</button>
              <button onClick={save} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
