'use client'

import { useState, useEffect, useCallback } from 'react'
import { Smartphone, Save, FileDown, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'

export default function AppletPage() {
  const [cfg, setCfg] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(() => {
    fetch('/api/admin/applet/config').then((r) => r.json()).then((d) => { if (d.ok) setCfg(d.data) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    const res = await fetch('/api/admin/applet/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg, generatedAt: new Date().toISOString() }),
    })
    const d = await res.json()
    if (d.ok) { setMsg('配置已保存'); setTimeout(() => setMsg(''), 3000) }
  }

  const downloadDocs = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/admin/applet/docs')
      if (!res.ok) throw new Error('生成失败')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '小程序APP对接文档.md'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setMsg(e.message || '生成失败')
    } finally {
      setDownloading(false)
    }
  }

  if (!cfg) return <div className="p-6 text-gray-400">加载中...</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2"><Smartphone size={22} className="text-red-600" /> 小程序 / APP 端</h1>
        <p className="text-gray-500 text-sm mt-1">一键生成微信小程序 / H5 App 壳，复用同一内容模型与开放接口。填写基础信息后，下载对接文档交给开发即可。</p>
      </div>

      {msg && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${msg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {msg.includes('成功') ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg}
        </div>
      )}

      <div className="border rounded-xl p-5 bg-white space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">应用名称 *</label>
            <input value={cfg.appName} onChange={(e) => setCfg({ ...cfg, appName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="如：VALTRIX商城" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">微信小程序 AppID</label>
            <input value={cfg.appId} onChange={(e) => setCfg({ ...cfg, appId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" placeholder="wx1234567890abcdef" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">目标平台</label>
            <select value={cfg.platform} onChange={(e) => setCfg({ ...cfg, platform: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none">
              <option value="weapp">微信小程序</option>
              <option value="h5">H5 App（Android/iOS）</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">主题色</label>
            <div className="flex items-center gap-2">
              <input type="color" value={cfg.themeColor || '#CC0000'} onChange={(e) => setCfg({ ...cfg, themeColor: e.target.value })} className="w-10 h-9 border rounded-lg cursor-pointer" />
              <input value={cfg.themeColor || ''} onChange={(e) => setCfg({ ...cfg, themeColor: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none font-mono" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">应用描述</label>
          <textarea value={cfg.appDesc || ''} onChange={(e) => setCfg({ ...cfg, appDesc: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="应用简介，用于小程序简介/App 商店描述" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={!!cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} className="w-4 h-4" />
          启用小程序/APP 端能力（影响前台是否展示 App 下载入口）
        </label>
        <div className="flex gap-2 pt-2 border-t">
          <button onClick={save} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-1">
            <Save size={14} /> 保存配置
          </button>
          <button onClick={downloadDocs} disabled={downloading} className="px-4 py-2 border border-gray-300 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50 disabled:opacity-60">
            <FileDown size={14} /> {downloading ? '生成中...' : '下载对接文档'}
          </button>
        </div>
      </div>

      <div className="mt-4 border rounded-xl p-4 bg-white text-sm text-gray-500">
        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><ExternalLink size={14} /> 使用说明</h3>
        <ol className="list-decimal pl-5 space-y-1 text-xs">
          <li>填写应用信息并保存，系统自动生成「对接文档」（含全部开放接口清单与开发指引）。</li>
          <li>将文档交给前端开发，按 uni-app 技术栈 1-2 天即可完成小程序/H5 壳。</li>
          <li>小程序复用本系统内容模型与 API，后台改内容、前端同步更新，无需二次开发。</li>
          <li>会员/询价/工单等互动能力已随接口开放，开箱即用。</li>
        </ol>
      </div>
    </div>
  )
}
