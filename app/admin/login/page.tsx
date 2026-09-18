'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Lock, AlertCircle, Building2, CheckCircle2 } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [brand, setBrand] = useState<{ brandName: string; adminTitle: string; loginLogo: string; loginSubtitle: string; accentColor: string }>({
    brandName: 'VALTRIX',
    adminTitle: '后台管理系统',
    loginLogo: '',
    loginSubtitle: '',
    accentColor: '#CC0000',
  })

  // 加载白标品牌信息
  useEffect(() => {
    fetch('/api/public/brand')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok) setBrand({ ...brand, ...d })
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 系统未初始化（无管理员账号）时，引导到初始化页面
  useEffect(() => {
    const checkInit = async () => {
      try {
        const res = await fetch('/api/admin/setup/status')
        const data = await res.json()
        if (data && !data.initialized) {
          router.replace('/admin/setup')
        }
      } catch (e) {
        // 检测失败不阻塞登录页
      }
    }
    checkInit()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('用户名或密码错误')
        setLoading(false)
        return
      }

      const callbackUrl = searchParams.get('callbackUrl') || '/admin'
      // 整页跳转（session cookie 已写入，避免 SPA push 后 refresh 覆盖导致 URL 停留在登录页）
      window.location.assign(callbackUrl)
    } catch (err) {
      setError('登录失败，请重试')
      setLoading(false)
    }
  }

  const accent = brand.accentColor || '#CC0000'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 p-4">
      {/* 背景装饰：红色渐变光晕 + 网格 */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ backgroundColor: accent }}
        />
        <div
          className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full opacity-[0.08] blur-3xl"
          style={{ backgroundColor: accent }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="admin-modal-panel relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-2xl shadow-gray-200/60">
          {/* 顶部品牌条 */}
          <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white px-8 pb-6 pt-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl shadow-sm" style={{ backgroundColor: `${accent}14` }}>
              {brand.loginLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.loginLogo} alt="logo" className="h-9 w-9 object-contain" />
              ) : (
                <Building2 size={28} style={{ color: accent }} />
              )}
            </div>
            <h1 className="mt-3 text-xl font-bold tracking-tight text-gray-900">{brand.brandName}</h1>
            <p className="mt-1 text-sm text-gray-400">{brand.loginSubtitle || brand.adminTitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-8 py-6">
            {searchParams.get('setup') === '1' && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                管理员账号创建成功，请登录
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-600">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-transparent"
                  style={{ ['--tw-ring-color' as any]: `${accent}33` }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = accent
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}26`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                  placeholder="请输入用户名"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-600">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-gray-300"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = accent
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}26`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                  placeholder="请输入密码"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm"
              style={{ backgroundColor: accent }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  登录中...
                </span>
              ) : (
                '登 录'
              )}
            </button>

            <div className="pt-1 text-center text-[11px] text-gray-300">
              {brand.brandName} · 后台管理系统
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
