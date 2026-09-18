"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronRight, FolderOpen } from "lucide-react"

interface ResourceCategory {
  id: string
  type: string
  title: string
  titleEn?: string | null
  titleJa?: string | null
  titleKo?: string | null
  titleFr?: string | null
  titleAr?: string | null
  description?: string | null
  descriptionEn?: string | null
  descriptionJa?: string | null
  descriptionKo?: string | null
  descriptionFr?: string | null
  descriptionAr?: string | null
  icon?: string | null
  sortOrder: number
}

const TITLE_LANGS = [
  { key: "title", label: "中文标题", required: true },
  { key: "titleEn", label: "英文标题" },
  { key: "titleJa", label: "日文标题" },
  { key: "titleKo", label: "韩文标题" },
  { key: "titleFr", label: "法文标题" },
  { key: "titleAr", label: "阿拉伯文标题" },
]

const DESC_LANGS = [
  { key: "description", label: "中文描述" },
  { key: "descriptionEn", label: "英文描述" },
  { key: "descriptionJa", label: "日文描述" },
  { key: "descriptionKo", label: "韩文描述" },
  { key: "descriptionFr", label: "法文描述" },
  { key: "descriptionAr", label: "阿拉伯文描述" },
]

const emptyForm = () => ({
  type: "",
  title: "",
  titleEn: "",
  titleJa: "",
  titleKo: "",
  titleFr: "",
  titleAr: "",
  description: "",
  descriptionEn: "",
  descriptionJa: "",
  descriptionKo: "",
  descriptionFr: "",
  descriptionAr: "",
  icon: "",
  sortOrder: 0,
})

export default function ResourceCategoriesAdminPage() {
  const [cats, setCats] = useState<ResourceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => { fetchCats() }, [])

  const fetchCats = async () => {
    try {
      const res = await fetch("/api/admin/resource-categories")
      const data = await res.json()
      if (Array.isArray(data)) setCats(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSave = async (id?: string) => {
    if (!form.title || !form.type) { showMsg("error", "标题和 type 不能为空"); return }
    setSaving(true)
    try {
      const body = id ? { ...form, id } : form
      const res = await fetch("/api/admin/resource-categories", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "保存失败")
      showMsg("success", id ? "分类已更新" : "分类已创建")
      setShowNew(false); setExpandedId(null); setForm(emptyForm())
      fetchCats()
    } catch (e: any) { showMsg("error", e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该资源分类？")) return
    try {
      const res = await fetch(`/api/admin/resource-categories?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "删除失败")
      showMsg("success", "分类已删除")
      fetchCats()
    } catch (e: any) { showMsg("error", e.message) }
  }

  const startEdit = (cat: ResourceCategory) => {
    setForm({
      type: cat.type, title: cat.title,
      titleEn: cat.titleEn || "", titleJa: cat.titleJa || "", titleKo: cat.titleKo || "", titleFr: cat.titleFr || "", titleAr: cat.titleAr || "",
      description: cat.description || "", descriptionEn: cat.descriptionEn || "", descriptionJa: cat.descriptionJa || "",
      descriptionKo: cat.descriptionKo || "", descriptionFr: cat.descriptionFr || "", descriptionAr: cat.descriptionAr || "",
      icon: cat.icon || "", sortOrder: cat.sortOrder,
    })
    setExpandedId(cat.id); setShowNew(false)
  }

  if (loading) return <div className="p-8 text-gray-500">加载中...</div>

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">资源分类管理</h1>
        <p className="text-sm text-gray-500 mt-1">管理资源下载分类的多语言标题、描述与排序</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <FolderOpen size={16} className="text-red-600" /> 资源分类列表
          </h2>
          <button onClick={() => { setShowNew(!showNew); setExpandedId(null); setForm(emptyForm()) }}
            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 flex items-center gap-1">
            <Plus size={14} /> 新建分类
          </button>
        </div>

        {showNew && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <CatForm form={form} setForm={setForm} />
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleSave()} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                <Save size={14} /> 保存
              </button>
              <button onClick={() => { setShowNew(false); setForm(emptyForm()) }} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 flex items-center gap-1">
                <X size={14} /> 取消
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {cats.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}>
                  {expandedId === cat.id ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{cat.title}</div>
                    <div className="text-xs text-gray-400">type: {cat.type} · 排序 {cat.sortOrder}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expandedId === cat.id && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <CatForm form={form} setForm={setForm} />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleSave(cat.id)} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                      <Save size={14} /> 保存
                    </button>
                    <button onClick={() => { setExpandedId(null); setForm(emptyForm()) }} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 flex items-center gap-1">
                      <X size={14} /> 取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {cats.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-400">暂无分类</div>}
        </div>
      </div>
    </div>
  )
}

function CatForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type * <span className="text-gray-400">(唯一标识)</span></label>
          <input type="text" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="如 catalogs" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">图标</label>
          <input type="text" value={form.icon || ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="lucide 图标名" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">排序</label>
          <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">多语言标题</div>
        <div className="grid grid-cols-2 gap-3">
          {TITLE_LANGS.map((l) => (
            <div key={l.key}>
              <label className="block text-xs text-gray-400 mb-1">{l.label} {l.required && <span className="text-red-500">*</span>}</label>
              <input type="text" value={form[l.key] || ""} onChange={(e) => setForm({ ...form, [l.key]: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">多语言描述</div>
        <div className="grid grid-cols-2 gap-3">
          {DESC_LANGS.map((l) => (
            <div key={l.key}>
              <label className="block text-xs text-gray-400 mb-1">{l.label}</label>
              <textarea value={form[l.key] || ""} onChange={(e) => setForm({ ...form, [l.key]: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
