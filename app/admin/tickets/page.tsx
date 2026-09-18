'use client'

import { useState, useEffect, useCallback } from 'react'
import { LifeBuoy, RefreshCw, CheckCircle2, AlertCircle, Trash2, Save } from 'lucide-react'

interface Ticket {
  id: string
  ticketNo: string
  memberId: string | null
  memberName: string
  customerName: string
  contactEmail: string
  category: string
  subject: string
  content: string
  reply: string | null
  status: string
  priority: string
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = { open: '待处理', replied: '已回复', closed: '已关闭' }
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-amber-50 text-amber-600',
  replied: 'bg-blue-50 text-blue-600',
  closed: 'bg-gray-100 text-gray-500',
}
const CATEGORY_LABEL: Record<string, string> = {
  general: '综合咨询', license: '授权相关', manual: '手册资料', quote: '报价相关', other: '其他',
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tickets?status=${statusFilter}`)
      const d = await res.json()
      if (d.ok) setTickets(d.tickets || [])
    } catch (e: any) {
      setMsg(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const reply = async (t: Ticket, status: string) => {
    const replyText = (replyDraft[t.id] || '').trim()
    if (status === 'replied' && !replyText) { setMsg('请填写回复内容'); return }
    const res = await fetch('/api/admin/tickets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, reply: replyText, status }),
    })
    const d = await res.json()
    if (!res.ok) { setMsg(d.error || '操作失败'); return }
    setMsg('已保存')
    setReplyDraft((p) => ({ ...p, [t.id]: '' }))
    load()
    setTimeout(() => setMsg(''), 3000)
  }

  const remove = async (t: Ticket) => {
    if (!confirm(`删除工单 ${t.ticketNo}？`)) return
    const res = await fetch(`/api/admin/tickets?id=${t.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { setMsg(d.error || '删除失败'); return }
    load()
  }

  const count = (s: string) => tickets.filter((t) => t.status === s).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><LifeBuoy size={22} className="text-red-600" /> 工单管理</h1>
          <p className="text-gray-500 text-sm mt-1">客户门户提交的工单（授权/手册/报价/综合），回复后客户在门户可见。</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-sm border rounded-lg px-3 py-2 hover:bg-gray-50">
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      {msg && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${msg.includes('保存') || msg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {msg.includes('保存') || msg.includes('成功') ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg}
        </div>
      )}

      <div className="flex gap-2 mb-4 text-sm">
        {['all', 'open', 'replied', 'closed'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg border ${statusFilter === s ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
            {s === 'all' ? '全部' : STATUS_LABEL[s]}{s !== 'all' ? `（${count(s)}）` : `（${tickets.length}）`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 py-10 text-center">加载中...</div>
      ) : tickets.length === 0 ? (
        <div className="text-gray-300 py-16 text-center border border-dashed rounded-xl">暂无工单</div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="border rounded-xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{t.subject}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] || ''}`}>{STATUS_LABEL[t.status] || t.status}</span>
                    {t.priority === 'high' && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">紧急</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {t.ticketNo} · {CATEGORY_LABEL[t.category] || t.category} · {t.customerName || t.memberName || '匿名'}（{t.contactEmail}）· {new Date(t.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <button onClick={() => remove(t)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={15} /></button>
              </div>

              <div className="mt-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{t.content}</div>

              {t.reply && (
                <div className="mt-2 text-sm bg-blue-50 rounded-lg p-3">
                  <span className="font-semibold text-blue-700">官方回复：</span>
                  <span className="text-gray-700">{t.reply}</span>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <input
                  value={replyDraft[t.id] || ''}
                  onChange={(e) => setReplyDraft({ ...replyDraft, [t.id]: e.target.value })}
                  placeholder="回复内容（回复后客户门户可见）"
                  className="flex-1 min-w-[220px] border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500"
                />
                <button onClick={() => reply(t, 'replied')} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1">
                  <Save size={13} /> 回复
                </button>
                {t.status !== 'closed' && (
                  <button onClick={() => reply(t, 'closed')} className="px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">关闭工单</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
