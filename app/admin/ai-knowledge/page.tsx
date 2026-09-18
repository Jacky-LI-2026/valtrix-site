"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronRight, Brain, Languages, UploadCloud, Sparkles, Globe } from "lucide-react"

interface AiKnowledge {
  id: string
  title: string
  titleEn?: string | null
  titleJa?: string | null
  titleKo?: string | null
  titleFr?: string | null
  titleAr?: string | null
  content?: string | null
  contentEn?: string | null
  contentJa?: string | null
  contentKo?: string | null
  contentFr?: string | null
  contentAr?: string | null
  category?: string | null
  tags?: string | null
  source?: string | null
  status?: string | null
  sortOrder?: number | null
}

const LANGS = [
  { key: "zh", label: "中文", titleKey: "title", contentKey: "content" },
  { key: "en", label: "英文", titleKey: "titleEn", contentKey: "contentEn" },
  { key: "ja", label: "日文", titleKey: "titleJa", contentKey: "contentJa" },
  { key: "ko", label: "韩文", titleKey: "titleKo", contentKey: "contentKo" },
  { key: "fr", label: "法文", titleKey: "titleFr", contentKey: "contentFr" },
  { key: "ar", label: "阿拉伯文", titleKey: "titleAr", contentKey: "contentAr" },
]

const emptyForm = (): any => ({
  title: "", titleEn: "", titleJa: "", titleKo: "", titleFr: "", titleAr: "",
  content: "", contentEn: "", contentJa: "", contentKo: "", contentFr: "", contentAr: "",
  category: "", tags: "", source: "manual", status: "published", sortOrder: 0,
})

export default function AiKnowledgeAdminPage() {
  const [items, setItems] = useState<AiKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translateProgress, setTranslateProgress] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importCategory, setImportCategory] = useState("文档导入")
  const [genKw, setGenKw] = useState("")
  const [genCategory, setGenCategory] = useState("AI生成")
  const [genCount, setGenCount] = useState(5)
