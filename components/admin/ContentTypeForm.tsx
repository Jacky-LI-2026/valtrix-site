'use client'

/**
 * 通用内容表单（Content Type Form）
 * =====================================================
 * 由内容类型注册表驱动：按字段配置自动渲染多语言字段（MultiLangFormField）、
 * 单语字段（图片/开关/数字/下拉/日期）、一键翻译（AutoTranslateBar）、
 * SEO/GEO（SeoGeoConfig，enableSeo 类型）。新建/编辑共用。
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getContentType, ContentField, ContentTypeConfig } from '@/lib/content-types/registry'
import { expandFieldsToForm } from '@/lib/content-types/dynamic'
import { useAdminForm } from '@/lib/use-admin-form'
import { serializeJsonFields, deserializeJsonFields, MultiLangFieldConfig, maxLengthByLangOf } from '@/lib/admin-form'
import CharCounter from './CharCounter'
import MultiLangFormField from './MultiLangFormField'
import AutoTranslateBar from './AutoTranslateBar'
import SeoGeoConfig from './SeoGeoConfig'
import UrlUploadInput from './UrlUploadInput'
import AiImagePicker from './AiImagePicker'
import ProductSpecEditor, { SpecRow } from './ProductSpecEditor'
import ThreeSixtyUpload from './ThreeSixtyUpload'
import { Sparkles, Upload, Loader2 } from 'lucide-react'

interface Props {
  typeName: string
  initialId?: string
  /** 服务端已解析的类型配置（动态类型由 DB 读取后传入，静态类型可省略走 getContentType） */
  cfg?: ContentTypeConfig
}

function defaultSingleValue(f: ContentField): any {
  switch (f.kind) {
    case 'boolean': return false
    case 'number': return 0
    case 'select': return f.options?.[0]?.value ?? ''
    case 'datetime': return ''
    case 'frames360': return null
    default: return ''
  }
}

/** gallery 元素归一化成 URL（库里可能是字符串，也可能是 {url} 对象） */
function galleryToUrl(x: any): string {
  if (!x) return ''
  if (typeof x === 'string') return x
  if (Array.isArray(x)) return galleryToUrl(x[0])
  if (typeof x === 'object') return typeof x.url === 'string' ? x.url : ''
  return ''
}

/**
 * 图集编辑器（gallery 单语数组）：URL 输入 + **本地上传** + 预览 + 删除。
 * owner 2026-10-03：「为何没有上传按钮」—— 本仓此前是 fork 早期版本，只有"填 URL"这一条路，
 *   现与基地（左文）对齐：支持多选图片直传 `/api/admin/upload`，上传后自动追加到图集。
 */
