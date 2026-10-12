"use client"

import { useCallback, useEffect, useState } from "react"
import { Search, Sparkles, Loader2, RefreshCw, CheckCircle2 } from "lucide-react"

type TypeKey = "product" | "news" | "service" | "industry" | "case"

const TYPE_META: Record<TypeKey, { label: string; en: string }> = {
  product: { label: "产品", en: "产品" },
  news: { label: "新闻", en: "新闻" },
  service: { label: "服务", en: "服务" },
  industry: { label: "行业方案", en: "行业方案" },
  case: { label: "成功案例", en: "成功案例" },
}

interface AuditRow {
  id: string
  name: string
  missing: string
  sourceText: string
}

export default function SeoAuditPage() {
  const [stats, setStats] = useState<Record<string, { total: number; missing: number }> | null>(null)
  const [activeType, setActiveType] = useState<TypeKey | null>(null)
  const [list, setList] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const loadStats = useCallback(async () => {
    const r = await fetch("/api/admin/seo-audit", { cache: "no-store" })
    const d = await r.json()
    setStats(d.stats)
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  const openType = async (t: TypeKey) => {
    setActiveType(t)
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`/api/admin/seo-audit?type=${t}`, { cache: "no-store" })
      const d = await r.json()
      setList(d.list || [])
    } catch (e: any) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setLoading(false)
    }
  }

  const doBatch = async (withTranslate: boolean) => {
    if (!activeType || list.length === 0) return
    setBusy(true)
    setMsg(null)
    let done = 0
    const total = list.length
    let okCount = 0
    for (const row of list) {
      setProgress({ done, total })
      try {
        // 1. AI 生成中文 SEO（标题/描述/关键词）
        const src = (row.name + " " + row.sourceText).slice(0, 3000)
        const r = await fetch("/api/ai/feature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feature: "editor_summary", action: "summary", label: "SEO 批量补全", text: src }),
        })
        const d = await r.json()
        if (!d.ok) { done++; continue }
        const lines = String(d.result).split(/\r?\n/).map((l: string) => l.trim().replace(/^[1-3][.、)）]\s*/, "").replace(/^[（(]?\d+[)）]?\s*[:：]?\s*/, "")).filter(Boolean)
        const seo: Record<string, string> = {}
        if (lines[0]) seo.seoDescription = lines[0]
        if (lines[1]) seo.seoTitle = lines[1]
        if (lines[2]) seo.seoKeywords = lines[2].replace(/,/g, ", ")
        // 2. 翻译补齐英文
        if (withTranslate) {
          if (seo.seoTitle) {
            const t = await fetch("/api/admin/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: seo.seoTitle, targetLang: "en", isHtml: false }) }).then((x) => x.json())
            if (t.translatedText) seo.seoTitleEn = t.translatedText
          }
          if (seo.seoDescription) {
            const t = await fetch("/api/admin/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: seo.seoDescription, targetLang: "en", isHtml: false }) }).then((x) => x.json())
            if (t.translatedText) seo.seoDescriptionEn = t.translatedText
          }
          if (seo.seoKeywords) {
            const t = await fetch("/api/admin/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: seo.seoKeywords, targetLang: "en", isHtml: false }) }).then((x) => x.json())
            if (t.translatedText) seo.seoKeywordsEn = t.translatedText.replace(/，/g, ",").replace(/、/g, ",")
          }
        }
        // 3. 写回
        const w = await fetch("/api/admin/seo-audit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: activeType, id: row.id, seo }),
        })
        const wd = await w.json()
        if (wd.success) okCount++
      } catch { /* 单条失败继续 */ }
      done++
    }
    setProgress(null)
    setBusy(false)
    setMsg({ ok: true, text: `批量补全完成：成功 ${okCount}/${total} 条` })
    openType(activeType)
    loadStats()
  }

  const totalMissing = stats ? Object.values(stats).reduce((a, b) => a + b.missing, 0) : 0

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-dark flex items-center gap-2">
          <Search size={22} className="text-primary" /> SEO 批量补全
        </h1>
        <p className="text-dark-500 text-sm mt-1">统计并一键为缺失 SEO 配置的内容生成标题/描述/关键词（含英文），全站共 {totalMissing} 条待补全</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {(Object.keys(TYPE_META) as TypeKey[]).map((t) => {
          const s = stats?.[t]
          return (
            <button
              key={t}
              onClick={() => openType(t)}
              className={`bg-white rounded-lg border p-4 text-left transition-colors ${activeType === t ? "border-primary ring-2 ring-primary/20" : "border-dark-100 hover:border-primary/50"}`}
            >
              <div className="text-sm text-dark-500">{TYPE_META[t].label}</div>
              <div className="text-2xl font-bold text-dark mt-1">{s?.missing ?? "-"}</div>
              <div className="text-xs text-dark-400">缺 SEO / 共 {s?.total ?? "-"} 条</div>
            </button>
          )
        })}
      </div>

      {activeType && (
        <div className="bg-white rounded-lg border border-dark-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-dark">{TYPE_META[activeType].label}待补全（{list.length} 条）</h2>
            <div className="flex gap-2">
              <button
                onClick={() => doBatch(false)}
                disabled={busy || list.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50"
              >
                <Sparkles size={15} /> AI 批量补全（中文）
              </button>
              <button
                onClick={() => doBatch(true)}
                disabled={busy || list.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                <RefreshCw size={15} /> AI 补全 + 英文翻译
              </button>
              <button onClick={() => openType(activeType)} disabled={busy} className="px-3 py-2 text-sm border border-dark-200 rounded text-dark-600 hover:bg-dark-50">
                刷新
              </button>
            </div>
          </div>

          {busy && progress && (
            <div className="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-700 flex items-center gap-3">
              <Loader2 size={16} className="animate-spin" />
              正在补全 {progress.done}/{progress.total}…
            </div>
          )}

          {loading ? (
            <div className="text-dark-400 py-8 text-center">加载中…</div>
          ) : list.length === 0 ? (
            <div className="text-green-600 py-8 text-center flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> 该类型 SEO 已全部配置完整
            </div>
          ) : (
            <div className="divide-y divide-dark-50">
              {list.map((row) => (
                <div key={row.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark truncate">{row.name}</div>
                    <div className="text-xs text-dark-400 mt-0.5 line-clamp-2">{row.sourceText || "（无源文本）"}</div>
                  </div>
                  <span className="shrink-0 text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">{row.missing}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {msg && (
        <div className={`mt-4 p-3 rounded text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg.text}</div>
      )}
    </div>
  )
}
