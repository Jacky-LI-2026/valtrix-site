'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Pencil, Trash2, Power, X, Save, AlertCircle, CheckCircle2, Globe } from 'lucide-react'

interface TenantItem {
  id: string
  name: string
  slug: string
  edition: string
  status: string
  licenseCode: string | null
  maxSites: number
  maxSeats: number
  expiresAt: string | null
  contactName: string | null
  contactEmail: string | null
  remark: string | null
  _count?: { sites: number }
}

interface FormState {
  name: string
  slug: string
  edition: string
  status: string
  licenseCode: string
  maxSites: number
  maxSeats: number
  expiresAt: string
  contactName: string
  contactEmail: string
  remark: string
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  edition: 'standard',
  status: 'active',
  licenseCode: '',
  maxSites: 1,
  maxSeats: 5,
  expiresAt: '',
  contactName: '',
  contactEmail: '',
  remark: '',
}

const EDITIONS: Record<string, string> = {
  trial: '试用',
  standard: '标准版',
  pro: '专业版',
  enterprise: '企业版',
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([])
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
      const res = await fetch('/api/admin/tenants')
      const d = await res.json()
      if (d.ok) setTenants(d.tenants || [])
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditId(null); setForm(EMPTY); setModalOpen(true) }

  const openEdit = (t: TenantItem) => {
    setEditId(t.id)
    setForm({
      name: t.name,
      slug: t.slug,
      edition: t.edition,
      status: t.status,
      licenseCode: t.licenseCode || '',
      maxSites: t.maxSites,
      maxSeats: t.maxSeats,
      expiresAt: t.expiresAt ? t.expiresAt.slice(0, 10) : '',
      contactName: t.contactName || '',
      contactEmail: t.contactEmail || '',
      remark: t.remark || '',
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) { setMsg('租户名称必填'); return }
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/admin/tenants', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { ...form, id: editId } : form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '保存失败')
      setMsg('保存成功'); setModalOpen(false); load()
      setTimeout(() => setMsg(''), 4000)
    } catch (e: any) {
      setMsg(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (t: TenantItem) => {
    if (t.id === '1') { setMsg('默认租户不可停用'); return }
    const res = await fetch('/api/admin/tenants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: t.id,
        name: t.name,
        edition: t.edition,
        status: t.status === 'active' ? 'inactive' : 'active',
        maxSites: t.maxSites,
        maxSeats: t.maxSeats,
        licenseCode: t.licenseCode || '',
        expiresAt: t.expiresAt || '',
      }),
    })
    const d = await res.json()
    if (!res.ok) { setMsg(d.error || '操作失败'); return }
    load()
  }

  const remove = async (t: TenantItem) => {
    if (t.id === '1') { setMsg('默认租户不可删除'); return }
    if (!confirm(`确认删除租户「${t.name}」？`)) return
    const res = await fetch(`/api/admin/tenants?id=${t.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { setMsg(d.error || '删除失败'); return }
    load()
  }

  const expired = (t: TenantItem) => {
    if (!t.expiresAt) return false
    return new Date(t.expiresAt).getTime() < Date.now()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Building2 size={22} className="text-red-600" /> 租户管理</h1>
          <p className="text-gray-500 text-sm mt-1">SaaS 多租户：每个客户一个租户，租户下可建多个站点（子域名）。授权码与租户绑定。</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded-lg">
          <Plus size={16} /> 新建租户
        </button>
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
      ) : tenants.length === 0 ? (
        <div className="text-gray-400 py-16 text-center border border-dashed rounded-xl">暂无租户，点击「新建租户」创建第一个客户</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map((t) => (
            <div key={t.id} className={`border rounded-xl p-4 ${t.status === 'active' ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-1.5">
                      {t.name}
                      {t.id === '1' && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">内置</span>}
                      {expired(t) && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">已到期</span>}
                    </div>
                    <div className="text-xs text-gray-500 truncate">标识：{t.slug} · {EDITIONS[t.edition] || t.edition}</div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button title={t.status === 'active' ? '停用' : '启用'} onClick={() => toggleStatus(t)} className={`p-1.5 rounded hover:bg-gray-100 ${t.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                    <Power size={15} />
                  </button>
                  <button title="编辑" onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={15} /></button>
                  <button title="删除" onClick={() => remove(t)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1 text-gray-500">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><Globe size={11} /> 站点数</span>
                  <span className="text-gray-700">{t._count?.sites ?? 0} / {t.maxSites}</span>
                </div>
                <div className="flex justify-between"><span>授权码</span><span className="text-gray-700 max-w-[60%] truncate">{t.licenseCode || '—'}</span></div>
                <div className="flex justify-between"><span>到期时间</span><span className={`${expired(t) ? 'text-red-600' : 'text-gray-700'}`}>{t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('zh-CN') : '永久'}</span></div>
                {t.contactName && <div className="flex justify-between"><span>联系人</span><span className="text-gray-700">{t.contactName}{t.contactEmail ? `（${t.contactEmail}）` : ''}</span></div>}
                {t.remark && <div className="truncate" title={t.remark}>备注：{t.remark}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{editId ? '编辑租户' : '新建租户'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">租户名称（客户名）*</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="如：某某科技有限公司" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">标识 slug（留空自动生成）</label>
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" placeholder="tenant-xxx" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">版本</label>
                  <select value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none">
                    {Object.entries(EDITIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">状态</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">站点数上限</label>
                  <input type="number" min={1} value={form.maxSites} onChange={(e) => setForm({ ...form, maxSites: Number(e.target.value) || 1 })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">账号数上限</label>
                  <input type="number" min={1} value={form.maxSeats} onChange={(e) => setForm({ ...form, maxSeats: Number(e.target.value) || 1 })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">绑定授权码</label>
                <input value={form.licenseCode} onChange={(e) => setForm({ ...form, licenseCode: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none font-mono" placeholder="授权码（与域名/站点名称联动）" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">授权到期（留空=永久）</label>
                <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">联系人</label>
                  <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">联系邮箱</label>
                  <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">备注</label>
                <textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" />
              </div>
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
