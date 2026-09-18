'use client'

import { useState, useEffect, useCallback } from 'react'
import { Globe, Plus, Pencil, Trash2, Star, StarOff, Power, X, Save, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'

interface SiteItem {
  id: string
  tenantId: string
  name: string
  domain: string | null
  domains: string[] | null
  templateSlug: string
  logo: string | null
  favicon: string | null
  locale: string
  status: string
  isDefault: boolean
  tenant?: { id: string; name: string; edition: string; status: string } | null
  createdAt: string
}

interface FormState {
  name: string
  tenantId: string
  domain: string
  domains: string
  templateSlug: string
  logo: string
  favicon: string
  locale: string
  status: string
  isDefault: boolean
}

const EMPTY: FormState = {
  name: '',
  tenantId: '1',
  domain: '',
  domains: '',
  templateSlug: 'default',
  logo: '',
  favicon: '',
  locale: 'zh',
  status: 'active',
  isDefault: false,
}

const LOCALES = [
  { v: 'zh', l: '中文' },
  { v: 'en', l: 'English' },
  { v: 'ja', l: '日本語' },
  { v: 'ko', l: '한국어' },
  { v: 'fr', l: 'Français' },
  { v: 'ar', l: 'العربية' },
]

export default function SitesPage() {
  const [sites, setSites] = useState<SiteItem[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, tRes] = await Promise.all([
        fetch('/api/admin/sites'),
        fetch('/api/admin/tenants'),
      ])
      const sd = await sRes.json()
      const td = await tRes.json()
      if (sd.ok) setSites(sd.sites || [])
      if (td.ok) setTenants(td.tenants || [])
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditId(null)
    setForm({ ...EMPTY, tenantId: tenants[0]?.id || '1' })
    setModalOpen(true)
  }

  const openEdit = (s: SiteItem) => {
    setEditId(s.id)
    setForm({
      name: s.name,
      tenantId: String(s.tenantId),
      domain: s.domain || '',
      domains: Array.isArray(s.domains) ? s.domains.join('\n') : '',
      templateSlug: s.templateSlug,
      logo: s.logo || '',
      favicon: s.favicon || '',
      locale: s.locale,
      status: s.status,
      isDefault: s.isDefault,
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) { setMsg('站点名称必填'); return }
    setSaving(true)
    setMsg('')
    try {
      const payload = {
        ...form,
        domains: form.domains.split('\n').map((s) => s.trim()).filter(Boolean),
      }
      const res = await fetch('/api/admin/sites', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { ...payload, id: editId } : payload),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '保存失败')
      setMsg('保存成功')
      setModalOpen(false)
      load()
      setTimeout(() => setMsg(''), 4000)
    } catch (e: any) {
      setMsg(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const setDefault = async (s: SiteItem) => {
    if (!confirm(`将「${s.name}」设为默认站点？存量全局数据将归属该站点视角。`)) return
    const res = await fetch('/api/admin/sites?action=setDefault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id }),
    })
    const d = await res.json()
    if (!res.ok) { setMsg(d.error || '操作失败'); return }
    load()
  }

  const toggleStatus = async (s: SiteItem) => {
    if (s.isDefault) { setMsg('默认站点不可停用'); return }
    const res = await fetch('/api/admin/sites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: s.id,
        name: s.name,
        tenantId: s.tenantId,
        domain: s.domain || '',
        domains: Array.isArray(s.domains) ? s.domains : [],
        templateSlug: s.templateSlug,
        logo: s.logo || '',
        favicon: s.favicon || '',
        locale: s.locale,
        status: s.status === 'active' ? 'inactive' : 'active',
        isDefault: s.isDefault,
      }),
    })
    const d = await res.json()
    if (!res.ok) { setMsg(d.error || '操作失败'); return }
    load()
  }

  const remove = async (s: SiteItem) => {
    if (!confirm(`确认删除站点「${s.name}」？`)) return
    const res = await fetch(`/api/admin/sites?id=${s.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { setMsg(d.error || '删除失败'); return }
    load()
  }

  const tenantName = (id: string) => tenants.find((t) => String(t.id) === id)?.name || `#${id}`

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Globe size={22} className="text-red-600" /> 站点管理</h1>
          <p className="text-gray-500 text-sm mt-1">多租户站点：一套后台管理多个独立站点（子域名），站点间内容隔离。前台按 Host 域名自动解析当前站点。</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded-lg">
          <Plus size={16} /> 新建站点
        </button>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 leading-relaxed">
        <b>子域名绑定（DNS）指引：</b>为站点创建独立域名时，在域名服务商处将子域名解析到本服务器 IP（A 记录，如 <code>site1.yourdomain.com → 服务器IP</code>），然后在下方把该子域名填入站点「域名」字段并启用即可。
        同一域名不同端口（如 <code>127.0.0.1:3000</code>）也可直接绑定用于本地测试；支持通配符 <code>*.yourdomain.com</code> 一次匹配所有子域名。
      </div>

      {msg && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${msg.startsWith('保存成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {msg.startsWith('保存成功') ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-10 text-center">加载中...</div>
      ) : error ? (
        <div className="text-red-500 py-10 text-center">{error}</div>
      ) : sites.length === 0 ? (
        <div className="text-gray-400 py-16 text-center border border-dashed rounded-xl">暂无站点，点击右上角「新建站点」创建第一个站点</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((s) => (
            <div key={s.id} className={`border rounded-xl p-4 ${s.status === 'active' ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    {s.logo ? <img src={s.logo} alt="" className="w-7 h-7 object-contain rounded" /> : <Globe size={18} className="text-red-600" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-1.5 truncate">
                      {s.name}
                      {s.isDefault && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">默认</span>}
                      {s.status === 'inactive' && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full shrink-0">已停用</span>}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{s.domain || '（未绑定域名）'}</div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!s.isDefault && (
                    <button title="设为默认" onClick={() => setDefault(s)} className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-500">
                      <Star size={15} />
                    </button>
                  )}
                  {s.isDefault && <span title="默认站点" className="p-1.5 text-amber-400"><StarOff size={15} /></span>}
                  <button title={s.status === 'active' ? '停用' : '启用'} onClick={() => toggleStatus(s)} className={`p-1.5 rounded hover:bg-gray-100 ${s.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                    <Power size={15} />
                  </button>
                  <button title="编辑" onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={15} /></button>
                  <button title="删除" onClick={() => remove(s)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1 text-gray-500">
                <div className="flex justify-between"><span>所属租户</span><span className="text-gray-700">{tenantName(String(s.tenantId))}</span></div>
                <div className="flex justify-between"><span>模板 / 语种</span><span className="text-gray-700">{s.templateSlug} / {s.locale}</span></div>
                <div className="flex justify-between"><span>附加域名</span><span className="text-gray-700 truncate max-w-[60%]">{Array.isArray(s.domains) && s.domains.length ? s.domains.join('，') : '—'}</span></div>
                <div className="flex justify-between"><span>创建时间</span><span className="text-gray-700">{new Date(s.createdAt).toLocaleDateString('zh-CN')}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{editId ? '编辑站点' : '新建站点'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">站点名称 *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="如：企业官网 / 英文站" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">所属租户</label>
                  <select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none">
                    {tenants.map((t) => <option key={t.id} value={String(t.id)}>{t.name}（{t.edition}）</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">默认语种</label>
                  <select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none">
                    {LOCALES.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">主域名（Host 解析，如 a.example.com）</label>
                <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="a.example.com" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">附加域名（每行一个，支持多个域名指向本站）</label>
                <textarea value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="b.example.com&#10;c.example.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">前台模板</label>
                  <input value={form.templateSlug} onChange={(e) => setForm({ ...form, templateSlug: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" placeholder="default" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">状态</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">站点 LOGO（URL）</label>
                <input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Favicon（URL）</label>
                <input value={form.favicon} onChange={(e) => setForm({ ...form, favicon: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="w-4 h-4" />
                设为默认站点（存量全局数据视角归属）
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-60">
                <Save size={14} /> {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
