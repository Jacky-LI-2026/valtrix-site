'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Activity, Users, Eye, MousePointerClick, Radio, TrendingUp, Globe, Monitor, Smartphone, Tablet, MapPin, Clock, Zap } from 'lucide-react'

interface Stats {
  overview: {
    totalVisitors: number
    totalPageViews: number
    totalEvents: number
    todayVisitors: number
    todayPageViews: number
    todayEvents: number
    onlineCount: number
    avgDuration: number
  }
  trend: { date: string; visitors: number; views: number }[]
  topPages: { path: string; views: number; duration: number }[]
  sources: { name: string; count: number }[]
  devices: { name: string; count: number }[]
  browsers: { name: string; count: number }[]
  osList: { name: string; count: number }[]
  eventTop: { name: string; count: number }[]
  geoCountries: { name: string; count: number }[]
  geoRegions: { name: string; count: number }[]
  geoCities: { name: string; count: number }[]
}

interface Visitor {
  id: string
  visitorKey: string
  ip: string | null
  deviceType: string | null
  browser: string | null
  os: string | null
  language: string | null
  country: string | null
  region: string | null
  city: string | null
  landingPage: string | null
  firstVisitAt: string
  lastSeenAt: string
  totalDuration: number
  visitCount: number
  eventCount: number
  pageViewCount: number
}

interface TrackEvent {
  id: string
  type: string
  category: string | null
  action: string | null
  label: string | null
  value: string | null
  url: string | null
  createdAt: string
  visitor: { ip: string | null; deviceType: string | null }
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '-'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function fmtDur(sec: number) {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m${s}s`
}

const deviceLabel: Record<string, string> = { desktop: '桌面端', mobile: '移动端', tablet: '平板', unknown: '未知' }

// ---------- SVG 趋势图 ----------
function TrendChart({ data }: { data: { date: string; visitors: number; views: number }[] }) {
  const W = 720
  const H = 220
  const PAD = { l: 36, r: 16, t: 16, b: 28 }
  const maxV = Math.max(1, ...data.map((d) => d.views))
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(1, data.length - 1)
  const y = (v: number) => H - PAD.b - (v / maxV) * (H - PAD.t - PAD.b)
  const line = (key: 'visitors' | 'views') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d[key])}`).join(' ')
  const area = (key: 'visitors' | 'views') =>
    `${line(key)} L${x(data.length - 1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`
  const labels = data.filter((_, i) => i % 2 === 0 || i === data.length - 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={PAD.l} x2={W - PAD.r} y1={y(maxV * g)} y2={y(maxV * g)} stroke="#e5e7eb" strokeDasharray="4 4" />
      ))}
      <path d={area('visitors')} fill="rgba(220,38,38,0.08)" />
      <path d={line('visitors')} fill="none" stroke="#ef4444" strokeWidth="2" />
      <path d={area('views')} fill="rgba(59,130,246,0.08)" />
      <path d={line('views')} fill="none" stroke="#3b82f6" strokeWidth="2" />
      {labels.map((d, i) => (
        <text key={d.date} x={x(data.indexOf(d))} y={H - 8} fontSize="10" fill="#9ca3af" textAnchor="middle">
          {d.date.slice(5)}
        </text>
      ))}
      {[0, maxV * 0.5, maxV].map((v) => (
        <text key={v} x={PAD.l - 6} y={y(v) + 3} fontSize="10" fill="#9ca3af" textAnchor="end">
          {Math.round(v)}
        </text>
      ))}
    </svg>
  )
}

