"use client"

import { useState, useEffect } from "react"
import { Save, RotateCcw } from "lucide-react"

interface OemData {
  brandName: string
  adminTitle: string
  loginLogo: string
  loginSubtitle: string
  footerCopyright: string
  frontendBrand: string
  frontendCopyright: string
  icp: string
  showLegal: boolean
  accentColor: string
}

const DEFAULTS: OemData = {
  brandName: "VALTRIX",
  adminTitle: "后台管理系统",
  loginLogo: "",
  loginSubtitle: "",
  footerCopyright: "",
  frontendBrand: "",
  frontendCopyright: "",
  icp: "",
  showLegal: true,
  accentColor: "#CC0000",
}

export default function OemSettingsPage() {
  const [form, setForm] = useState<OemData>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    fetch("/api/admin/oem")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.data) setForm({ ...DEFAULTS, ...d.data })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setMsg("")
    try {
      const r = await fetch("/api/admin/oem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (d?.ok) {
        setMsg("已保存，重新登录后台或刷新页面后生效。")
      } else {
        setMsg("保存失败：" + (d?.error || "未知错误"))
      }
    } catch (e: any) {
      setMsg("保存失败：" + e.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setForm(DEFAULTS)
  }

  const field = (label: string, key: keyof OemData, placeholder: string, desc?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
      />
      {desc && <p className="text-xs text-gray-400 mt-1">{desc}</p>}
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-[22px] font-bold tracking-tight text-gray-900">品牌 OEM 配置</h1>
      <p className="text-gray-500 text-sm mt-1">自定义后台登录页、侧边栏与页脚的品牌展示（白标），适合代理商/多租户按品牌定制。</p>

      <div className="mt-6 space-y-4 bg-white rounded-lg border border-gray-200 p-5">
        {field("品牌名称", "brandName", "如：VALTRIX", "登录页与侧边栏展示的品牌名（前台与后台）。")}
        {field("后台标题", "adminTitle", "如：后台管理系统", "侧边栏底部与登录页副标题下方的后台系统名称。")}
        {field("登录页 Logo 图片地址", "loginLogo", "https://... 或 /uploads/...", "留空则显示品牌名称文字 Logo。")}
        {field("登录页副标题", "loginSubtitle", "如：企业官网内容管理系统", "显示在登录页品牌名下方。")}
        {field("页脚版权", "footerCopyright", "如：© 2026 VALTRIX All Rights Reserved", "后台页脚展示的版权信息。")}
        {field("前台品牌名称", "frontendBrand", "如：某某科技（留空=使用站点设置的站点名称）", "前台页脚展示的品牌名称（白标交付时替换为代理商/客户品牌）。")}
        {field("前台页脚版权", "frontendCopyright", "如：© 2026 某某科技 All Rights Reserved", "前台页脚版权行（留空=显示默认版权文案）。")}
        {field("ICP 备案号", "icp", "如：京ICP备12345678号-1", "前台页脚展示的 ICP 备案号（留空=页脚不显示备案行）。")}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">前台显示备案与版权</label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showLegal !== false}
              onChange={(e) => setForm({ ...form, showLegal: e.target.checked })}
              className="w-4 h-4 border border-gray-300 rounded text-red-600 focus:ring-2 focus:ring-red-500 cursor-pointer"
            />
            <span className="text-sm text-gray-600">{form.showLegal !== false ? "已开启" : "已关闭"}</span>
          </label>
          <p className="text-xs text-gray-400 mt-1">关闭后，前台页脚的版权行与 ICP 备案行都不再显示（后台不受影响）。</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">主题强调色</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.accentColor}
              onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
              className="w-12 h-9 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={form.accentColor}
              onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
              className="w-40 px-3 py-2 border border-gray-300 rounded-md outline-none text-sm"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">登录页按钮等强调色（前台主题色仍由「主题配色」控制）。</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          <Save size={16} />
          {saving ? "保存中..." : "保存配置"}
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors text-sm"
        >
          <RotateCcw size={16} />
          恢复默认
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </div>
  )
}
