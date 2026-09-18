'use client'

import { useState } from 'react'
import { Sparkles, Wand2, FileText, X } from 'lucide-react'

interface AiTextButtonProps {
  /** 字段标签，用于 AI 提示（如「产品副标题」） */
  label: string
  /** 当前中文值（作为润色/摘要输入） */
  value?: string
  /** AI 结果回填（写入当前字段中文值） */
  onApply: (text: string) => void
  /** 小尺寸（inline 图标按钮） */
  compact?: boolean
}

/**
 * 通用 AI 文本按钮（生成 / 润色 / 摘要）
 * 供各内容模块 text/textarea 字段调用，作用于字段中文值。
 * 走 /api/ai/feature 统一通道（受 AI 开关矩阵控制）。
 */
export default function AiTextButton({ label, value = '', onApply, compact }: AiTextButtonProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'generate' | 'polish' | 'summary'>('generate')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const run = async () => {
    setLoading(true)
    setMsg('')
    try {
      const featureMap = { generate: 'editor_generate', polish: 'editor_polish', summary: 'editor_summary' }
      const r = await fetch('/api/ai/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: featureMap[mode],
          action: mode,
          label,
          text: value,
          prompt: hint || undefined,
        }),
      })
      const d = await r.json()
      if (!d.ok) {
        setMsg(d.error || 'AI 调用失败')
        return
      }
      onApply(d.result || '')
      setMsg('已生成并填入字段（中文）')
    } catch (e: any) {
      setMsg(e?.message || 'AI 调用失败')
    } finally {
      setLoading(false)
    }
  }

  const modes: { key: typeof mode; icon: any; text: string }[] = [
    { key: 'generate', icon: Sparkles, text: '生成' },
    { key: 'polish', icon: Wand2, text: '润色' },
    { key: 'summary', icon: FileText, text: '摘要/SEO' },
  ]

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact
          ? 'inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors'
          : 'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors'}
        title={`AI ${label}`}
      >
        <Sparkles size={compact ? 12 : 14} />
        AI
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-red-100 bg-red-50/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => { setMode(m.key); setMsg('') }}
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors ${
                mode === m.key ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-red-300'
              }`}
            >
              <m.icon size={12} />
              {m.text}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600" title="关闭">
          <X size={16} />
        </button>
      </div>
      <input
        type="text"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder={'补充写作要求（选填）' + (value ? '，已有内容将作为输入' : '')}
        className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none mb-2"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? '处理中…' : '执行'}
        </button>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
    </div>
  )
}