// ---------- 横向条形分布 ----------
function BarList({ items, color }: { items: { name: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  const total = items.reduce((s, i) => s + i.count, 0)
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.name}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-600 truncate max-w-[70%]">{i.name || '未知'}</span>
            <span className="text-gray-400">
              {i.count}（{total ? Math.round((i.count / total) * 100) : 0}%）
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded overflow-hidden">
            <div className={`h-full ${color} rounded`} style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'overview' | 'visitors' | 'events'>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [vPage, setVPage] = useState(1)
  const [vOnline, setVOnline] = useState(false)
  const [vIp, setVIp] = useState('')
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [vTotal, setVTotal] = useState(0)
  const [ePage, setEPage] = useState(1)
  const [eType, setEType] = useState('all')
  const [events, setEvents] = useState<TrackEvent[]>([])
  const [eTotal, setETotal] = useState(0)
  const [days, setDays] = useState(14)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics/stats?days=${days}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('加载失败')
      setStats(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [days])

  const loadVisitors = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(vPage), pageSize: '15' })
      if (vOnline) params.set('online', '1')
      if (vIp) params.set('ip', vIp)
      const res = await fetch(`/api/admin/analytics/visitors?${params}`, { cache: 'no-store' })
      const data = await res.json()
      setVisitors(data.visitors || [])
      setVTotal(data.total || 0)
    } catch {}
  }, [vPage, vOnline, vIp])

  const loadEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(ePage), pageSize: '20', type: eType })
      const res = await fetch(`/api/admin/analytics/events?${params}`, { cache: 'no-store' })
      const data = await res.json()
      setEvents(data.events || [])
      setETotal(data.total || 0)
    } catch {}
  }, [ePage, eType])

  useEffect(() => {
    if (tab === 'overview') loadStats()
    if (tab === 'visitors') loadVisitors()
    if (tab === 'events') loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, days, vPage, vOnline, vIp, ePage, eType])

  const refresh = () => {
    setLoading(true)
    if (tab === 'overview') loadStats().finally(() => setLoading(false))
    if (tab === 'visitors') loadVisitors()
    if (tab === 'events') loadEvents()
  }

  const o = stats?.overview

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">访客统计</h1>
          <p className="text-sm text-gray-500 mt-1">前台埋点自动采集：访客 IP、页面停留时长、点击/滚动/表单等动作</p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
        >
          <Activity size={15} /> 刷新
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 w-fit">
        {(
          [
            ['overview', '数据概览'],
            ['visitors', `访客明细${stats ? `（${stats.overview.totalVisitors}）` : ''}`],
            ['events', '动作事件'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === k ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">加载失败：{error}</div>}

      {tab === 'overview' && (
        <>
          {/* 概览卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
            <StatCard icon={<Radio size={20} />} label="实时在线" value={o?.onlineCount ?? '-'} color="bg-green-100 text-green-600" />
            <StatCard icon={<Users size={20} />} label="今日访客" value={o?.todayVisitors ?? '-'} sub={`累计 ${o?.totalVisitors ?? '-'}`} color="bg-red-100 text-red-600" />
            <StatCard icon={<Eye size={20} />} label="今日浏览" value={o?.todayPageViews ?? '-'} sub={`累计 ${o?.totalPageViews ?? '-'}`} color="bg-blue-100 text-blue-600" />
            <StatCard icon={<MousePointerClick size={20} />} label="今日动作" value={o?.todayEvents ?? '-'} sub={`累计 ${o?.totalEvents ?? '-'}`} color="bg-purple-100 text-purple-600" />
            <StatCard icon={<Users size={20} />} label="访客总数" value={o?.totalVisitors ?? '-'} color="bg-indigo-100 text-indigo-600" />
            <StatCard icon={<Eye size={20} />} label="浏览总数" value={o?.totalPageViews ?? '-'} color="bg-cyan-100 text-cyan-600" />
            <StatCard icon={<MousePointerClick size={20} />} label="动作总数" value={o?.totalEvents ?? '-'} color="bg-amber-100 text-amber-600" />
            <StatCard icon={<Clock size={20} />} label="平均停留(秒)" value={o?.avgDuration ?? '-'} color="bg-teal-100 text-teal-600" />
          </div>

          {/* 趋势图 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-red-600" /> 近 {days} 天访问趋势
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {d}天
                    </button>
                  ))}
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block" /> 访客</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> 浏览</span>
                </div>
              </div>
            </div>
            {stats?.trend?.length ? <TrendChart data={stats.trend} /> : <div className="text-center text-gray-400 py-10">暂无数据</div>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 热门页面 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">热门页面 TOP10</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="py-1.5">页面</th>
                    <th className="py-1.5 text-right">浏览</th>
                    <th className="py-1.5 text-right">平均停留</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.topPages || []).map((p, i) => (
                    <tr key={p.path} className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-700 truncate max-w-[180px]">
                        <span className="text-gray-400 mr-1.5">{i + 1}.</span>
                        {p.path}
                      </td>
                      <td className="py-1.5 text-right font-medium">{p.views}</td>
                      <td className="py-1.5 text-right text-gray-500">{p.views ? fmtDur(Math.round(p.duration / p.views)) : '-'}</td>
                    </tr>
                  ))}
                  {!stats?.topPages?.length && <tr><td colSpan={3} className="py-6 text-center text-gray-400">暂无数据</td></tr>}
                </tbody>
              </table>
            </div>

            {/* 来源 + 设备 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
              <div>
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Globe size={15} className="text-red-600" /> 来源分析</h2>
                <BarList items={stats?.sources || []} color="bg-red-500" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Monitor size={15} className="text-red-600" /> 设备类型</h2>
                <BarList
                  items={(stats?.devices || []).map((d) => ({ ...d, name: deviceLabel[d.name] || d.name }))}
                  color="bg-blue-500"
                />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap size={15} className="text-red-600" /> 动作事件 TOP10</h2>
                <BarList items={stats?.eventTop || []} color="bg-purple-500" />
              </div>
            </div>

            {/* 浏览器 + 系统 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">浏览器分布</h2>
                <BarList items={stats?.browsers || []} color="bg-emerald-500" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">操作系统</h2>
                <BarList items={stats?.osList || []} color="bg-amber-500" />
              </div>
            </div>
          </div>

          {/* 地域分布 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-red-600" /> 地域分布
              <span className="text-xs font-normal text-gray-400">基于 IP 实时解析（内网/未知 IP 显示为本地）</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-xs text-gray-400 mb-3">国家 / 地区</h3>
                <BarList items={stats?.geoCountries || []} color="bg-red-500" />
                {!stats?.geoCountries?.length && <div className="text-center text-gray-400 py-4 text-sm">暂无数据</div>}
              </div>
              <div>
                <h3 className="text-xs text-gray-400 mb-3">省份 / 州</h3>
                <BarList items={stats?.geoRegions || []} color="bg-blue-500" />
                {!stats?.geoRegions?.length && <div className="text-center text-gray-400 py-4 text-sm">暂无数据</div>}
              </div>
              <div>
                <h3 className="text-xs text-gray-400 mb-3">城市</h3>
                <BarList items={stats?.geoCities || []} color="bg-emerald-500" />
                {!stats?.geoCities?.length && <div className="text-center text-gray-400 py-4 text-sm">暂无数据</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'visitors' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="font-semibold text-gray-900 mr-2">访客明细</h2>
            <input
              value={vIp}
              onChange={(e) => { setVIp(e.target.value); setVPage(1) }}
              placeholder="按 IP 筛选"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={vOnline} onChange={(e) => { setVOnline(e.target.checked); setVPage(1) }} className="accent-red-600" />
              只看在线
            </label>
            <span className="text-sm text-gray-400 ml-auto">共 {vTotal} 位访客</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2">IP</th>
                  <th className="py-2">地域</th>
                  <th className="py-2">设备/浏览器</th>
                  <th className="py-2">系统</th>
                  <th className="py-2">语种</th>
                  <th className="py-2">落地页</th>
                  <th className="py-2 text-right">浏览</th>
                  <th className="py-2 text-right">动作</th>
                  <th className="py-2 text-right">累计停留</th>
                  <th className="py-2">首次访问</th>
                  <th className="py-2">最近活跃</th>
                  <th className="py-2">状态</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => {
                  const online = Date.now() - new Date(v.lastSeenAt).getTime() < 5 * 60 * 1000
                  return (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="py-2 font-mono text-xs">{v.ip || '-'}</td>
                      <td className="py-2 text-gray-600 text-xs">
                        {v.country === '本地/内网' || v.country === null ? (
                          <span className="text-gray-400">本地/内网</span>
                        ) : (
                          <span title={[v.country, v.region, v.city].filter(Boolean).join(' · ')}>
                            {v.country}
                            {v.region && <span className="text-gray-400"> · {v.region}</span>}
                            {v.city && <span className="text-gray-400"> · {v.city}</span>}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-gray-600">{deviceLabel[v.deviceType || ''] || v.deviceType || '-'} · {v.browser || '-'}</td>
                      <td className="py-2 text-gray-600">{v.os || '-'}</td>
                      <td className="py-2 text-gray-600">{v.language || '-'}</td>
                      <td className="py-2 text-gray-500 truncate max-w-[150px]">{v.landingPage || '-'}</td>
                      <td className="py-2 text-right">{v.pageViewCount}</td>
                      <td className="py-2 text-right">{v.eventCount}</td>
                      <td className="py-2 text-right text-gray-500">{fmtDur(v.totalDuration)}</td>
                      <td className="py-2 text-gray-500 text-xs">{fmtDate(v.firstVisitAt)}</td>
                      <td className="py-2 text-gray-500 text-xs">{fmtDate(v.lastSeenAt)}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {online ? '在线' : '离线'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {!visitors.length && <tr><td colSpan={12} className="py-8 text-center text-gray-400">暂无访客数据</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end items-center gap-3 mt-4">
            <button disabled={vPage <= 1} onClick={() => setVPage(vPage - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40">上一页</button>
            <span className="text-sm text-gray-500">第 {vPage} / {Math.max(1, Math.ceil(vTotal / 15))} 页</span>
            <button disabled={vPage >= Math.ceil(vTotal / 15)} onClick={() => setVPage(vPage + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40">下一页</button>
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="font-semibold text-gray-900 mr-2">动作事件</h2>
            <select value={eType} onChange={(e) => { setEType(e.target.value); setEPage(1) }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg">
              <option value="all">全部类型</option>
              <option value="click">点击</option>
              <option value="scroll">滚动</option>
              <option value="form">表单</option>
            </select>
            <span className="text-sm text-gray-400 ml-auto">共 {eTotal} 条</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2">时间</th>
                  <th className="py-2">类型</th>
                  <th className="py-2">IP</th>
                  <th className="py-2">分类</th>
                  <th className="py-2">动作 / 内容</th>
                  <th className="py-2">所在页面</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="py-2 text-gray-500 text-xs">{fmtDate(ev.createdAt)}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ev.type === 'click' ? 'bg-blue-100 text-blue-700' : ev.type === 'scroll' ? 'bg-amber-100 text-amber-700' : ev.type === 'form' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {{ click: '点击', scroll: '滚动', form: '表单' }[ev.type] || ev.type}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-xs">{ev.visitor?.ip || '-'}</td>
                    <td className="py-2 text-gray-600">{ev.category || '-'}</td>
                    <td className="py-2 text-gray-700 truncate max-w-[260px]">
                      <span className="text-gray-500">{ev.action || ''}</span>
                      {ev.label && <span className="text-gray-800"> · {ev.label}</span>}
                      {ev.value && <span className="text-gray-400"> · {ev.value}</span>}
                    </td>
                    <td className="py-2 text-gray-500 truncate max-w-[150px]">{ev.url || '-'}</td>
                  </tr>
                ))}
                {!events.length && <tr><td colSpan={6} className="py-8 text-center text-gray-400">暂无事件数据</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end items-center gap-3 mt-4">
            <button disabled={ePage <= 1} onClick={() => setEPage(ePage - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40">上一页</button>
            <span className="text-sm text-gray-500">第 {ePage} / {Math.max(1, Math.ceil(eTotal / 20))} 页</span>
            <button disabled={ePage >= Math.ceil(eTotal / 20)} onClick={() => setEPage(ePage + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40">下一页</button>
          </div>
        </div>
      )}

      {loading && tab === 'overview' && !stats && <div className="text-center text-gray-400 py-16">加载中…</div>}
    </div>
  )
}
