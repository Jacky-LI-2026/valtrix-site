'use client'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Languages, Plus, Trash2, Sparkles, X } from 'lucide-react'

export interface SpecRow {
  label: string // 中文参数名
  value: string // 中文参数值
  unit: string
  groupName: string
  // 多语言字段
  labelEn?: string
  labelJa?: string
  labelKo?: string
  labelFr?: string
  labelAr?: string
  valueEn?: string
  valueJa?: string
  valueKo?: string
  valueFr?: string
  valueAr?: string
}

interface Props {
  value: SpecRow[]
  onChange: (specs: SpecRow[]) => void
}

// 默认语言字段配置（未获取到启用语种时的回退）
const DEFAULT_LANG_FIELDS: { lang: string; suffix: string; label: string }[] = [
  { lang: 'en', suffix: 'En', label: '英文' },
  { lang: 'ja', suffix: 'Ja', label: '日文' },
  { lang: 'ko', suffix: 'Ko', label: '韩文' },
  { lang: 'fr', suffix: 'Fr', label: '法文' },
  { lang: 'ar', suffix: 'Ar', label: '阿拉伯文' },
]

// 每个参数行的展开状态
interface ExpandedState {
  [rowIdx: number]: boolean
}

export default function ProductSpecEditor({ value, onChange }: Props) {
  const specs = value || []
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [translating, setTranslating] = useState(false)
  const [translateMsg, setTranslateMsg] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiHint, setAiHint] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  // 启用的语种（从后端读取，被禁用的语种不显示翻译输入框）
  const [langFields, setLangFields] = useState(DEFAULT_LANG_FIELDS)

  // 加载启用的语种
  useEffect(() => {
    fetch('/api/public/languages')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const active = data
            .filter((l: any) => l.code && l.code !== 'zh')
            .map((l: any) => ({
              lang: l.code,
              suffix: l.code.charAt(0).toUpperCase() + l.code.slice(1),
              label: l.name || l.code,
            }))
          if (active.length > 0) setLangFields(active)
        }
      })
      .catch(() => {
        // 加载失败保持默认语种
      })
  }, [])

  const updateRow = (idx: number, patch: Partial<SpecRow>) => {
    onChange(specs.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }
  const removeRow = (idx: number) => onChange(specs.filter((_, i) => i !== idx))
  const addRow = () =>
    onChange([...specs, { label: '', value: '', unit: '', groupName: '' }])

  const toggleExpand = (idx: number) =>
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white'

  const langCls = inputCls + ' text-xs px-2 py-1.5'

  // 单条翻译
  const translateText = async (text: string, lang: string, capitalize: boolean): Promise<string> => {
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang: lang, capitalize }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.translatedText) return data.translatedText
      }
    } catch (e) {
      console.error('翻译失败:', e)
    }
    return text // 失败返回原文
  }

  // 一键翻译全部规格的中文 label/value 到 5 种语言
  const handleTranslateAll = async () => {
    if (specs.length === 0) return
    setTranslating(true)
    setTranslateMsg('')
    try {
      const result = [...specs]
      const total = specs.filter((s) => s.label.trim() || s.value.trim()).length
      let done = 0
      for (const lf of langFields) {
        for (let i = 0; i < result.length; i++) {
          const s = result[i]
          if (!s.label.trim() && !s.value.trim()) continue
          const patch: Partial<SpecRow> = {}
          if (s.label.trim()) {
            patch[('label' + lf.suffix) as keyof SpecRow] = await translateText(s.label.trim(), lf.lang, true)
          }
          if (s.value.trim()) {
            patch[('value' + lf.suffix) as keyof SpecRow] = await translateText(s.value.trim(), lf.lang, false)
          }
          result[i] = { ...s, ...patch }
          done++
          setTranslateMsg(`翻译中... ${lf.label} ${done}/${total * langFields.length}`)
        }
      }
      onChange(result)
      setTranslateMsg('全部语言翻译完成')
    } finally {
      setTranslating(false)
    }
  }

  // AI 生成规格：基于产品名/型号自动生成技术规格数组
  const handleAiGenerate = async () => {
    setAiBusy(true)
    setAiMsg('')
    try {
      const r = await fetch('/api/ai/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'spec_generate',
          action: 'generate_json',
          label: '产品技术规格',
          prompt: `请生成该设备/产品的技术规格列表 JSON 数组，数组元素结构为 {"label":"参数名","value":"参数值","unit":"单位"}，8-14 项，覆盖设备核心参数（如型号、腔体尺寸、功率、温度、真空度、均匀性、控制方式、安全特性等），只输出数组本身。产品描述：${aiHint || '通用高端工业设备'}`,
        }),
      })
      const d = await r.json()
      if (!d.ok) { setAiMsg(d.error || 'AI 调用失败'); return }
      // 提取 JSON 数组（容忍 AI 偶尔带 ```json 包裹）
      let raw = (d.result || '').trim()
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) throw new Error('返回格式不是数组')
      const rows: SpecRow[] = arr
        .filter((x: any) => x && typeof x.label === 'string' && x.label.trim())
        .map((x: any) => ({
          label: x.label.trim(),
          value: x.value != null ? String(x.value) : '',
          unit: x.unit ? String(x.unit) : '',
          groupName: x.groupName ? String(x.groupName) : '',
        }))
      if (!rows.length) throw new Error('没有有效参数')
      onChange(rows)
      setAiMsg(`已生成 ${rows.length} 项技术规格`)
    } catch (e: any) {
      setAiMsg('AI 生成失败：' + (e?.message || '返回内容无法解析为规格'))
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          技术规格（前台详情页展示）
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            className="inline-flex items-center gap-1 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md font-medium"
            title="AI 根据产品信息自动生成技术规格"
          >
            <Sparkles size={15} />
            AI 生成规格
          </button>
          <button
            type="button"
            onClick={handleTranslateAll}
            disabled={translating || specs.length === 0}
            className="inline-flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-md font-medium"
          >
            <Languages size={15} />
            {translating ? '翻译中...' : '一键翻译全部规格'}
          </button>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            <Plus size={16} /> 添加参数
          </button>
        </div>
      </div>

      {aiOpen && (
        <div className="mb-3 rounded-lg border border-purple-100 bg-purple-50/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
              <Sparkles size={12} /> AI 生成技术规格
            </span>
            <button type="button" onClick={() => setAiOpen(false)} className="text-gray-400 hover:text-gray-600" title="关闭">
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={aiHint}
            onChange={(e) => setAiHint(e.target.value)}
            placeholder="输入产品名称/型号/用途，如：不锈钢闸阀 HG-Z41H-16C DN50"
            className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiBusy}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs hover:bg-purple-700 disabled:opacity-50"
            >
              {aiBusy ? '生成中…' : '生成并填入'}
            </button>
            {aiMsg && <span className="text-xs text-gray-500">{aiMsg}</span>}
          </div>
        </div>
      )}

      {translateMsg && <p className="text-xs text-blue-600 mb-2">{translateMsg}</p>}

      {specs.length === 0 ? (
        <div className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-300 rounded-md">
          暂无技术规格，点击「添加参数」开始
        </div>
      ) : (
        <div className="space-y-2">
          {/* 表头 */}
          <div className="grid grid-cols-12 gap-2 px-3 text-xs text-gray-400">
            <span className="col-span-2">分组（可选）</span>
            <span className="col-span-3">参数名（中文）</span>
            <span className="col-span-4">参数值（中文）</span>
            <span className="col-span-1">单位</span>
            <span className="col-span-1"></span>
            <span className="col-span-1"></span>
          </div>
          {specs.map((s, idx) => {
            const isExpanded = !!expanded[idx]
            return (
              <div key={idx} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className={inputCls + ' col-span-2'}
                    placeholder="如 电气参数"
                    value={s.groupName}
                    onChange={(e) => updateRow(idx, { groupName: e.target.value })}
                  />
                  <input
                    className={inputCls + ' col-span-3'}
                    placeholder="参数名，如 电源"
                    value={s.label}
                    onChange={(e) => updateRow(idx, { label: e.target.value })}
                  />
                  <input
                    className={inputCls + ' col-span-4'}
                    placeholder="参数值，如 380V 三相五线"
                    value={s.value}
                    onChange={(e) => updateRow(idx, { value: e.target.value })}
                  />
                  <input
                    className={inputCls + ' col-span-1'}
                    placeholder="单位"
                    value={s.unit}
                    onChange={(e) => updateRow(idx, { unit: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => toggleExpand(idx)}
                    className="col-span-1 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title={isExpanded ? '收起多语言' : '展开多语言编辑'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="col-span-1 p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="删除该行"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* 多语言展开面板 */}
                {isExpanded && (
                  <div className="ml-2 border border-blue-100 bg-blue-50/50 rounded-md p-3 space-y-2">
                    <div className="grid gap-2 items-center" style={{ gridTemplateColumns: '110px repeat(' + langFields.length + ', 1fr)' }}>
                      <span className="text-xs font-medium text-gray-500">参数名多语言</span>
                      {langFields.map((lf) => (
                        <input
                          key={'l' + lf.lang}
                          className={langCls}
                          placeholder={lf.label}
                          value={(s as any)['label' + lf.suffix] || ''}
                          onChange={(e) => updateRow(idx, { ['label' + lf.suffix]: e.target.value } as any)}
                        />
                      ))}
                    </div>
                    <div className="grid gap-2 items-center" style={{ gridTemplateColumns: '110px repeat(' + langFields.length + ', 1fr)' }}>
                      <span className="text-xs font-medium text-gray-500">参数值多语言</span>
                      {langFields.map((lf) => (
                        <input
                          key={'v' + lf.lang}
                          className={langCls}
                          placeholder={lf.label}
                          value={(s as any)['value' + lf.suffix] || ''}
                          onChange={(e) => updateRow(idx, { ['value' + lf.suffix]: e.target.value } as any)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3">
        留空的参数行保存时会自动忽略；展开每行可分别填写 5 种语言，或点击「一键翻译全部规格」自动翻译。前台会自动回退到中文显示未翻译的内容。
      </p>
    </div>
  )
}
