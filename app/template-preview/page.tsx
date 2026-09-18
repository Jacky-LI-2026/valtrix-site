'use client'

import { useState } from 'react'
import { TEMPLATE_PRESETS } from '@/lib/templates/presets'
import { Monitor, Tablet, Smartphone, ExternalLink, Paintbrush, Palette, LayoutGrid, Type, SlidersHorizontal, RotateCcw, Save } from 'lucide-react'

const DEVICE_WIDTHS = [
  { key: 'desktop', label: '桌面', icon: Monitor, width: '100%' },
  { key: 'tablet', label: '平板', icon: Tablet, width: '768px' },
  { key: 'mobile', label: '手机', icon: Smartphone, width: '390px' },
]

export default function TemplatePreviewPage() {
  const [active, setActive] = useState(TEMPLATE_PRESETS[1]?.slug || TEMPLATE_PRESETS[0]?.slug)
  const [device, setDevice] = useState('desktop')
  // 微调参数（应用到预览 URL，仅本次预览生效）
  const [tune, setTune] = useState<{ primary?: string; radius?: string; spacing?: string; fontScale?: string; shadow?: string }>({})
  const activePreset = TEMPLATE_PRESETS.find((t) => t.slug === active) || TEMPLATE_PRESETS[0]
  const activeWidth = DEVICE_WIDTHS.find((d) => d.key === device)?.width || '100%'

  // 组装预览 URL：模板 + 微调参数
  const previewUrl = `/?__template=${active}${
    tune.primary ? `&__primary=${encodeURIComponent(tune.primary)}` : ''
  }${
    tune.radius ? `&__radius=${tune.radius}` : ''
  }${
    tune.spacing ? `&__spacing=${tune.spacing}` : ''
  }${
    tune.fontScale ? `&__fontScale=${tune.fontScale}` : ''
  }${
    tune.shadow ? `&__shadow=${encodeURIComponent(tune.shadow)}` : ''
  }`

  // 保存微调为新模板（需后台登录）
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const saveAsTemplate = async () => {
    setSaving(true); setSaveMsg('')
    const tpl = {
      name: `${activePreset.name}（微调版）`,
      slug: `${activePreset.slug}-custom`,
      version: '1.0.0',
      description: `由「${activePreset.name}」微调生成：${tune.primary ? '主色 ' + tune.primary + '；' : ''}${tune.radius ? '圆角 ' + tune.radius + 'px；' : ''}${tune.spacing ? '间距 ' + tune.spacing + 'px；' : ''}${tune.fontScale ? '字号缩放 ' + tune.fontScale + '；' : ''}`,
      config: {
        ...activePreset,
        theme: { ...activePreset.theme, primary: tune.primary || activePreset.theme.primary },
        style: {
          ...activePreset.style,
          radiusCss: tune.radius ? tune.radius + 'px' : undefined,
          spacingCss: tune.spacing ? tune.spacing + 'px' : undefined,
          fontScaleValue: tune.fontScale ? Number(tune.fontScale) : undefined,
        },
      },
      isDefault: false,
      isActive: false,
    }
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tpl),
      })
      if (res.status === 401 || res.status === 307) {
        setSaveMsg('需先登录后台（管理员账号）才能保存模板，将跳转登录页…')
        setTimeout(() => { window.location.href = '/admin/login?callbackUrl=/admin/templates' }, 1500)
        return
      }
      const data = await res.json()
      if (data.ok || data.success) {
        setSaveMsg('已保存为模板「' + tpl.name + '」，可在后台「模板管理」中应用')
      } else {
        setSaveMsg('保存失败：' + (data.error || 'slug 可能已存在，请先在后台删除同名模板'))
      }
    } catch (e) {
      setSaveMsg('保存失败：' + (e instanceof Error ? e.message : '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部说明栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">前台模板预览</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            无需登录即可预览各套模板的前台效果，切换设备宽度查看不同终端适配；当前站点语言会同步保留
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50"
          >
            <ExternalLink size={13} /> 新窗口打开
          </a>
        </div>
      </div>

      <div className="flex gap-0 h-[calc(100vh-73px)]">
        {/* 左栏：模板列表 */}
        <aside className="w-60 bg-white border-r border-gray-200 overflow-y-auto shrink-0 p-3 space-y-2">
          <div className="px-2 py-1 text-xs font-semibold text-gray-400">十套内置模板</div>
          {TEMPLATE_PRESETS.map((t) => (
            <button
              key={t.slug}
              onClick={() => setActive(t.slug)}
              className={`w-full text-left rounded-lg p-2.5 transition-colors ${
                active === t.slug ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: t.theme.primary }}
                />
                <span className="text-sm font-medium text-gray-800 truncate">{t.name}</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1 ml-5">
                {t.category} · {t.style.radius} 圆角 · {t.style.spacing} 间距
              </div>
            </button>
          ))}
          <div className="pt-3 border-t border-gray-100 px-2 mt-2">
            {/* 当前模板详情 */}
            {activePreset && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <Paintbrush size={13} className="text-blue-600" />
                  模板详情
                </div>
                <div className="flex items-center gap-2">
                  {[activePreset.theme.primary, activePreset.theme.primaryLight, activePreset.theme.accent, activePreset.theme.dark].map((c) => (
                    <span key={c} className="w-5 h-5 rounded border border-black/10" style={{ background: c }} title={c} />
                  ))}
                  <span className="text-[11px] text-gray-500 font-mono">{activePreset.theme.primary}</span>
                </div>
                <div className="space-y-1 text-[11px] text-gray-600">
                  <div className="flex items-center gap-1.5"><LayoutGrid size={11} className="text-gray-400" /> 圆角 {activePreset.style.radius} · 间距 {activePreset.style.spacing} · 字号 {activePreset.style.fontScale}</div>
                  <div className="flex items-center gap-1.5"><Type size={11} className="text-gray-400" /> 头部 {activePreset.style.header} · 卡片 {activePreset.style.card} · CTA {activePreset.style.cta}</div>
                  <div className="flex items-start gap-1.5"><Palette size={11} className="text-gray-400 mt-0.5" /> 适用：{activePreset.industries?.join(' / ')}</div>
                </div>
                <div className="text-[11px] leading-relaxed text-gray-500 pt-1 border-t border-gray-200">
                  正式应用需在后台「模板管理 → 应用此模板」，此处仅预览效果。
                </div>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-gray-400">
              应用模板需在后台「模板管理」操作；此处仅预览效果，不影响线上站点。
            </p>
          </div>
        </aside>

        {/* 右栏：实时预览 */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              {DEVICE_WIDTHS.map((d) => {
                const Icon = d.icon
                return (
                  <button
                    key={d.key}
                    onClick={() => setDevice(d.key)}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
                      device === d.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={13} />
                    {d.label}
                  </button>
                )
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* 微调面板 */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200">
                <span className="inline-flex items-center gap-1 text-xs text-gray-500"><SlidersHorizontal size={12} /> 微调</span>
                <label className="text-[11px] text-gray-500 flex items-center gap-1">
                  主色
                  <input
                    type="color"
                    value={tune.primary || activePreset.theme.primary}
                    onChange={(e) => setTune({ ...tune, primary: e.target.value })}
                    className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                  />
                </label>
                <label className="text-[11px] text-gray-500 flex items-center gap-1">
                  圆角
                  <select
                    value={tune.radius || activePreset.style.radius}
                    onChange={(e) => setTune({ ...tune, radius: e.target.value })}
                    className="text-xs border border-gray-300 rounded px-1 py-0.5"
                  >
                    <option value="4">锐利 4px</option>
                    <option value="10">适中 10px</option>
                    <option value="18">圆润 18px</option>
                  </select>
                </label>
                <label className="text-[11px] text-gray-500 flex items-center gap-1">
                  间距
                  <select
                    value={tune.spacing || activePreset.style.spacing}
                    onChange={(e) => setTune({ ...tune, spacing: e.target.value })}
                    className="text-xs border border-gray-300 rounded px-1 py-0.5"
                  >
                    <option value="56">紧凑 56px</option>
                    <option value="88">适中 88px</option>
                    <option value="112">宽松 112px</option>
                  </select>
                </label>
                <label className="text-[11px] text-gray-500 flex items-center gap-1">
                  字号
                  <select
                    value={tune.fontScale || String(activePreset.style.fontScale === 'large' ? 1.08 : activePreset.style.fontScale === 'small' ? 0.94 : 1)}
                    onChange={(e) => setTune({ ...tune, fontScale: e.target.value })}
                    className="text-xs border border-gray-300 rounded px-1 py-0.5"
                  >
                    <option value="0.94">小</option>
                    <option value="1">标准</option>
                    <option value="1.08">大</option>
                  </select>
                </label>
                <button
                  onClick={() => setTune({})}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
                  title="恢复模板默认"
                >
                  <RotateCcw size={12} /> 重置
                </button>
                <button
                  onClick={saveAsTemplate}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-[11px] bg-blue-600 text-white px-2.5 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  title="将当前微调结果保存为后台模板"
                >
                  <Save size={12} /> {saving ? '保存中…' : '存为新模板'}
                </button>
              </div>
              {saveMsg && (
                <div className="absolute right-0 top-full mt-1 z-10 text-[11px] bg-white border border-gray-200 shadow-md rounded-md px-2.5 py-1.5 max-w-xs">{saveMsg}</div>
              )}
              <div className="text-xs text-gray-500">
                当前：<span className="font-medium text-gray-800">{activePreset?.name}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-gray-100 p-4 overflow-auto flex justify-center">
            <div
              className="bg-white shadow rounded overflow-hidden transition-all duration-300"
              style={{ width: activeWidth, height: '100%', maxWidth: '100%' }}
            >
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={`模板预览：${activePreset?.name}`}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