const [webCollecting, setWebCollecting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [batchTranslating, setBatchTranslating] = useState(false)
  const [batchProgress, setBatchProgress] = useState("")

  useEffect(() => { fetchItems() }, [])

  // 批量补全所有条目多语言（串行分批，进度提示）
  const handleBatchTranslate = async () => {
    if (!window.confirm("将把所有缺少外语种的问答条目批量翻译为 5 个语种（英文/日文/韩文/法文/阿拉伯文）。条目较多时耗时较长，继续？")) return
    setBatchTranslating(true); setBatchProgress("准备中...")
    try {
      let offset = 0; let total = 0
      for (;;) {
        const r = await fetch("/api/admin/ai-knowledge/translate-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 8, offset }),
        })
        const d = await r.json()
        if (d.error) { showMsg("error", "批量翻译失败: " + d.error); break }
        total += d.updated
        setBatchProgress(`已翻译 ${total} 条${d.remaining > 0 ? `，剩余 ${d.remaining} 条` : ""}...`)
        if (d.remaining <= 0) break
        if (d.updated === 0) { showMsg("error", `本批未能翻译（翻译服务可能限流），剩余 ${d.remaining} 条可稍后重试`); break }
        offset += 8
      }
      showMsg("success", `批量翻译完成，共补全 ${total} 条问答的多语言`)
      setBatchProgress("")
      fetchItems()
    } catch (e: any) {
      showMsg("error", "批量翻译异常: " + e.message)
    } finally {
      setBatchTranslating(false)
    }
  }

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/admin/ai-knowledge")
      const data = await res.json()
      if (Array.isArray(data)) setItems(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSave = async (id?: string) => {
    if (!form.title) { showMsg("error", "中文标题不能为空"); return }
    setSaving(true)
    try {
      const body = id ? { ...form, id } : form
      const res = await fetch("/api/admin/ai-knowledge", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "保存失败")
      showMsg("success", id ? "知识条目已更新" : "知识条目已创建")
      setShowNew(false); setExpandedId(null); setForm(emptyForm())
      fetchItems()
    } catch (e: any) { showMsg("error", e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该知识条目？")) return
    try {
      const res = await fetch(`/api/admin/ai-knowledge?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "删除失败")
      showMsg("success", "知识条目已删除")
      fetchItems()
    } catch (e: any) { showMsg("error", e.message) }
  }

  const startEdit = (it: AiKnowledge) => {
    setForm({
      title: it.title, titleEn: it.titleEn || "", titleJa: it.titleJa || "", titleKo: it.titleKo || "", titleFr: it.titleFr || "", titleAr: it.titleAr || "",
      content: it.content || "", contentEn: it.contentEn || "", contentJa: it.contentJa || "", contentKo: it.contentKo || "", contentFr: it.contentFr || "", contentAr: it.contentAr || "",
      category: it.category || "", tags: it.tags || "", source: it.source || "manual", status: it.status || "published", sortOrder: it.sortOrder || 0,
    })
    setTranslateProgress("")
    setExpandedId(it.id); setShowNew(false)
  }

  // 一键翻译当前条目的标题与内容到 5 个外语种（串行节流，复用 /api/admin/translate）
  const handleTranslate = async () => {
    if (!form.title) { showMsg("error", "请先填写中文标题"); return }
    if (!window.confirm("将把中文标题与内容一键翻译为 5 个语种（英文/日文/韩文/法文/阿拉伯文），继续？")) return
    setTranslating(true)
    try {
      const targets = [
        { code: "en", label: "英文" },
        { code: "ja", label: "日文" },
        { code: "ko", label: "韩文" },
        { code: "fr", label: "法文" },
        { code: "ar", label: "阿拉伯文" },
      ]
      for (let i = 0; i < targets.length; i++) {
        const lang = targets[i].code
        setTranslateProgress(`正在翻译 ${targets[i].label} (${i + 1}/${targets.length})...`)
        const tk = lang === "en" ? "titleEn" : `title${lang[0].toUpperCase()}${lang.slice(1)}`
        const ck = lang === "en" ? "contentEn" : `content${lang[0].toUpperCase()}${lang.slice(1)}`
        if (form.title && !form[tk]) {
          const r = await translateText(form.title, lang)
          if (r) form[tk] = r
        }
        if (form.content && !form[ck]) {
          const r = await translateText(form.content, lang)
          if (r) form[ck] = r
        }
      }
      setTranslateProgress("")
      setForm({ ...form })
      showMsg("success", "翻译完成，请检查后保存")
    } catch (e: any) { showMsg("error", "翻译失败: " + e.message) }
    finally { setTranslating(false) }
  }

  const translateText = async (text: string, targetLang: string) => {
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang, field: "plain" }),
      })
      const data = await res.json()
      return data.translatedText || null
    } catch { return null }
  }

  // 上传文档 → 自动分析生成问答对 → 批量入库
  const handleImport = async () => {
    if (!importFile) { showMsg("error", "请先选择文件"); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", importFile)
      fd.append("category", importCategory.trim() || "文档导入")
      const res = await fetch("/api/admin/ai-knowledge/import", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "导入失败")
      showMsg("success", "导入完成：新增 " + data.imported + " 条问答" + (data.errors?.length ? "，" + data.errors.length + " 段失败" : ""))
      setImportFile(null)
      setImportCategory("文档导入")
      const fileInput = document.getElementById("kb-file-input") as HTMLInputElement | null
      if (fileInput) fileInput.value = ""
      fetchItems()
    } catch (e: any) {
      showMsg("error", e.message)
    } finally { setUploading(false) }
  }

  // 按关键词 → AI 生成知识问答 → 批量入库
  const handleGenerate = async () => {
    if (!genKw.trim()) { showMsg("error", "请输入关键词"); return }
    if (!window.confirm(`将围绕「${genKw.trim()}」用 AI 生成 ${genCount} 个问答对并加入知识库，继续？`)) return
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/ai-knowledge/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: genKw.trim(), category: genCategory.trim() || "AI生成", count: genCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成失败")
      showMsg("success", `生成完成：新增 ${data.imported} 条问答（共生成 ${data.total} 条）`)
      setGenKw("")
      fetchItems()
    } catch (e: any) { showMsg("error", e.message) }
    finally { setGenerating(false) }
  }

  // 全网收集：关键词 → 搜索引擎抓取素材 → AI 整理问答（带来源）→ 入库
  const handleWebCollect = async () => {
    if (!genKw.trim()) { showMsg("error", "请输入关键词"); return }
    if (!window.confirm(`将围绕「${genKw.trim()}」从全网收集资料并用 AI 生成 ${genCount} 个问答对（答案附来源链接）加入知识库，继续？`)) return
    setWebCollecting(true)
    try {
      const res = await fetch("/api/admin/ai-knowledge/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: genKw.trim(), category: genCategory.trim() || "全网收集", count: genCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "全网收集失败")
      const srcInfo = data.sources > 0 ? `（已采集 ${data.sources} 条网络素材）` : "（未获取到网络素材，已按 AI 常识生成）"
      showMsg("success", `全网收集完成：新增 ${data.imported} 条问答 ${srcInfo}`)
      setGenKw("")
      fetchItems()
    } catch (e: any) { showMsg("error", e.message) }
    finally { setWebCollecting(false) }
  }

  const renderEditor = (itemId?: string) => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {LANGS.map((l) => (
          <span key={l.key} className="text-xs font-medium text-gray-400">{l.label}</span>
        ))}
      </div>
      {LANGS.map((l) => (
        <div key={l.key}>
          <label className="block text-xs text-gray-500 mb-1">{l.label}标题{l.key === "zh" && <span className="text-red-500"> *</span>}</label>
          <input type="text" value={form[l.titleKey] || ""} onChange={(e) => setForm({ ...form, [l.titleKey]: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          <label className="block text-xs text-gray-500 mb-1 mt-2">{l.label}内容</label>
          <textarea value={form[l.contentKey] || ""} onChange={(e) => setForm({ ...form, [l.contentKey]: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none" />
        </div>
      ))}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">分类</label>
          <input type="text" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="如 产品/行业/服务" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">标签（逗号分隔）</label>
          <input type="text" value={form.tags || ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">来源</label>
          <select value={form.source || "manual"} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="manual">手动创建</option>
            <option value="seed">预置知识</option>
            <option value="auto">全网收集</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">状态</label>
          <select value={form.status || "published"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="published">启用</option>
            <option value="draft">停用</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">排序</label>
          <input type="number" value={form.sortOrder || 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <button onClick={() => handleTranslate()} disabled={translating} className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
          <Languages size={12} /> {translating ? (translateProgress || "翻译中...") : "一键翻译全部语种"}
        </button>
        {translating && <span className="text-xs text-purple-600 animate-pulse">{translateProgress || "翻译中..."}</span>}
        <button onClick={() => handleSave(itemId)} disabled={saving} className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
          <Save size={14} /> 保存
        </button>
        <button onClick={() => { setShowNew(false); setExpandedId(null); setForm(emptyForm()) }} className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 flex items-center gap-1">
          <X size={14} /> 取消
        </button>
      </div>
    </div>
  )

  if (loading) return <div className="p-8 text-gray-500">加载中...</div>

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Brain size={20} className="text-red-600" /> AI 客服知识库
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          为 AI 智能客服提供知识条目：手动创建、预置行业知识、或标记全网收集内容。知识库会随产品/新闻/服务/行业/FAQ 一起供 AI 检索回答。
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleBatchTranslate}
            disabled={batchTranslating}
            className="px-4 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Languages size={14} /> {batchTranslating ? (batchProgress || "翻译中...") : "批量补全多语言"}
          </button>
          {batchTranslating && <span className="text-xs text-purple-600 animate-pulse">{batchProgress}</span>}
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* 上传文档自动分析 */}
      <div className="bg-white rounded-lg border border-blue-200 shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50/50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <UploadCloud size={16} className="text-blue-600" /> 上传文档自动生成问答
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">支持 txt / md / docx / pdf / html，AI 自动分析内容并生成「问题 + 答案」问答对，直接进入知识库供 AI 客服使用。</p>
        </div>
        <div className="p-4 flex flex-wrap items-center gap-3">
          <input
            id="kb-file-input"
            type="file"
            accept=".txt,.md,.markdown,.docx,.pdf,.html,.htm"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-blue-600 file:text-white file:text-xs file:cursor-pointer"
          />
          <input
            type="text"
            value={importCategory}
            onChange={(e) => setImportCategory(e.target.value)}
            placeholder="分类（如 产品/行业/服务）"
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-44"
          />
          <button onClick={handleImport} disabled={uploading || !importFile}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
            <UploadCloud size={14} /> {uploading ? "分析中，请稍候..." : "上传并自动分析"}
          </button>
          <span className="text-xs text-gray-400">单文件 ≤ 20MB；AI 将按片段自动提炼 2-5 个问答对</span>
        </div>
      </div>

      {/* 按关键词 AI 生成 */}
      <div className="bg-white rounded-lg border border-purple-200 shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-purple-100 bg-purple-50/50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600" /> 按关键词 AI 生成 / 全网收集知识库
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">输入行业/产品关键词：①「AI 生成」基于行业常识生成问答；②「全网收集」先从搜索引擎抓取全网资料，再由 AI 整理为带来源链接的问答对。均可直接进入知识库供 AI 客服使用。</p>
        </div>
        <div className="p-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={genKw}
            onChange={(e) => setGenKw(e.target.value)}
            placeholder="关键词 / 主题，如：工业阀门、闸阀选型"
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-72"
          />
          <input
            type="text"
            value={genCategory}
            onChange={(e) => setGenCategory(e.target.value)}
            placeholder="分类（如 产品/行业/服务）"
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-44"
          />
          <select value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm">
            {[3, 5, 8, 10].map((n) => <option key={n} value={n}>生成 {n} 条</option>)}
          </select>
          <button onClick={handleGenerate} disabled={generating}
            className="px-4 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
            <Sparkles size={14} /> {generating ? "AI 生成中..." : "AI 生成"}
          </button>
          <button onClick={handleWebCollect} disabled={webCollecting}
            className="px-4 py-1.5 bg-sky-600 text-white text-sm rounded-md hover:bg-sky-700 disabled:opacity-50 flex items-center gap-1">
            <Globe size={14} /> {webCollecting ? "全网收集中..." : "全网收集生成"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Brain size={16} className="text-red-600" /> 知识条目列表（{items.length}）
          </h2>
          <button onClick={() => { setShowNew(!showNew); setExpandedId(null); setForm(emptyForm()) }}
            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 flex items-center gap-1">
            <Plus size={14} /> 新建知识条目
          </button>
        </div>

        {showNew && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            {renderEditor()}
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {items.map((it) => (
            <div key={it.id}>
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-2 min-w-0 cursor-pointer flex-1" onClick={() => startEdit(it)}>
                  {expandedId === it.id ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{it.title}</div>
                    {it.content ? (
                      <div className="text-xs text-gray-500 truncate mt-0.5">{it.content}</div>
                    ) : (
                      <div className="text-xs text-amber-500 mt-0.5">（暂无答案，点击行补充）</div>
                    )}
                    <div className="text-xs text-gray-400 truncate">
                      {it.category || "未分类"} · 来源：{it.source === "manual" ? "手动" : it.source === "seed" ? "预置" : "全网收集"} · 状态：{it.status === "published" ? "启用" : "停用"} · 排序 {it.sortOrder ?? 0}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(it)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(it.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expandedId === it.id && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  {renderEditor(it.id)}
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-400">暂无知识条目，点击“新建知识条目”开始创建</div>}
        </div>
      </div>
    </div>
  )
}
