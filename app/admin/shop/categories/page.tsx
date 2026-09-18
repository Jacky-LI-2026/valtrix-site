"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const LANGS = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
];

const inputCls = "border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary";

const empty = () => ({
  slug: "",
  name: "", nameEn: "", nameJa: "", nameKo: "", nameFr: "", nameAr: "",
  sortOrder: "0",
});

export default function AdminShopCategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty());
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const r = await fetch("/api/admin/shop/categories");
    const d = await r.json();
    if (d.ok) setItems(d.items || []);
  };

  useEffect(() => {
    load();
  }, []);

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function openCreate() {
    setEditing(null);
    setForm(empty());
    setShowModal(true);
  }

  function openEdit(it: any) {
    setEditing(it);
    setForm({
      slug: it.slug || "",
      name: it.name || "",
      nameEn: it.nameEn || "", nameJa: it.nameJa || "", nameKo: it.nameKo || "", nameFr: it.nameFr || "", nameAr: it.nameAr || "",
      sortOrder: String(it.sortOrder ?? 0),
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.name || !String(form.name).trim()) return setMsg("分类名称必填");
    const url = editing ? `/api/admin/shop/categories/${editing.id}` : "/api/admin/shop/categories";
    const r = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.ok) {
      setMsg("");
      setShowModal(false);
      setEditing(null);
      load();
    } else {
      setMsg(d.error || "保存失败");
    }
  }

  async function remove(it: any) {
    if (!confirm(`删除分类「${it.name}」？`)) return;
    const r = await fetch(`/api/admin/shop/categories/${it.id}`, { method: "DELETE" });
    const d = await r.json();
    if (!d.ok) {
      alert(d.error || "删除失败");
      return;
    }
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">商城分类</h1>
          <p className="mt-0.5 text-sm text-gray-400">前台商城按分类筛选商品；六语种名称</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--color-primary, #CC0000)" }}>
          <Plus className="h-4 w-4" /> 新增分类
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">slug</th>
              <th className="px-4 py-3 font-medium">排序</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">暂无分类，点击右上角新增</td></tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-gray-400">
                    {LANGS.filter((l) => l.code !== "zh" && it[`name${l.code[0].toUpperCase()}${l.code.slice(1)}`])
                      .map((l) => `${l.label}: ${it[`name${l.code[0].toUpperCase()}${l.code.slice(1)}`]}`)
                      .join(" · ")}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{it.slug}</td>
                <td className="px-4 py-3 text-gray-500">{it.sortOrder}</td>
                <td className="px-4 py-3 space-x-2">
                  <button onClick={() => openEdit(it)} className="text-sm text-primary hover:underline"><Pencil className="inline h-3.5 w-3.5" /> 编辑</button>
                  <button onClick={() => remove(it)} className="text-sm text-red-500 hover:underline"><Trash2 className="inline h-3.5 w-3.5" /> 删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? "编辑分类" : "新增分类"}</h2>
              <button onClick={() => { setShowModal(false); setEditing(null); setMsg(""); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">slug（留空自动生成）</label>
                  <input className={inputCls} value={form.slug} onChange={(e) => setF("slug", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">排序</label>
                  <input className={inputCls} value={form.sortOrder} onChange={(e) => setF("sortOrder", e.target.value)} />
                </div>
              </div>
              {LANGS.map((l) => {
                const key = l.code === "zh" ? "name" : `name${l.code[0].toUpperCase()}${l.code.slice(1)}`;
                return (
                  <div key={l.code}>
                    <label className="block text-sm font-medium text-gray-700">{l.code === "zh" ? "名称（中文）" : `名称（${l.label}）`}</label>
                    <input className={inputCls} value={form[key] || ""} onChange={(e) => setF(key, e.target.value)} />
                  </div>
                );
              })}
              {msg && <p className="text-sm text-red-500">{msg}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowModal(false); setEditing(null); setMsg(""); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">取消</button>
                <button onClick={save} className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ background: "var(--color-primary, #CC0000)" }}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