function GalleryEditor({ value, onChange }: { value: any[]; onChange: (arr: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const urls = (Array.isArray(value) ? value : []).map(galleryToUrl).filter(Boolean)

  const add = () => {
    const u = draft.trim()
    if (!u) return
    onChange([...urls, u])
    setDraft('')
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    setErr('')
    const added: string[] = []
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success && data?.url) added.push(data.url)
        else setErr(data?.error || `「${file.name}」上传失败`)
      }
      if (added.length) onChange([...urls, ...added])
    } catch {
      setErr('上传失败，请重试')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = '' // 允许重复选择同一文件
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="/uploads/xxx.webp 或 https://...（回车添加）"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500"
        />
        <button type="button" onClick={add}
          className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-200 whitespace-nowrap">
          添加
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-60 whitespace-nowrap">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? '上传中' : '上传图片'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      {urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <div key={i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`图${i + 1}`} className="h-20 w-24 object-cover rounded border border-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.25' }} />
              <button type="button" onClick={() => onChange(urls.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** 简单 JSON 数组编辑器（如阶梯价）：按 jsonFields 渲染行输入，值序列化为 JSON 字符串 */
function JsonArrayEditor({ value, fields }: { value: any; fields: { key: string; label: string }[] }) {
  const [rows, setRows] = useState<any[]>(() => {
    try {
      const arr = typeof value === 'string' ? JSON.parse(value) : (Array.isArray(value) ? value : []);
      return Array.isArray(arr) ? arr : [];
    } catch { return [] }
  })
  useEffect(() => { setRows(rows) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const update = (next: any[]) => setRows(next)
  const commit = (next: any[]) => {
    update(next)
    try {
      const el = document.getElementById('__jsonarray_' + fields.map(f=>f.key).join('_'))
      if (el) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
        setter.call(el, JSON.stringify(next))
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
    } catch { /* ignore */ }
  }
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 mb-2 items-center">
          {fields.map((f) => (
            <input
              key={f.key}
              type="number"
              value={r[f.key] ?? ''}
              placeholder={f.label}
              onChange={(e) => { const next = rows.map((x, xi) => xi === i ? { ...x, [f.key]: Number(e.target.value) || 0 } : x); commit(next) }}
              className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          ))}
          <button type="button" onClick={() => commit(rows.filter((_, xi) => xi !== i))}
            className="text-red-500 text-xs px-2">删除</button>
        </div>
      ))}
      <button type="button" onClick={() => commit([...rows, {}])}
        className="text-xs text-red-600 border border-red-200 rounded px-2.5 py-1 hover:bg-red-50">
        + 添加档位
      </button>
      <input id={'__jsonarray_' + fields.map(f=>f.key).join('_')} type="hidden"
        value={JSON.stringify(rows)}
        onChange={(e) => { try { update(JSON.parse(e.target.value || '[]')) } catch { /* ignore */ } }} />
    </div>
  )
}

/** AI 占位配图（受 image_placeholder 功能点控制）：输入关键词 → 免费占位图 URL → 填入 */
function AiPlaceholderButton({ label, onPick }: { label: string; onPick: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [size, setSize] = useState('1600x900')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const run = async () => {
    setBusy(true); setMsg('')
    try {
      const [w, h] = size.split('x').map(Number)
      const r = await fetch('/api/ai/placeholder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword || label, w, h }),
      })
      const d = await r.json()
      if (!d.ok) { setMsg(d.error || '调用失败'); return }
      onPick(d.url)
      setOpen(false)
    } catch (e: any) {
      setMsg(e.message || '网络异常')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMsg(''); if (!keyword) setKeyword(label) }}
        title="AI 占位配图（免费随机占位图，受 AI 开关矩阵控制）"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border border-red-200 text-red-600 hover:bg-red-50">
        <Sparkles size={13} /> 占位配图
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Sparkles size={16} className="text-red-600" /> AI 占位配图 · {label}</h4>
            <p className="text-xs text-gray-500 mt-1">按主题关键词生成免费占位图（随机图源）；语义 AI 生图待接入服务商</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="text-sm">
                <label className="block text-gray-600 mb-1">主题关键词</label>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="如：工业阀门 / 流体控制设备"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="text-sm">
                <label className="block text-gray-600 mb-1">尺寸</label>
                <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
                  <option value="1600x900">横版 1600×900</option>
                  <option value="1920x1080">横版 1920×1080</option>
                  <option value="1024x1024">方形 1024×1024</option>
                  <option value="900x1600">竖版 900×1600</option>
                  <option value="800x600">小图 800×600</option>
                </select>
              </div>
            </div>
            {msg && <p className="mt-2 text-xs text-red-500">{msg}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button type="button" onClick={run} disabled={busy}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">{busy ? '生成中...' : '生成并填入'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** AI 写作助手（多语言字段通用）：写 / 润色 / 摘要，回填到指定字段的指定语种 */
function AiWriterAssistant({ fields, form, onChange }: { fields: MultiLangFieldConfig[]; form: any; onChange: (name: string, v: string) => void }) {
  const LANGS = [{ v: 'zh', l: '中文' }, { v: 'en', l: 'English' }, { v: 'ja', l: '日本語' }, { v: 'ko', l: '한국어' }, { v: 'fr', l: 'Français' }, { v: 'ar', l: 'العربية' }]
  const [open, setOpen] = useState(false)
  const [field, setField] = useState('')
  const [lang, setLang] = useState('zh')
  const [mode, setMode] = useState<'generate' | 'polish' | 'summary'>('generate')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const fieldLangKey = (base: string, l: string) => (l === 'zh' ? base : base + l[0].toUpperCase() + l.slice(1))
  const f = fields.find((x) => x.name === field)
  const currentValue = f ? String(form[fieldLangKey(field, lang)] || '') : ''
  const langLabel = LANGS.find((x) => x.v === lang)?.l || lang

  const run = async () => {
    if (!f) return
    setBusy(true); setMsg('')
    try {
      const featureMap = { generate: 'editor_generate', polish: 'editor_polish', summary: 'editor_summary' } as const
      const r = await fetch('/api/ai/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: featureMap[mode], action: mode, label: (f.label || field) + ' · ' + langLabel, text: currentValue, prompt: prompt || undefined }),
      })
      const d = await r.json()
      if (!d.ok) { setMsg(d.error || '调用失败'); return }
      onChange(fieldLangKey(field, lang), d.result)
      setOpen(false); setMsg('')
    } catch (e: any) {
      setMsg(e.message || '网络异常')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMsg(''); if (!field && fields[0]) setField(fields[0].name) }}
        title="AI 写作助手（写 / 润色 / 摘要，受 AI 开关矩阵控制）"
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs border border-red-200 text-red-600 hover:bg-red-50 whitespace-nowrap">
        <Sparkles size={13} /> AI 写作助手
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Sparkles size={16} className="text-red-600" /> AI 写作助手</h4>
            <p className="text-xs text-gray-500 mt-1">写文章 / 润色 / 摘要，受「系统设置 → AI 开关矩阵」控制</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="text-sm">
                <label className="block text-gray-600 mb-1">目标字段</label>
                <select value={field} onChange={(e) => setField(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
                  {fields.map((x) => <option key={x.name} value={x.name}>{x.label}</option>)}
                </select>
              </div>
              <div className="text-sm">
                <label className="block text-gray-600 mb-1">语种</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
                  {LANGS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {([['generate', '写文章'], ['polish', '润色'], ['summary', '摘要/SEO']] as const).map(([m, t]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={'px-3 py-1.5 rounded-md text-xs border ' + (mode === m ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}>{t}</button>
              ))}
            </div>
            {currentValue && <div className="mt-3 max-h-20 overflow-auto rounded-md bg-gray-50 p-2 text-xs text-gray-500 whitespace-pre-wrap">当前值：{currentValue.slice(0, 200)}{currentValue.length > 200 ? '…' : ''}</div>}
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
              placeholder={'补充写作要求（选填）' + (currentValue ? '，已有内容将作为润色/摘要输入' : '')}
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500" />
            {msg && <p className="mt-2 text-xs text-red-500">{msg}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button type="button" onClick={run} disabled={busy || !f}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">{busy ? '生成中...' : '开始生成'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** AI 写作按钮（受「AI 开关矩阵」功能点开关控制：editor_generate/editor_polish/editor_summary） */
function AiFieldButton({ label, value, onResult }: { label: string; value: string; onResult: (v: string) => void }) {  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'generate' | 'polish' | 'summary'>('generate')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const run = async () => {
    setBusy(true); setMsg('')
    try {
      const featureMap = { generate: 'editor_generate', polish: 'editor_polish', summary: 'editor_summary' } as const
      const r = await fetch('/api/ai/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: featureMap[mode],
          action: mode,
          label,
          text: value,
          prompt: prompt || undefined,
        }),
      })
      const d = await r.json()
      if (!d.ok) { setMsg(d.error || '调用失败'); return }
      onResult(d.result)
      setOpen(false)
      setMsg('已生成并填入字段')
      setTimeout(() => setMsg(''), 2500)
    } catch (e: any) {
      setMsg(e.message || '网络异常')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMsg('') }}
        title="AI 生成 / 润色 / 摘要（开关矩阵控制）"
        className="flex items-center gap-1 px-2.5 py-2 rounded-md text-xs border border-red-200 text-red-600 hover:bg-red-50 whitespace-nowrap">
        <Sparkles size={13} /> AI
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Sparkles size={16} className="text-red-600" /> AI 写作 · {label}</h4>
            <div className="mt-3 flex gap-2">
              {([['generate', '写文章'], ['polish', '润色'], ['summary', '摘要/SEO']] as const).map(([m, t]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-md text-xs border ${mode === m ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {t}
                </button>
              ))}
            </div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
              placeholder={`补充写作要求（选填）。当前字段：${label}${value ? '，已有内容将作为润色/摘要输入' : ''}`}
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500" />
            {msg && <p className={`mt-2 text-xs ${msg.includes('已生成') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button type="button" onClick={run} disabled={busy}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                {busy ? '生成中...' : '开始生成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function ContentTypeForm({ typeName, initialId, cfg: cfgProp }: Props) {
  const router = useRouter()
  const cfg = cfgProp || getContentType(typeName)
  const [loading, setLoading] = useState(!!initialId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [relationOptions, setRelationOptions] = useState<Record<string, { value: string; label: string }[]>>({})
  /**
   * 各列的字数上限（`{ name:200, subtitleFr:500, seoTitle:200, … }`）
   * 来源：`/api/admin/content/[type]/meta` —— 服务端读 `prisma/schema.prisma` 的 VarChar 宽度。
   * 用途：输入框旁显示「已用 x / 上限 y」+ 输入框 `maxLength` 硬限制（owner 2026-09-20 要求，左文/阀门同步）。
   */
  const [limits, setLimits] = useState<Record<string, number>>({})

  const multiLangFields = (cfg?.fields || []).filter((f) => f.multiLang) as MultiLangFieldConfig[]
  const singleFields = (cfg?.fields || []).filter((f) => !f.multiLang)
  const hasRelation = (cfg?.fields || []).some((f) => f.kind === 'relation')

  // 版面分组：左栏 = 主内容（文本/长文本/富文本/数组），右栏 = 发布设置（媒体/开关/数字/下拉/关联/日期/Slug）
  const MAIN_KINDS = ['text', 'textarea', 'richtext', 'stringArray', 'jsonArray']
  const mainFields = multiLangFields.filter((f) => MAIN_KINDS.includes(f.kind || 'text'))
  const sideFields = singleFields.filter((f) => !['text'].includes(f.kind || ''))
  // 产品增强：技术规格（productSpecs 关联表）
  const isProduct = typeName === 'products'
  const [specs, setSpecs] = useState<SpecRow[]>([])

  const { form, setForm, handleChange, handleValuesChange, getLangValues, buildFieldMap, getFormValues, updateFormValue } =
    useAdminForm<any>({} as any, multiLangFields)

  // 加载关联下拉选项
  // 加载关联下拉选项 + 字段字数上限
  useEffect(() => {
    let active = true
    fetch(`/api/admin/content/${typeName}/meta`)
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data) return
        if (data.relations) setRelationOptions(data.relations)
        if (data.limits) setLimits(data.limits)
      })
      .catch(() => {})
    return () => { active = false }
  }, [typeName])

  // 编辑模式：加载详情
  useEffect(() => {
    if (!initialId) return
    let active = true
    fetch(`/api/admin/content/${typeName}/${initialId}`)
      .then((r) => r.json())
      .then((data) => {
        if (active && data && !data.error) {
          if (cfgProp) {
            // 动态类型：字段已由 serializeItem 展开到顶层（多语言为 {zh,en,...} 对象），展开为表单后缀键
            //
            // 🔴 2026-09-18 修复：**必须用「合并」而不是「整体替换」**。
            //   `useAdminForm` 初始化时已把「所有多语言字段 × 所有语种」的键展开进 form
            //   （例如 descriptionJa、titleEn）；而这里若替换为 `expanded`，一旦 `expanded`
            //   未覆盖某个语种键（例如内置类型的扁平列形态），该键就会**从表单里消失** ⇒
            //     · 各语种 Tab 显示为空；
            //     · 字段级「重新翻译为X」按钮写回时被 useAdminForm.handleValuesChange 的
            //       `if (fieldName in next)` 守卫**静默丢弃**（顶部「一键翻译全部」不受影响）。
            //   合并可保证「预展开的语种键」始终存在，是对上面那类数据形态问题的第二道防线。
            const expanded = expandFieldsToForm(cfgProp, data)
            setForm((prev: any) => ({
              ...prev,
              ...expanded,
              status: data.status || 'published',
              sortOrder: data.sortOrder ?? 0,
              title: data.title || '',
              slug: data.slug || '',
            }))
          } else {
            setForm(deserializeJsonFields(data, (cfg?.fields || []) as MultiLangFieldConfig[]))
          }
          // 产品增强：加载 specs 规格（productSpecs 关联表）
          if (isProduct && Array.isArray(data?.productSpecs)) {
            setSpecs(data.productSpecs.map((s: any) => ({
              label: s.label || '', value: s.value || '', unit: s.unit || '', groupName: s.groupName || '',
              labelEn: s.labelEn || undefined, labelJa: s.labelJa || undefined, labelKo: s.labelKo || undefined, labelFr: s.labelFr || undefined, labelAr: s.labelAr || undefined,
              valueEn: s.valueEn || undefined, valueJa: s.valueJa || undefined, valueKo: s.valueKo || undefined, valueFr: s.valueFr || undefined, valueAr: s.valueAr || undefined,
            })))
          }
        }
      })
      .catch(() => setError('加载数据失败'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [initialId, typeName, setForm])

  if (!cfg) return <div className="text-red-600">未知内容类型：{typeName}</div>
  if (loading) return <div className="text-gray-500 py-8">加载中...</div>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload: any = serializeJsonFields({ ...form }, cfg.fields as MultiLangFieldConfig[])
      // 产品增强：附带 specs（后端 service 事务同步 productSpecs 表）
      if (isProduct) payload.specs = specs
      const url = initialId ? `/api/admin/content/${typeName}/${initialId}` : `/api/admin/content/${typeName}`
      const res = await fetch(url, {
        method: initialId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存失败')
      router.push(`/admin/content/${typeName}`)
    } catch (err: any) {
      setError(err.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 顶部操作条（sticky） */}
      <div className="sticky top-0 z-30 -mx-6 px-6 py-3 bg-white/90 backdrop-blur border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {initialId ? '编辑' : '新增'}{cfg.label}
        </h1>
        <div className="flex gap-2">
          {error && <span className="text-red-600 text-sm self-center">{error}</span>}
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
          >返回</button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
          >{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>

      {/* 工具栏：一键翻译 + AI 写作助手 */}
      {multiLangFields.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 py-4">
          <div className="flex-1 min-w-[260px]">
            <AutoTranslateBar
              fieldMap={buildFieldMap()}
              getFormValues={getFormValues}
              updateFormValue={updateFormValue}
            />
          </div>
          <AiWriterAssistant fields={multiLangFields} form={form} onChange={(name, v) => handleChange(name, v)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-8">
        {/* 左栏：主内容 */}
        <div className="lg:col-span-3 space-y-6 min-w-0">
          {mainFields.map((f) => (
            <MultiLangFormField
              key={f.name}
              /* 带上该字段各语种的字数上限（数据库列宽）→ 输入框 maxLength + 「已用 x / 上限 y」 */
              config={{ ...f, maxLengthByLang: maxLengthByLangOf(limits, f.name) }}
              form={form}
              onValuesChange={handleValuesChange}
              getLangValues={getLangValues}
            />
          ))}
          {/* 单语 text（如 Slug / 作者 / 来源 等短文本）跟随左栏 */}
          {singleFields.filter((f) => f.kind === 'text').map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form[f.name] || ''}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  maxLength={limits[f.name]}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <AiFieldButton label={f.label} value={form[f.name] || ''} onResult={(v) => handleChange(f.name, v)} />
              </div>
              {/* 有数据库上限时显示「已用 x / 上限 y」（Slug / 型号 / 作者 这类短文本列） */}
              <div className="mt-1 flex justify-end">
                <CharCounter value={form[f.name] || ''} max={limits[f.name]} />
              </div>
            </div>
          ))}

          {/* 产品增强：技术规格（productSpecs） */}
          {isProduct && (
            <div>
              <ProductSpecEditor value={specs} onChange={setSpecs} />
            </div>
          )}
        </div>

        {/* 右栏：发布设置 */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* 媒体图 */}
          {sideFields.filter((f) => f.kind === 'image').map((f) => (
            <div key={f.name} className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
              <UrlUploadInput
                value={form[f.name] || ''}
                onChange={(v) => handleChange(f.name, v)}
                accept="image/*"
                showPreview
                placeholder="/uploads/xxx.webp"
              />
              <div className="mt-1.5 flex flex-wrap gap-2">
                <AiPlaceholderButton onPick={(url) => handleChange(f.name, url)} label={f.label} />
                <AiImagePicker value={form[f.name] || ''} onResult={(url) => handleChange(f.name, url)} />
              </div>
            </div>
          ))}
          {sideFields.filter((f) => f.kind === 'gallery').map((f) => (
            <div key={f.name} className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
              <GalleryEditor
                value={Array.isArray(form[f.name]) ? form[f.name] : []}
                onChange={(arr) => setForm((prev: any) => ({ ...prev, [f.name]: arr }))}
              />
            </div>
          ))}
          {/* 360° 环拍（frames360：单语 JSON 对象 {template,totalFrames,startIndex}）
              —— owner 2026-10-03：「为何没有 360」：本仓 fork 早于该功能，字段在注册表里声明了
                 但表单从不渲染 ⇒ 后台根本改不了。此处与基地（左文）对齐。
              上传帧图 → /api/admin/upload（带 path，自动命名 Frame000001.webp）→ 回写路径模板。
              前台 ProductDetailClient 兼容 path / template 两种键名。 */}
          {sideFields.filter((f) => f.kind === 'frames360').map((f) => {
            const raw = form[f.name]
            const v = raw && typeof raw === 'object' ? (raw as any) : {}
            return (
              <div key={f.name} className="bg-white rounded-lg border border-gray-200 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                <ThreeSixtyUpload
                  value={typeof v.template === 'string' ? v.template : typeof v.path === 'string' ? v.path : ''}
                  totalFrames={Number(v.totalFrames ?? v.count ?? 60) || 60}
                  startIndex={Number(v.startIndex ?? 1) || 1}
                  // 每产品独立存储目录 /uploads/360/<型号>/（旧版未传 ⇒ 所有产品共用 product/ 目录）
                  productModel={String(form.model || form.slug || '')}
                  onChange={(template, totalFrames, startIndex) =>
                    setForm((prev: any) => ({
                      ...prev,
                      [f.name]: template ? { template, totalFrames, startIndex } : null,
                    }))
                  }
                />
              </div>
            )
          })}
          {sideFields.filter((f) => f.kind === 'video').map((f) => (
            <div key={f.name} className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
              <UrlUploadInput
                value={form[f.name] || ''}
                onChange={(v) => handleChange(f.name, v)}
                accept="video/*"
                showPreview={false}
                placeholder="/uploads/xxx.mp4 或 https://..."
              />
            </div>
          ))}

          {/* 属性区：状态 / 排序 / 布尔 / 下拉 / 关联 / 日期 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">发布设置</h3>
            {sideFields.filter((f) => ['select', 'boolean', 'number', 'relation', 'datetime', 'jsonArray'].includes(f.kind || '')).map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                {f.kind === 'jsonArray' && (
                  <div>
                    <JsonArrayEditor value={form[f.name]} fields={(f as any).jsonFields || [{ key: 'qty', label: '数量' }, { key: 'price', label: '价格' }]} />
                    {f.placeholder && <p className="mt-1 text-xs text-gray-400">{f.placeholder}</p>}
                  </div>
                )}
                {f.kind === 'boolean' && (
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form[f.name]}
                      onChange={(e) => handleChange(f.name, e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-600">启用</span>
                  </label>
                )}
                {f.kind === 'number' && (
                  <input
                    type="number"
                    value={form[f.name] ?? defaultSingleValue(f)}
                    onChange={(e) => handleChange(f.name, Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                )}
                {f.kind === 'select' && (
                  <select
                    value={form[f.name] ?? defaultSingleValue(f)}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
                {f.kind === 'relation' && (
                  <select
                    value={form[f.name] != null ? String(form[f.name]) : ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">{f.required ? '请选择...' : '（无）'}</option>
                    {(relationOptions[f.name] || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
                {f.kind === 'datetime' && (
                  <input
                    type="date"
                    value={form[f.name] ? String(form[f.name]).slice(0, 10) : ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                )}
              </div>
            ))}
          </div>

          {/* SEO / GEO */}
          {cfg.enableSeo && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <SeoGeoConfig
                seoTitle={form.seoTitle || ''}
                seoTitleEn={form.seoTitleEn || ''}
                seoDescription={form.seoDescription || ''}
                seoDescriptionEn={form.seoDescriptionEn || ''}
                seoKeywords={form.seoKeywords || ''}
                seoKeywordsEn={form.seoKeywordsEn || ''}
                geoRegion={form.geoRegion || ''}
                geoCity={form.geoCity || ''}
                onChange={(field, value) => handleChange(field, value)}
                /* SEO 标题这类 VarChar 列的字数上限（keyword/描述/城市是 Text 列，无上限） */
                maxLengthByField={{ seoTitle: limits.seoTitle, seoTitleEn: limits.seoTitleEn }}
                /* 整个表单：多语种 SEO 区（seoTitleEn/Ja/Ko/Fr/Ar 等）直接从 form 读写 */
                form={form}
                /* 关键词"内容提取"的来源文本：不同内容类型的正文字段名不同（产品=description、新闻/案例=content、FAQ=answer） */
                sourceText={form.description || form.content || form.answer || ''}
                sourceTitle={form[cfg.titleField] || ''}
                sourceSummary={form.summary || ''}
              />
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
