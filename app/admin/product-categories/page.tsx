"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronRight, Package, FolderOpen } from "lucide-react"

interface ProductTab {
  id: string
  slug: string
  name: string
  nameEn?: string | null
  nameJa?: string | null
  nameKo?: string | null
  nameFr?: string | null
  nameAr?: string | null
  sortOrder: number
}

interface ProductCategory {
  id: string
  tabId: string
  slug: string
  name: string
  nameEn?: string | null
  nameJa?: string | null
  nameKo?: string | null
  nameFr?: string | null
  nameAr?: string | null
  sortOrder: number
}

const LANGS: { key: string; label: string; required?: boolean }[] = [
  { key: "name", label: "中文", required: true },
  { key: "nameEn", label: "英文" },
  { key: "nameJa", label: "日文" },
  { key: "nameKo", label: "韩文" },
  { key: "nameFr", label: "法文" },
  { key: "nameAr", label: "阿拉伯文" },
]

const emptyForm = () => ({
  name: "",
  nameEn: "",
  nameJa: "",
  nameKo: "",
  nameFr: "",
  nameAr: "",
  slug: "",
  sortOrder: 0,
})

export default function ProductCategoriesAdminPage() {
  const [tabs, setTabs] = useState<ProductTab[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedTab, setExpandedTab] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [showNewTab, setShowNewTab] = useState(false)
  const [showNewCat, setShowNewCat] = useState(false)
  const [tabForm, setTabForm] = useState(emptyForm())
  const [catForm, setCatForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchTabs()
  }, [])

  useEffect(() => {
    if (activeTabId) fetchCategories(activeTabId)
  }, [activeTabId])

  const fetchTabs = async () => {
    try {
      const res = await fetch("/api/admin/product-tabs")
      const data = await res.json()
      if (Array.isArray(data)) {
        setTabs(data)
        if (!activeTabId && data.length > 0) setActiveTabId(data[0].id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async (tabId: string) => {
    try {
      const res = await fetch(`/api/admin/product-categories?tabId=${tabId}`)
      const data = await res.json()
      if (Array.isArray(data)) setCategories(data)
    } catch (e) {
      console.error(e)
    }
  }

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  // ========== Tab 操作 ==========
  const handleSaveTab = async (id?: string) => {
    if (!tabForm.name || !tabForm.slug) {
      showMsg("error", "中文名称和 slug 不能为空")
      return
    }
    setSaving(true)
    try {
      const url = id ? "/api/admin/product-tabs" : "/api/admin/product-tabs"
      const method = id ? "PUT" : "POST"
      const body = id ? { ...tabForm, id } : tabForm
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "保存失败")
      showMsg("success", id ? "Tab 已更新" : "Tab 已创建")
      setShowNewTab(false)
      setExpandedTab(null)
      setTabForm(emptyForm())
      fetchTabs()
    } catch (e: any) {
      showMsg("error", e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTab = async (id: string) => {
    if (!confirm("确定删除该产品 Tab？其下分类也会被级联删除。")) return
    try {
      const res = await fetch(`/api/admin/product-tabs?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "删除失败")
      showMsg("success", "Tab 已删除")
      if (activeTabId === id) {
        setActiveTabId(null)
        setCategories([])
      }
      fetchTabs()
    } catch (e: any) {
      showMsg("error", e.message)
    }
  }

  const startEditTab = (tab: ProductTab) => {
    setTabForm({
      name: tab.name,
      nameEn: tab.nameEn || "",
      nameJa: tab.nameJa || "",
      nameKo: tab.nameKo || "",
      nameFr: tab.nameFr || "",
      nameAr: tab.nameAr || "",
      slug: tab.slug,
      sortOrder: tab.sortOrder,
    })
    setExpandedTab(tab.id)
    setShowNewTab(false)
  }

  // ========== Category 操作 ==========
  const handleSaveCat = async (id?: string) => {
    if (!catForm.name || !catForm.slug) {
      showMsg("error", "中文名称和 slug 不能为空")
      return
    }
    if (!activeTabId) {
      showMsg("error", "请先选择所属 Tab")
      return
    }
    setSaving(true)
    try {
      const body = id ? { ...catForm, id } : { ...catForm, tabId: activeTabId }
      const res = await fetch("/api/admin/product-categories", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "保存失败")
      showMsg("success", id ? "分类已更新" : "分类已创建")
      setShowNewCat(false)
      setExpandedCat(null)
      setCatForm(emptyForm())
      fetchCategories(activeTabId)
    } catch (e: any) {
      showMsg("error", e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCat = async (id: string) => {
    if (!confirm("确定删除该产品分类？")) return
    try {
      const res = await fetch(`/api/admin/product-categories?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "删除失败")
      showMsg("success", "分类已删除")
      fetchCategories(activeTabId!)
    } catch (e: any) {
      showMsg("error", e.message)
    }
  }

  const startEditCat = (cat: ProductCategory) => {
    setCatForm({
      name: cat.name,
      nameEn: cat.nameEn || "",
      nameJa: cat.nameJa || "",
      nameKo: cat.nameKo || "",
      nameFr: cat.nameFr || "",
      nameAr: cat.nameAr || "",
      slug: cat.slug,
      sortOrder: cat.sortOrder,
    })
    setExpandedCat(cat.id)
    setShowNewCat(false)
  }

  // 通用：六语种输入行
  const LangInputs = ({ form, setForm }: { form: any; setForm: (f: any) => void }) => (
    <div className="grid grid-cols-2 gap-3">
      {LANGS.map((l) => (
        <div key={l.key}>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {l.label} {l.required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={form[l.key] || ""}
            onChange={(e) => setForm({ ...form, [l.key]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder={l.label}
          />
        </div>
      ))}
    </div>
  )

  if (loading) return <div className="p-8 text-gray-500">加载中...</div>

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">产品分类管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理产品 Tab（一级）和产品分类（二级）的多语言名称、slug 与排序</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左栏：Tab 列表 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Package size={16} className="text-red-600" /> 产品 Tab（一级）
              </h2>
              <button
                onClick={() => { setShowNewTab(!showNewTab); setExpandedTab(null); setTabForm(emptyForm()) }}
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 flex items-center gap-1"
              >
                <Plus size={14} /> 新建
              </button>
            </div>

            {/* 新建 Tab 表单 */}
            {showNewTab && (
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <LangInputs form={tabForm} setForm={setTabForm} />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Slug *</label>
                    <input type="text" value={tabForm.slug} onChange={(e) => setTabForm({ ...tabForm, slug: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="如 growth" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">排序</label>
                    <input type="number" value={tabForm.sortOrder} onChange={(e) => setTabForm({ ...tabForm, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleSaveTab()} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                    <Save size={14} /> 保存
                  </button>
                  <button onClick={() => { setShowNewTab(false); setTabForm(emptyForm()) }} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 flex items-center gap-1">
                    <X size={14} /> 取消
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {tabs.map((tab) => (
                <div key={tab.id}>
                  <div
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 ${activeTabId === tab.id ? "bg-red-50 border-l-4 border-red-600" : ""}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {expandedTab === tab.id ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{tab.name}</div>
                        <div className="text-xs text-gray-400">/{tab.slug}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditTab(tab) }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTab(tab.id) }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 编辑 Tab 展开 */}
                  {expandedTab === tab.id && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                      <LangInputs form={tabForm} setForm={setTabForm} />
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Slug *</label>
                          <input type="text" value={tabForm.slug} onChange={(e) => setTabForm({ ...tabForm, slug: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">排序</label>
                          <input type="number" value={tabForm.sortOrder} onChange={(e) => setTabForm({ ...tabForm, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleSaveTab(tab.id)} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                          <Save size={14} /> 保存
                        </button>
                        <button onClick={() => { setExpandedTab(null); setTabForm(emptyForm()) }} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 flex items-center gap-1">
                          <X size={14} /> 取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {tabs.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-400">暂无 Tab，点击「新建」添加</div>}
            </div>
          </div>
        </div>

        {/* 右栏：Category 列表 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FolderOpen size={16} className="text-red-600" />
                产品分类（二级）
                {activeTabId && <span className="text-xs font-normal text-gray-400">— {tabs.find(t => t.id === activeTabId)?.name}</span>}
              </h2>
              <button
                onClick={() => { if (activeTabId) { setShowNewCat(!showNewCat); setExpandedCat(null); setCatForm(emptyForm()) } }}
                disabled={!activeTabId}
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Plus size={14} /> 新建分类
              </button>
            </div>

            {!activeTabId && <div className="px-4 py-12 text-center text-sm text-gray-400">请先在左侧选择一个产品 Tab</div>}

            {activeTabId && (
              <>
                {/* 新建 Category 表单 */}
                {showNewCat && (
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <LangInputs form={catForm} setForm={setCatForm} />
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Slug *</label>
                        <input type="text" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="如 diaphragm-valve" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">排序</label>
                        <input type="number" value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleSaveCat()} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                        <Save size={14} /> 保存
                      </button>
                      <button onClick={() => { setShowNewCat(false); setCatForm(emptyForm()) }} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 flex items-center gap-1">
                        <X size={14} /> 取消
                      </button>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-gray-100">
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center gap-2 min-w-0">
                          {expandedCat === cat.id ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                          <div className="min-w-0 cursor-pointer" onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}>
                            <div className="text-sm font-medium text-gray-900 truncate">{cat.name}</div>
                            <div className="text-xs text-gray-400">/{cat.slug} · 排序 {cat.sortOrder}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => startEditCat(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteCat(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {expandedCat === cat.id && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                          <LangInputs form={catForm} setForm={setCatForm} />
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Slug *</label>
                              <input type="text" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">排序</label>
                              <input type="number" value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleSaveCat(cat.id)} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                              <Save size={14} /> 保存
                            </button>
                            <button onClick={() => { setExpandedCat(null); setCatForm(emptyForm()) }} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 flex items-center gap-1">
                              <X size={14} /> 取消
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && !showNewCat && (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">该 Tab 下暂无分类，点击「新建分类」添加</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
