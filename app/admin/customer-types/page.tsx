"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const LANGS = [
  { key: "", label: "中文" },
  { key: "En", label: "英文" },
  { key: "Ja", label: "日文" },
  { key: "Ko", label: "韩文" },
  { key: "Fr", label: "法文" },
  { key: "Ar", label: "阿拉伯文" },
];

interface CustomerType {
  id: string;
  key: string;
  name: string;
  nameEn: string | null;
  nameJa: string | null;
  nameKo: string | null;
  nameFr: string | null;
  nameAr: string | null;
  discount: number;
  seePartsPrice: boolean;
  isDefault: boolean;
  sortOrder: number;
  memberCount: number;
}

export default function CustomerTypesPage() {
  const router = useRouter();
  const [list, setList] = useState<CustomerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CustomerType | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/customer-types", { cache: "no-store" });
      const d = await r.json();
      setList(Array.isArray(d) ? d : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm({ key: "", name: "", nameEn: "", nameJa: "", nameKo: "", nameFr: "", nameAr: "", discount: 0, seePartsPrice: false, isDefault: false, sortOrder: list.length + 1 });
  }
  function openEdit(t: CustomerType) {
    setCreating(false);
    setEditing(t);
    setForm({ ...t });
  }

  async function save() {
    setMsg("");
    const url = editing ? `/api/admin/customer-types/${editing.id}` : "/api/admin/customer-types";
    const r = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(d.error || "保存失败"); return; }
    setEditing(null); setCreating(false);
    await load();
    router.refresh();
  }

  async function remove(t: CustomerType) {
    if (!confirm(`确认删除客户分类「${t.name}」？`)) return;
    const r = await fetch(`/api/admin/customer-types/${t.id}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { alert(d.error || "删除失败"); return; }
    await load();
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            客户分类用于控制价格可见性与折扣：配件价格仅对「整机客户」「配件客户」开放（勾选“可见配件价格”）。
            新注册会员默认归属「默认」分类。已购客户可在会员管理中将询价客户转为配件客户。
          </p>
          <button onClick={openCreate} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">+ 新增分类</button>
        </div>

        {msg && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{msg}</div>}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 border-b">
                <th className="text-left p-3">key</th>
                <th className="text-left p-3">名称（六语）</th>
                <th className="text-center p-3">折扣%</th>
                <th className="text-center p-3">可见配件价</th>
                <th className="text-center p-3">默认</th>
                <th className="text-center p-3">排序</th>
                <th className="text-center p-3">会员数</th>
                <th className="text-center p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{t.key}</td>
                  <td className="p-3">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-400">
                      {[t.nameEn, t.nameJa, t.nameKo, t.nameFr, t.nameAr].filter(Boolean).join(" / ") || "—"}
                    </div>
                  </td>
                  <td className="p-3 text-center">{t.discount}%</td>
                  <td className="p-3 text-center">{t.seePartsPrice ? "✓" : "—"}</td>
                  <td className="p-3 text-center">{t.isDefault ? "✓" : "—"}</td>
                  <td className="p-3 text-center">{t.sortOrder}</td>
                  <td className="p-3 text-center">{t.memberCount}</td>
                  <td className="p-3 text-center space-x-2">
                    <button onClick={() => openEdit(t)} className="text-blue-600 hover:underline">编辑</button>
                    <button onClick={() => remove(t)} className="text-red-500 hover:underline">删除</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && !loading && (
                <tr><td colSpan={8} className="p-6 text-center text-gray-400">暂无客户分类</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {(creating || editing) && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">{editing ? `编辑分类：${editing.name}` : "新增客户分类"}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">key（唯一标识）</label>
                  <input
                    className="w-full border rounded p-2 text-sm"
                    value={String(form.key || "")}
                    disabled={!!editing}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    placeholder="如 machine / custom1"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">排序</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2 text-sm"
                    value={Number(form.sortOrder) || 0}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  />
                </div>
                {LANGS.map((l) => (
                  <div key={l.key || "zh"}>
                    <label className="block text-xs text-gray-500 mb-1">名称（{l.label}）</label>
                    <input
                      className="w-full border rounded p-2 text-sm"
                      value={String(form["name" + l.key] || "")}
                      onChange={(e) => setForm({ ...form, ["name" + l.key]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">折扣（%，0=无折扣）</label>
                  <input
                    type="number" min={0} max={100}
                    className="w-full border rounded p-2 text-sm"
                    value={Number(form.discount) || 0}
                    onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(form.seePartsPrice)} onChange={(e) => setForm({ ...form, seePartsPrice: e.target.checked })} />
                    可见配件价格（该分类客户可查看配件类产品价格）
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(form.isDefault)} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                    设为默认分类（新注册会员归属）
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setEditing(null); setCreating(false); }} className="px-4 py-2 border rounded text-sm">取消</button>
                <button onClick={save} className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">保存</button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
