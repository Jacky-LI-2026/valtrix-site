'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw, LayoutTemplate, ExternalLink } from 'lucide-react'

const DEFAULT_THEME = {
  primary: '#CC0000',
  primaryLight: '#FF3333',
  primaryDark: '#990000',
  accent: '#C0C0C0',
  dark: '#111111',
}

export default function ThemeSettingsPage() {
  const [form, setForm] = useState(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [currentTemplate, setCurrentTemplate] = useState<{ slug: string; name: string; style: any } | null>(null)

  useEffect(() => {
    fetch('/api/admin/theme')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setForm({
            primary: data.primary || DEFAULT_THEME.primary,
            primaryLight: data.primaryLight || DEFAULT_THEME.primaryLight,
            primaryDark: data.primaryDark || DEFAULT_THEME.primaryDark,
            accent: data.accent || DEFAULT_THEME.accent,
            dark: data.dark || DEFAULT_THEME.dark,
          })
          // 读取当前模板（templateSlug）并匹配预设
          if (data.templateSlug) {
            fetch('/api/admin/templates?mode=presets')
              .then(r => r.json())
              .then(pd => {
                if (pd?.ok && Array.isArray(pd.presets)) {
                  const preset = pd.presets.find((p: any) => p.slug === data.templateSlug)
                  if (preset) setCurrentTemplate({ slug: preset.slug, name: preset.name, style: preset.style })
                }
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setMessage('主题配置已保存，刷新前台页面后生效')
      } else {
        setMessage('保存失败')
      }
    } catch (error) {
      setMessage('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setForm(DEFAULT_THEME)
    setMessage('已恢复默认值，点击保存生效')
  }

  if (loading) {
    return <div className="text-gray-500">加载中...</div>
  }

  const colorFields = [
    { key: 'primary', label: '主色调', desc: '品牌主色，用于按钮、链接、强调' },
    { key: 'primaryLight', label: '主色亮', desc: '主色的亮色调，用于悬停、高亮' },
    { key: 'primaryDark', label: '主色暗', desc: '主色的暗色调，用于按下、深度' },
    { key: 'accent', label: '辅助色', desc: '辅助强调色，用于次要元素' },
    { key: 'dark', label: '深色', desc: '深色背景和文字' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">主题配色</h1>
        <p className="text-gray-500 mt-1">修改网站配色方案，保存后前台即时生效</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
          {message}
        </div>
      )}

      {currentTemplate && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <LayoutTemplate size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">当前模板：{currentTemplate.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {currentTemplate.style?.radius} 圆角 · {currentTemplate.style?.spacing} 间距 · {currentTemplate.style?.fontScale} 字号 · {currentTemplate.style?.shadow} 阴影 · {currentTemplate.style?.header} 头部
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => window.open(`/?__template=${currentTemplate.slug}`, '_blank', 'noopener')}
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm"
            >
              <ExternalLink size={14} /> 前台预览
            </button>
            <a
              href="/admin/templates"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm"
            >
              <LayoutTemplate size={14} /> 切换模板
            </a>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-2 gap-6">
          {colorFields.map(field => (
            <div key={field.key} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                <span className="text-gray-400 font-normal ml-2">{field.desc}</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* 预览 */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-4">实时预览</h3>
          <div className="flex items-center gap-4">
            <button
              className="px-4 py-2 rounded-md text-white text-sm font-medium"
              style={{ backgroundColor: form.primary }}
            >
              主要按钮
            </button>
            <button
              className="px-4 py-2 rounded-md text-white text-sm font-medium"
              style={{ backgroundColor: form.primaryLight }}
            >
              亮色按钮
            </button>
            <button
              className="px-4 py-2 rounded-md text-white text-sm font-medium"
              style={{ backgroundColor: form.primaryDark }}
            >
              暗色按钮
            </button>
            <span
              className="px-3 py-1 rounded text-sm"
              style={{ backgroundColor: form.accent + '33', color: form.dark }}
            >
              辅助标签
            </span>
            <span className="text-sm font-medium" style={{ color: form.dark }}>
              深色文字
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={16} />
            恢复默认
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: form.primary }}
          >
            <Save size={16} />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  )
}
