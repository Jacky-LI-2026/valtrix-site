'use client'

import { useState, useEffect, useCallback } from 'react'
import { Boxes, Package, RefreshCw, Download, Trash2, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface PackItem {
  key: string
  version: string
  name: string
  nameEn: string
  category: string
  description: string
  valid: boolean
  errors: string[]
  seedCount: number
}

interface SiteItem {
  id: string
  name: string
  domain: string | null
  isDefault: boolean
  industryPack: string | null
  industryPackVersion: string | null
}

interface RecordItem {
  id: string
  siteId: string
  packKey: string
  packVersion: string
  action: string
  createdAt: string
}

export default function IndustryPacksPage() {
  const [packs, setPacks] = useState<PackItem[]>([])
  const [sites, setSites] = useState<SiteItem[]>([])
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [targetSite, setTargetSite] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/industry-packs', { cache: 'no-store' })
      if (!r.ok) throw new Error((await r.json()).error || '加载失败')
      const d = await r.json()
      setPacks(d.packs || [])
      setSites(d.sites || [])
      setRecords(d.records || [])
      if (d.sites?.length && Object.keys(targetSite).length === 0) {
        const def = d.sites.find((s: SiteItem) => s.isDefault) || d.sites[0]
        setTargetSite({})
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (action: string, packKey: string) => {
    const siteId = targetSite[packKey]
    if (!siteId) { setMsg({ ok: false, text: `请先为 ${packKey} 选择目标站点` }); return }
    setBusy(packKey + ':' + action)
    setMsg(null)
    try {
      const r = await fetch('/api/admin/industry-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, packKey, siteId }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || '操作失败')
      const res = d.result?.report || d.result?.deleted || {}
      const installed = res.installed || {}
      const summary = Object.entries(installed).map(([m, c]) => `${m}=${c}`).join(' ')
      setMsg({ ok: true, text: `${action === 'install' ? '安装' : '卸载'}成功：${packKey}@${d.result?.version || ''} → site ${siteId}${summary ? '（' + summary + '）' : ''}` })
      await load()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" /> 行业包管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">通用基地 + 行业包 + 能力插件 —— 行业包为内容资产包（数据/设计令牌/语种预设），不含程序逻辑</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${msg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-16 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> 加载中...</div>
      ) : packs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed rounded-xl">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>industry-packs/ 目录下暂无行业包</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packs.map(p => {
            const site = sites.find(s => s.industryPack === p.key)
            return (
              <div key={p.key} className="border rounded-xl p-5 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {p.name}
                      {p.valid
                        ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200"><CheckCircle2 className="w-3 h-3" /> 合法</span>
                        : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200"><XCircle className="w-3 h-3" /> 异常</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.key}@{p.version} · {p.category} · seed {p.seedCount} 项</div>
                  </div>
                  {site && (
                    <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap">
                      已装 → {site.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 min-h-[2.5rem]">{p.description || p.nameEn}</p>
                {!p.valid && p.errors.length > 0 && (
                  <ul className="mt-2 text-xs text-red-500 space-y-0.5">
                    {p.errors.slice(0, 4).map((e, i) => <li key={i}>· {e}</li>)}
                  </ul>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <select
                    value={targetSite[p.key] || ''}
                    onChange={e => setTargetSite(s => ({ ...s, [p.key]: e.target.value }))}
                    className="flex-1 text-sm border rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="">选择目标站点...</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.isDefault ? '（默认）' : ''}{s.industryPack && s.industryPack !== p.key ? ` · 已装 ${s.industryPack}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => act('install', p.key)}
                    disabled={busy !== null || !p.valid}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    {busy === p.key + ':install' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 安装
                  </button>
                  <button
                    onClick={() => act('uninstall', p.key)}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    {busy === p.key + ':uninstall' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 卸载
                  </button>
                </div>
                {site && (
                  <div className="mt-2 text-xs text-gray-400">已装版本：{site.industryPackVersion}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {records.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">安装历史</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2">行业包</th>
                  <th className="px-3 py-2">版本</th>
                  <th className="px-3 py-2">站点</th>
                  <th className="px-3 py-2">动作</th>
                  <th className="px-3 py-2">时间</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 20).map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.packKey}</td>
                    <td className="px-3 py-2 text-gray-500">{r.packVersion}</td>
                    <td className="px-3 py-2 text-gray-500">{r.siteId}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.action === 'install' ? 'bg-green-50 text-green-600' : r.action === 'uninstall' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
