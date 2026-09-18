"use client"

import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LogOut, Bell, MessageSquare, RefreshCw, Database, CheckCircle, ExternalLink } from 'lucide-react'
import { mergeReadState, markNotificationRead, markAllNotificationsRead, countUnread } from '@/lib/notifications-read'
// G2：客户端兜底品牌名一律走 `lib/brand.ts`，不得硬编码品牌名（同一份代码服务多个部署）
import { getBrandName } from '@/lib/brand'

interface Notification {
  id: string
  type: 'message' | 'system' | 'collection' | 'backup'
  title: string
  content: string
  time: string
  read: boolean
  link?: string
}

export default function AdminHeader({ user }: { user: any }) {
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [siteName, setSiteName] = useState(getBrandName())
  const notificationRef = useRef<HTMLDivElement>(null)

  // 从站点配置获取公司名称
  useEffect(() => {
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(data => {
        if (data.siteName) setSiteName(data.siteName)
      })
      .catch(() => {})
  }, [])

  // 加载通知
  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications')
      const data = await res.json()
      if (Array.isArray(data)) {
        const list = data.map((n: any) => ({
          id: String(n.id),
          type: n.type || 'system',
          title: n.title || '通知',
          content: n.content || '',
          time: n.time || '刚刚',
          read: !!n.read,
          link: n.link,
        }))
        setNotifications(mergeReadState(list))
      }
    } catch (e) {
      console.error('加载通知失败', e)
    }
  }

  // 点击外部关闭通知面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = () => {
    signOut({ redirect: false }).then(() => {
      router.push('/admin/login')
      router.refresh()
    })
  }

  const markAsRead = (id: string) => {
    markNotificationRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    const ids = notifications.map(n => n.id)
    markAllNotificationsRead(ids)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // 点击通知：标记已读 + 直达事件页面
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    setShowNotifications(false)
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const unreadCount = countUnread(notifications)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare size={16} className="text-blue-500" />
      case 'system': return <RefreshCw size={16} className="text-green-500" />
      case 'collection': return <Database size={16} className="text-purple-500" />
      case 'backup': return <CheckCircle size={16} className="text-gray-500" />
      default: return <Bell size={16} className="text-gray-500" />
    }
  }

  return (
    <header className="relative h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* 顶部品牌红线 */}
      <span className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-[#CC0000] via-[#CC0000]/70 to-transparent" />
      <div className="text-gray-600 text-sm">
        欢迎回来，<span className="font-medium text-gray-900">{user?.displayName || user?.username}</span>
        <span className="ml-3 text-xs text-gray-400">{siteName} · 后台管理系统</span>
      </div>

      <div className="flex items-center gap-4">
        {/* 返回前端首页 */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-gray-400 hover:text-red-600 text-sm transition-colors"
          title="返回前端首页"
        >
          <ExternalLink size={18} />
          <span className="hidden md:inline">前端首页</span>
        </a>

        {/* 通知铃铛 */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative rounded-full p-1.5 transition-colors ${showNotifications ? "bg-gray-100 text-gray-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
            title="通知中心"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#CC0000] px-1 text-[10px] font-semibold text-white tabular-nums">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* 通知下拉面板 */}
          {showNotifications && (
            <div className="admin-modal-panel absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 z-50">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">通知中心</span>
                {notifications.some((n) => !n.read) && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#CC0000] transition-colors hover:text-[#aa0000]"
                  >
                    全部已读
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-gray-400">
                    <Bell className="h-7 w-7 text-gray-200" />
                    <span className="text-sm">暂无通知</span>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`cursor-pointer border-b border-gray-50 px-4 py-3 transition-colors hover:bg-red-50/40 ${
                        !notification.read ? "bg-red-50/30" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${notification.read ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}>{notification.title}</span>
                            {!notification.read && <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-[#CC0000]"></span>}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{notification.content}</p>
                          <span className="mt-0.5 block text-[11px] text-gray-400">{notification.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-2">
                <button
                  onClick={() => {
                    setShowNotifications(false)
                    router.push('/admin/notifications')
                  }}
                  className="w-full rounded-md py-1 text-center text-xs font-medium text-gray-500 transition-colors hover:bg-white hover:text-[#CC0000]"
                >
                  查看全部通知
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#CC0000] to-[#8a0000] text-sm font-semibold text-white shadow-sm">
            {((user?.displayName || user?.username || "U") as string).slice(0, 1).toUpperCase()}
          </div>
          <div className="text-sm">
            <div className="font-medium leading-tight text-gray-900">{user?.displayName || user?.username}</div>
            <div className="text-xs leading-tight text-gray-400">
              {user?.roles?.includes('admin') ? '管理员' : (user?.isSales ? '销售' : '内容维护')}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-[#CC0000] text-sm"
          title="退出登录"
        >
          <LogOut size={16} />
          退出
        </button>
      </div>
    </header>
  )
}
