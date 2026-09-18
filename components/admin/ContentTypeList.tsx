'use client'

/**
 * 通用内容列表（Content Type List）
 * =====================================================
 * 由内容类型注册表的 listColumns 驱动，渲染表格 + 搜索 + 删除。
 * v2: 支持关联列名称显示（tabId→tabName / categoryId→categoryName）、日期格式化、配件标记。
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Search, Columns3, Settings2, Sparkles, ShoppingCart, ExternalLink } from 'lucide-react'

export interface ListColumn {
  key: string
  label: string
  width?: string
}

interface Props {
  typeName: string
  label: string
  columns: ListColumn[]
  titleField: string
  initialItems: any[]
}

export default function ContentTypeList({ typeName, label, columns, titleField, initialItems }: Props) {
  const [items, setItems] = useState<any[]>(initialItems || [])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  // 列显示勾选：localStorage 按类型记忆（key: content-columns-{typeName}）
  const [visibleCols, setVisibleCols] = useState<string[] | null>(null)
  const [colOpen, setColOpen] = useState(false)
  // 多选 + AI 批量重写
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rewriting, setRewriting] = useState(false)
  const [rewriteMsg, setRewriteMsg] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`content-columns-${typeName}`)
      if (saved) {
        const arr = JSON.parse(saved)
        if (Array.isArray(arr) && arr.length > 0) setVisibleCols(arr)
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeName])

  const shownColumns = visibleCols ? columns.filter((c) => visibleCols.includes(c.key)) : columns

  const toggleCol = (key: string) => {
    setVisibleCols((prev) => {
      const cur = prev || columns.map((c) => c.key)
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
      // 至少保留 1 列
      if (next.length === 0) return cur
      try { localStorage.setItem(`content-columns-${typeName}`, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const resetCols = () => {
    setVisibleCols(null)
    try { localStorage.removeItem(`content-columns-${typeName}`) } catch { /* ignore */ }
  }

  const load = async (kw = '') => {
    setLoading(true)
    try {
      const q = kw ? `?search=${encodeURIComponent(kw)}` : ''
      const res = await fetch(`/api/admin/content/${typeName}${q}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(`确认删除该${label}？`)) return
    await fetch(`/api/admin/content/${typeName}/${id}`, { method: 'DELETE' })
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
    load(search)
  }

  // 多选
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  const toggleAll = () => {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => String(i.id)))))
  }

  // 商城同步上架（仅 products 类型）：shopState[id] = { synced, loading, shop? }
  const [shopState, setShopState] = useState<Record<string, any>>({})
  const isShopType = typeName === 'products'

  const syncShop = async (item: any, action: 'query' | 'up' | 'down') => {
    const id = String(item.id)
    setShopState((prev) => ({ ...prev, [id]: { ...prev[id], loading: true } }))
    try {
      if (action === 'query') {
        const res = await fetch(`/api/admin/products/${id}/sync-shop`)
        const d = await res.json()
        setShopState((prev) => ({ ...prev, [id]: { synced: !!d.synced, shop: d.shop, loading: false } }))
        return d
      }
      if (action === 'up') {
        const res = await fetch(`/api/admin/products/${id}/sync-shop`, { method: 'POST' })
        const d = await res.json()
        if (d.ok) {
          setShopState((prev) => ({ ...prev, [id]: { synced: true, shop: d.item, loading: false } }))
          alert(`「${item.name || ''}」已同步上架到商城（${d.item.slug}）`)
          return d
        }
        alert(d.error || '上架失败')
        setShopState((prev) => ({ ...prev, [id]: { ...prev[id], loading: false } }))
        return d
      }
      if (action === 'down') {
        if (!window.confirm(`确认将「${item.name || ''}」从商城下架？`)) {
          setShopState((prev) => ({ ...prev, [id]: { ...prev[id], loading: false } }))
          return
        }
        const res = await fetch(`/api/admin/products/${id}/sync-shop`, { method: 'DELETE' })
        const d = await res.json()
        if (d.ok) setShopState((prev) => ({ ...prev, [id]: { synced: false, shop: null, loading: false } }))
        else setShopState((prev) => ({ ...prev, [id]: { ...prev[id], loading: false } }))
        return d
      }
    } catch (e: any) {
      alert('操作失败：' + (e.message || ''))
      setShopState((prev) => ({ ...prev, [id]: { ...prev[id], loading: false } }))
    }
  }

  // AI 批量重写标题
  const aiRewrite = async () => {    if (selected.size === 0) return
    if (!window.confirm(`对选中的 ${selected.size} 条内容执行 AI 批量重写标题？`)) return
    setRewriting(true); setRewriteMsg('')
    try {
      const res = await fetch(`/api/admin/content/${typeName}/ai-rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const d = await res.json()
      const okCount = (d.results || []).filter((r: any) => r.ok).length
      setRewriteMsg(`AI 重写完成：成功 ${okCount} / ${selected.size} 条`)
      setSelected(new Set())
      load(search)
    } catch (e: any) {
      setRewriteMsg('AI 重写失败：' + (e.message || ''))
    } finally {
      setRewriting(false)
      setTimeout(() => setRewriteMsg(''), 5000)
    }
  }

  const cellValue = (item: any, key: string): string => {
    // 关联字段（tabId/categoryId 等）：优先取服务端补充的名称字段（tabName/categoryName）
    if (key === 'tabId' || key === 'categoryId') {
      const relKey = key.slice(0, -2) + 'Name'
      const relName = item[relKey]
      if (relName) return String(relName)
      const raw = item[key]
      return raw === null || raw === undefined ? '-' : String(raw)
    }
    const v = item[key]
    if (v === null || v === undefined) return '-'
    if (key === 'isParts') return v ? '配件' : '整机'
    if (typeof v === 'boolean') return v ? '✓' : '✗'
    if (key === 'status') return v === 'published' ? '发布' : '草稿'
    if (v instanceof Date || /^\d{4}-\d{2}-\d{2}T/.test(String(v))) {
      const d = v instanceof Date ? v : new Date(v)
      if (!isNaN(d.getTime())) return d.toLocaleDateString('zh-CN')
    }
    if (Array.isArray(v)) return `${v.length} 项`
    // 多语言对象字段（动态类型）：取 zh 文案
    if (typeof v === 'object') {
      const zh = v.zh
      if (typeof zh === 'string') return zh || '-'
      return JSON.stringify(v)?.slice(0, 40) || '-'
    }
    return String(v)
  }

  return (
    <div className="space-y-4">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">{label}</h1>
            {items.length > 0 && (
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400">
                共 {items.length} 条
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">内容类型：{typeName} · 支持搜索 / 多选 / AI 批量重写</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={aiRewrite}
              disabled={rewriting}
              className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              <Sparkles size={14} /> {rewriting ? 'AI 重写中...' : `AI 批量重写标题（${selected.size}）`}
            </button>
          )}
          {rewriteMsg && <span className="text-xs text-purple-600">{rewriteMsg}</span>}
          <button
            onClick={() => setColOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-800"
            title="自定义列表显示列"
          >
            <Columns3 size={14} /> 列设置
          </button>
          <Link
            href={`/admin/content/${typeName}/new`}
            className="flex items-center gap-2 rounded-md bg-[#CC0000] px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#aa0000]"
          >
            <Plus size={16} />
            新增{label}
          </Link>
        </div>
      </div>

      {/* 搜索工具条 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(search)}
            placeholder={`搜索${label}...`}
            className="w-72 rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-gray-300 focus:border-[#CC0000]"
          />
        </div>
        <button
          onClick={() => load(search)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-[#CC0000] hover:text-[#CC0000]"
        >搜索</button>
        {search && (
          <button
            onClick={() => { setSearch(''); load(''); }}
            className="text-xs text-gray-400 transition-colors hover:text-[#CC0000]"
          >清空搜索</button>
        )}
      </div>

      {colOpen && (
        <div className="admin-modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setColOpen(false)}>
          <div className="admin-modal-panel w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900"><Settings2 size={15} className="text-[#CC0000]" /> 列表显示列</h3>
            <p className="mt-1 text-xs text-gray-500">勾选要在列表中显示的列（记忆在本浏览器，可随时调整）。</p>
            <div className="mt-3 max-h-72 space-y-1.5 overflow-auto">
              {columns.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={(visibleCols || columns.map((x) => x.key)).includes(c.key)}
                    onChange={() => toggleCol(c.key)}
                    className="h-4 w-4 accent-[#CC0000]"
                  />
                  <span className="text-sm text-gray-700">{c.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button onClick={resetCols} className="text-xs text-gray-400 transition-colors hover:text-gray-600">恢复默认</button>
              <button onClick={() => setColOpen(false)} className="rounded-md bg-[#CC0000] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#aa0000]">完成</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400"><span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#CC0000]" />加载中...</div>}

      <div className="admin-table overflow-x-auto rounded border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[960px] divide-y divide-gray-200 text-[13px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-3 py-2.5">
                <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleAll} className="h-4 w-4 accent-[#CC0000]" title="全选" />
              </th>
              {shownColumns.map((c) => (
                <th key={c.key} className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-gray-500">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-red-50/40">
                <td className="px-3 py-2.5">
                  <input type="checkbox" checked={selected.has(String(item.id))} onChange={() => toggleSelect(String(item.id))} className="h-4 w-4 accent-[#CC0000]" />
                </td>
                {shownColumns.map((c) => (
                  <td key={c.key} className="max-w-xs truncate px-4 py-2.5 text-[13px] text-gray-700">
                    {cellValue(item, c.key)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  {isShopType && (
                    <span className="mr-3 inline-flex items-center gap-2 align-middle">
                      <button
                        onClick={() => syncShop(item, 'up')}
                        disabled={shopState[String(item.id)]?.loading}
                        title="一键同步产品信息到在线商城（名称/多语言/描述/图片/价格）"
                        className={`inline-flex items-center gap-1 text-sm transition-colors disabled:opacity-50 ${
                          shopState[String(item.id)]?.synced
                            ? 'text-green-600 hover:text-green-800'
                            : 'text-orange-600 hover:text-orange-800'
                        }`}
                      >
                        <ShoppingCart size={14} />
                        {shopState[String(item.id)]?.synced ? '商城已上架' : '上架商城'}
                      </button>
                      {shopState[String(item.id)]?.synced ? (
                        <>
                          <Link
                            href={`/admin/shop/products?search=${encodeURIComponent(item.slug || '')}`}
                            className="inline-flex items-center gap-0.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
                            title="在商城管理中编辑（可设置规格/阶梯价/库存）"
                          >
                            <ExternalLink size={13} /> 管理
                          </Link>
                          <button
                            onClick={() => syncShop(item, 'down')}
                            disabled={shopState[String(item.id)]?.loading}
                            className="inline-flex items-center gap-1 text-sm text-red-500 transition-colors hover:text-red-700 disabled:opacity-50"
                          >
                            下架
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => syncShop(item, 'query')}
                          disabled={shopState[String(item.id)]?.loading}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50"
                        >
                          查询状态
                        </button>
                      )}
                    </span>
                  )}
                  <Link
                    href={`/admin/content/${typeName}/${item.id}/edit`}
                    className="mr-3 inline-flex items-center gap-1 text-sm text-blue-600 transition-colors hover:text-blue-800"
                  >
                    <Edit size={14} /> 编辑
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-1 text-sm text-red-600 transition-colors hover:text-red-800"
                  >
                    <Trash2 size={14} /> 删除
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Search className="h-8 w-8 text-gray-200" />
                    <span className="text-sm">{search ? '没有符合条件的' + label : `暂无数据，点击右上角「新增${label}」创建`}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
