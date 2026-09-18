"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  MessageSquare,
  RefreshCw,
  Database,
  CheckCircle,
  Filter,
  CheckCheck,
  ExternalLink,
  Clock,
  ShoppingCart,
} from "lucide-react";
import {
  mergeReadState,
  markNotificationRead,
  markAllNotificationsRead,
  countUnread,
} from "@/lib/notifications-read";

interface NotificationItem {
  id: string;
  type: "message" | "system" | "collection" | "backup";
  title: string;
  content: string;
  time: string;
  read: boolean;
  link?: string;
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; badge: string }> = {
  message: {
    label: "留言",
    icon: <MessageSquare size={16} />,
    color: "text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  collection: {
    label: "采集",
    icon: <Database size={16} />,
    color: "text-purple-600",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  shop: {
    label: "商城订单",
    icon: <ShoppingCart size={16} />,
    color: "text-amber-600",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  system: {
    label: "系统",
    icon: <RefreshCw size={16} />,
    color: "text-green-600",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  backup: {
    label: "备份",
    icon: <CheckCircle size={16} />,
    color: "text-gray-600",
    badge: "bg-gray-50 text-gray-700 border-gray-200",
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "message" | "collection" | "system" | "shop">("all");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications?limit=100");
      const data = await res.json();
      if (Array.isArray(data)) {
        const list = data.map((n: any) => ({
          id: String(n.id),
          type: n.type || "system",
          title: n.title || "通知",
          content: n.content || "",
          time: n.time || "刚刚",
          read: !!n.read,
          link: n.link,
        }));
        setNotifications(mergeReadState(list));
      }
    } catch (e) {
      console.error("加载通知失败", e);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = countUnread(notifications);

  const handleClick = (n: NotificationItem) => {
    if (!n.read) {
      markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) router.push(n.link);
  };

  const handleMarkAll = () => {
    markAllNotificationsRead(notifications.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  const countBy = (t: "message" | "collection" | "system" | "shop") => notifications.filter((n) => n.type === t).length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">通知中心</h1>
          <p className="text-sm text-gray-500 mt-1">聚合留言、采集、系统等事件的实时通知，点击直达处理</p>
        </div>
        <button
          onClick={handleMarkAll}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <CheckCheck size={16} />
          全部已读
        </button>
      </div>

      {/* 筛选统计 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter size={16} className="text-gray-400" />
            筛选
          </div>
          <div className="text-xs text-gray-500">
            共 <span className="font-medium text-gray-900">{notifications.length}</span> 条通知 · 未读{" "}
            <span className="font-medium text-red-600">{unreadCount}</span> 条
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              filter === "all" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              filter === "unread" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            未读（{unreadCount}）
          </button>
          {(["message", "collection", "system", "shop"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                filter === t ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {TYPE_META[t].label}（{countBy(t)}）
            </button>
          ))}
        </div>
      </div>

      {/* 通知列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Bell size={32} className="text-gray-300 mx-auto mb-2" />
            <div className="text-sm text-gray-400">暂无通知</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !n.read ? "bg-red-50/30" : ""
                  }`}
                >
                  <div className={`mt-0.5 ${meta.color}`}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{n.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${meta.badge}`}>{meta.label}</span>
                      {!n.read && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0"></span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 break-all">{n.content}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <Clock size={11} />
                      <span>{n.time}</span>
                      {n.link && (
                        <span className="inline-flex items-center gap-0.5 text-blue-500">
                          点击直达 <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
