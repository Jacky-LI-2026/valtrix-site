'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clapperboard, Settings, Sparkles, ListVideo, Save, AlertCircle, CheckCircle2, Film } from 'lucide-react'

interface Task {
  id: string
  subject: string
  style: string
  duration: number
  lang: string
  script: any[]
  status: string
  videoUrl: string | null
  createdAt: string
  createdBy?: string
}

export default function AiVideoPage() {
  const [tab, setTab] = useState<'gen' | 'tasks'>('gen')
  const [cfg, setCfg] = useState<any>(null)
  const [subject, setSubject] = useState('')
  const [selling, setSelling] = useState('')
  const [style, setStyle] = useState('科技工业风')
  const [duration, setDuration] = useState(8)
  const [lang, setLang] = useState('zh')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<Task | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [msg, setMsg] = useState('')

  const loadCfg = useCallback(() => {
    fetch('/api/admin/ai-video/config').then((r) => r.json()).then((d) => { if (d.ok) setCfg(d.data) }).catch(() => {})
  }, [])
  const loadTasks = useCallback(() => {
    fetch('/api/admin/ai-video/generate').then((r) => r.json()).then((d) => { if (d.ok) setTasks(d.tasks || []) }).catch(() => {})
  }, [])

  useEffect(() => { loadCfg(); loadTasks() }, [loadCfg, loadTasks])

  const saveCfg = async () => {
    const res = await fetch('/api/admin/ai-video/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    const d = await res.json()
    if (d.ok) { setMsg('配置已保存'); setTimeout(() => setMsg(''), 3000) }
  }

  const generate = async () => {
    if (!subject.trim()) { setMsg('请填写视频主题'); return }
    setGenerating(true); setMsg('')
    try {
      const res = await fetch('/api/admin/ai-video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          sellingPoints: selling.split('\n').map((s) => s.trim()).filter(Boolean),
          style,
          duration,
          lang,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '生成失败')
      setResult(d.task)
      setMsg('分镜脚本生成成功')
      loadTasks()
    } catch (e: any) {
      setMsg(e.message || '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Clapperboard size={22} className="text-red-600" /> AI 视频生成</h1>
          <p className="text-gray-500 text-sm mt-1">输入主题与卖点，AI 自动生成专业分镜脚本；接入 Seedance/豆包视频能力后可一键渲染成片。</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 text-sm">
          <button onClick={() => setTab('gen')} className={`px-3 py-1.5 rounded-md flex items-center gap-1 ${tab === 'gen' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
            <Sparkles size={14} /> 分镜生成
          </button>
          <button onClick={() => setTab('tasks')} className={`px-3 py-1.5 rounded-md flex items-center gap-1 ${tab === 'tasks' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
            <ListVideo size={14} /> 任务记录（{tasks.length}）
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${msg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {msg.includes('成功') ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg}
        </div>
      )}

      {tab === 'gen' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded-xl p-4 bg-white">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Film size={16} className="text-red-600" /> 生成分镜脚本</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">视频主题 *</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="如：超高纯管阀件产品宣传片" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">核心卖点（每行一个）</label>
                <textarea value={selling} onChange={(e) => setSelling(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" placeholder={'自主知识产权\n生长速度快\n良率高'} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">风格</label>
                  <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full border rounded-lg px-2 py-2 text-sm outline-none">
                    <option>科技工业风</option>
                    <option>极简商务风</option>
                    <option>高端大气风</option>
                    <option>活力营销风</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">时长（秒）</label>
                  <input type="number" min={5} max={60} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 8)} className="w-full border rounded-lg px-2 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">文案语言</label>
                  <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full border rounded-lg px-2 py-2 text-sm outline-none">
                    <option value="zh">中文</option>
                    <option value="en">英文</option>
                  </select>
                </div>
              </div>
              <button onClick={generate} disabled={generating} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                <Sparkles size={15} /> {generating ? 'AI 生成中...' : 'AI 生成分镜脚本'}
              </button>
              <p className="text-xs text-gray-400">使用 DeepSeek 文本 AI（配置见 AI 设置）；生成结果仅作分镜文案，视频渲染需开通视频服务密钥。</p>
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-white">
            <h2 className="font-semibold mb-3">生成结果</h2>
            {result ? (
              <div className="space-y-3">
                {result.script.map((s: any, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span className="font-semibold text-gray-700">镜头 {i + 1} · {s.duration}s</span>
                      <span className="text-red-500">{s.visual?.split('，')[0]?.slice(0, 10)}...</span>
                    </div>
                    <div className="text-sm text-gray-700 mb-1"><span className="text-gray-400">画面：</span>{s.visual}</div>
                    <div className="text-sm text-gray-700"><span className="text-gray-400">旁白：</span>{s.voiceover}</div>
                    {s.subtitle && <div className="text-xs text-gray-400 mt-1">字幕：{s.subtitle}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-300 text-sm py-16 text-center">暂无结果<br />填写左侧表单生成分镜脚本</div>
            )}
          </div>
        </div>
      ) : (
        <div className="border rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">历史生成任务</h2>
            <button onClick={loadTasks} className="text-xs text-red-600 hover:underline">刷新</button>
          </div>
          {tasks.length === 0 ? (
            <div className="text-gray-300 text-sm py-16 text-center">暂无任务</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="px-4 py-2">任务号</th>
                  <th className="px-4 py-2">主题</th>
                  <th className="px-4 py-2">风格 / 时长</th>
                  <th className="px-4 py-2">镜头数</th>
                  <th className="px-4 py-2">状态</th>
                  <th className="px-4 py-2">创建人</th>
                  <th className="px-4 py-2">时间</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{t.id}</td>
                    <td className="px-4 py-2">{t.subject}</td>
                    <td className="px-4 py-2 text-gray-500">{t.style} / {t.duration}s</td>
                    <td className="px-4 py-2">{t.script?.length || 0}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">分镜已生成</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{t.createdBy}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(t.createdAt).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="mt-4 border rounded-xl p-4 bg-white">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Settings size={16} className="text-red-600" /> 视频服务配置</h2>
        {cfg && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">视频服务商</label>
              <select value={cfg.videoProvider} onChange={(e) => setCfg({ ...cfg, videoProvider: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none">
                <option value="seedance">豆包 Seedance（推荐）</option>
                <option value="volcengine">火山引擎</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">视频模型</label>
              <input value={cfg.videoModel} onChange={(e) => setCfg({ ...cfg, videoModel: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" placeholder="seedance_2.0" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">视频服务密钥（预留）</label>
              <input type="password" value={cfg.videoKey || ''} onChange={(e) => setCfg({ ...cfg, videoKey: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" placeholder="开通视频服务后填入" />
            </div>
            <div className="flex items-end">
              <button onClick={saveCfg} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center gap-1">
                <Save size={14} /> 保存配置
              </button>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">{cfg?.videoProviderNote || ''}</p>
      </div>
    </div>
  )
}
