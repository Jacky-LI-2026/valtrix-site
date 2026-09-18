"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MessageSquare, Phone, Mail, Building, Clock, CheckCircle, XCircle, Trash2, Eye,
  User, StickyNote, Inbox, Handshake, BadgeCheck, Archive, MapPin,
} from "lucide-react";

// 状态定义（通用商机线索：新线索/跟进中/已成交/已关闭；contacted 兼容旧数据）
const STATUS_FILTERS = [
  { key: "all", label: "全部" },
  { key: "new", label: "新线索" },
  { key: "contacting", label: "跟进中" },
  { key: "deal", label: "已成交" },
  { key: "closed", label: "已关闭" },
];

const statusMap: Record<string, { label: string; color: string }> = {
  new: { label: "新线索", color: "bg-blue-100 text-blue-700" },
  contacting: { label: "跟进中", color: "bg-yellow-100 text-yellow-700" },
  contacted: { label: "已联系", color: "bg-yellow-100 text-yellow-700" },
  deal: { label: "已成交", color: "bg-green-100 text-green-700" },
  closed: { label: "已关闭", color: "bg-gray-100 text-gray-600" },
};

export default function LeadsAdminPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [assignDraft, setAssignDraft] = useState("");

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selected) {
      setNoteDraft(selected.notes || "");
      setAssignDraft(selected.assignedTo ? String(selected.assignedTo) : "");
    }
  }, [selected]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contact?status=${filter}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data?.data && Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const userName = (id: any) => {
    if (!id) return "";
    const u = users.find((x) => String(x.id) === String(id));
    return u ? (u.displayName || u.username) : "";
  };

  const updateLead = async (id: string, payload: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/contact/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchMessages();
        const updated = await res.json();
        if (selected && String(selected.id) === String(id)) {
          setSelected({ ...selected, ...updated });
        }
      }
    } catch (e) {
      alert("操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该商机？")) return;
    try {
      await fetch(`/api/admin/contact/${id}`, { method: "DELETE" });
      fetchMessages();
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      alert("删除失败");
    }
  };

  const stats = useMemo(() => {
    const s: Record<string, number> = { all: messages.length, new: 0, contacting: 0, deal: 0, closed: 0 };
    messages.forEach((m) => {
      if (m.status === "new") s.new++;
      else if (m.status === "contacting" || m.status === "contacted") s.contacting++;
      else if (m.status === "deal") s.deal++;
      else if (m.status === "closed") s.closed++;
    });
    return s;
  }, [messages]);

  const statCards = [
    { key: "all", label: "全部商机", value: stats.all, icon: Inbox, color: "text-gray-700 bg-gray-100" },
    { key: "new", label: "新线索", value: stats.new, icon: MessageSquare, color: "text-blue-600 bg-blue-50" },
    { key: "contacting", label: "跟进中", value: stats.contacting, icon: Handshake, color: "text-yellow-600 bg-yellow-50" },
    { key: "deal", label: "已成交", value: stats.deal, icon: BadgeCheck, color: "text-green-600 bg-green-50" },
    { key: "closed", label: "已关闭", value: stats.closed, icon: Archive, color: "text-gray-500 bg-gray-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">询盘商机管理</h1>
        <p className="text-gray-500 mt-1">网站留言 / 留资统一商机跟进（来源页面、负责人分配、成交闭环）</p>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((c) => (
          <div key={c.key} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{c.value}</div>
                <div className="text-xs text-gray-500">{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 状态筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                filter === item.key ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item.label} ({stats[item.key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 商机列表 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">加载中...</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-400">暂无商机</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selected?.id === msg.id ? "bg-red-50 border-l-4 border-red-600" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{msg.name}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusMap[msg.status]?.color || "bg-gray-100 text-gray-600"}`}>
                          {statusMap[msg.status]?.label || msg.status}
                        </span>
                        {msg.assignedTo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700">
                            <User size={12} />{userName(msg.assignedTo)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{msg.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1"><Phone size={12} />{msg.phone}</span>
                        {msg.email && <span className="flex items-center gap-1"><Mail size={12} />{msg.email}</span>}
                        {msg.source && <span className="flex items-center gap-1 text-gray-500">来源：{msg.source}</span>}
              <span className="flex items-center gap-1 text-gray-500">
                <MapPin size={12} />位置：
                {msg.country || msg.city || msg.ip ? (
                  <>
                    {[msg.country, msg.city].filter(Boolean).join(" ")}
                    {msg.ip ? <span className="font-mono text-xs"> {msg.ip}</span> : null}
                  </>
                ) : (
                  <span className="text-gray-400">历史数据（未采集）</span>
                )}
              </span>
                        <span className="flex items-center gap-1"><Clock size={12} />{new Date(msg.createdAt).toLocaleString("zh-CN")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 商机详情 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-h-[700px] overflow-y-auto">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">商机详情</h3>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusMap[selected.status]?.color}`}>
                  {statusMap[selected.status]?.label || selected.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{selected.name}</span>
                </div>
                {selected.company && (
                  <div className="flex items-center gap-2">
                    <Building size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{selected.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <a href={`tel:${selected.phone}`} className="text-sm text-red-600 hover:underline">{selected.phone}</a>
                </div>
                {selected.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <a href={`mailto:${selected.email}`} className="text-sm text-red-600 hover:underline">{selected.email}</a>
                  </div>
                )}
                {selected.subject && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">主题：</span>{selected.subject}
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">留言内容：</span>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{selected.message}</p>
                </div>
                {selected.source && (
                  <div className="text-xs text-gray-400">来源：{selected.source}</div>
                )}
                <div className="text-xs text-gray-400">
                  提交时间：{new Date(selected.createdAt).toLocaleString("zh-CN")}
                </div>
              </div>

              {/* 负责人分配 */}
              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                  <User size={13} /> 负责人
                </label>
                <div className="flex gap-2">
                  <select
                    value={assignDraft}
                    onChange={(e) => setAssignDraft(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  >
                    <option value="">未分配</option>
                    {users.map((u) => (
                      <option key={u.id} value={String(u.id)}>{u.displayName || u.username}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => updateLead(selected.id, { assignedTo: assignDraft })}
                    className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors"
                  >
                    分配
                  </button>
                </div>
              </div>

              {/* 跟进备注 */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                  <StickyNote size={13} /> 跟进备注
                </label>
                <textarea
                  rows={3}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="记录沟通情况、客户意向、下一步跟进计划..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <button
                  onClick={() => updateLead(selected.id, { notes: noteDraft })}
                  className="mt-2 px-3 py-1.5 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
                >
                  保存备注
                </button>
              </div>

              {/* 状态流转 */}
              <div className="pt-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">状态流转</label>
                <div className="flex flex-wrap gap-2">
                  {selected.status !== "contacting" && (
                    <button
                      onClick={() => updateLead(selected.id, { status: "contacting" })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 transition-colors"
                    >
                      <Handshake size={14} /> 跟进中
                    </button>
                  )}
                  {selected.status !== "deal" && (
                    <button
                      onClick={() => updateLead(selected.id, { status: "deal" })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                    >
                      <BadgeCheck size={14} /> 已成交
                    </button>
                  )}
                  {selected.status !== "closed" && (
                    <button
                      onClick={() => updateLead(selected.id, { status: "closed" })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                    >
                      <Archive size={14} /> 关闭
                    </button>
                  )}
                  {selected.status !== "new" && (
                    <button
                      onClick={() => updateLead(selected.id, { status: "new" })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                    >
                      <CheckCircle size={14} /> 重新打开
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Eye size={48} className="mb-4 opacity-50" />
              <p className="text-sm">点击左侧商机查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
