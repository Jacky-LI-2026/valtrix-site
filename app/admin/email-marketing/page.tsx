"use client";

import { useEffect, useState } from "react";
import { Mail, Users, Trash2, Send, Eye, History } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  name?: string;
  group?: string;
  source?: string;
  status: string;
  createdAt?: string;
}

interface GroupStat {
  group: string;
  total: number;
  active: number;
}

interface Stats {
  total: number;
  active: number;
  unsubscribed: number;
}

interface Campaign {
  id: string;
  subject: string;
  group?: string;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdAt?: string;
}

export default function EmailMarketingPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, unsubscribed: 0 });
  const [groups, setGroups] = useState<GroupStat[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");

  // 群发表单
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sendGroup, setSendGroup] = useState(""); // "" = 全部活跃
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/email-marketing?status=${tab}`);
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        setItems(data.items);
        setStats(data.stats || { total: 0, active: 0, unsubscribed: 0 });
        setGroups(Array.isArray(data.groups) ? data.groups : []);
        setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const doDelete = async (id: string) => {
    if (!window.confirm("确认删除该订阅者？")) return;
    await fetch(`/api/admin/email-marketing?id=${id}`, { method: "DELETE" });
    load();
  };

  // 行内修改分组
  const doChangeGroup = async (id: string, group: string) => {
    await fetch("/api/admin/email-marketing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, group }),
    });
    load();
  };

  const doSend = async (isTest: boolean) => {
    if (!subject.trim() || !content.trim()) {
      setSendMsg({ type: "err", text: "请填写邮件主题和内容" });
      return;
    }
    if (isTest && !testEmail.trim()) {
      setSendMsg({ type: "err", text: "请输入测试收件邮箱" });
      return;
    }
    setSending(true);
    setSendMsg(null);
    try {
      const payload: any = { subject, content, status: "active" };
      if (isTest) payload.testEmail = testEmail.trim();
      else if (sendGroup) payload.group = sendGroup;
      const res = await fetch("/api/admin/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSendMsg({
          type: "ok",
          text: isTest
            ? `测试邮件已发送至 ${testEmail}`
            : `群发完成：成功 ${data.sent} 封${data.failed ? `，失败 ${data.failed} 封` : ""}`,
        });
        if (!isTest) { setSubject(""); setContent(""); setSendGroup(""); }
      } else {
        setSendMsg({ type: "err", text: data.error || "发送失败" });
      }
    } catch {
      setSendMsg({ type: "err", text: "发送失败" });
    } finally {
      setSending(false);
    }
  };

  const tabCls = (key: string) =>
    `px-4 py-2 text-sm rounded-md transition-colors ${
      tab === key ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-100"
    }`;

  // 目标分组的预计活跃人数
  const targetCount =
    sendGroup === "" ? stats.active : groups.find((g) => g.group === sendGroup)?.active || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">EDM 邮件营销</h1>
        <p className="text-gray-500 mt-1">管理邮件订阅者与分组，向活跃订阅者群发营销 / 资讯邮件</p>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "订阅总数", value: stats.total, icon: <Users size={18} /> },
          { label: "活跃订阅", value: stats.active, icon: <Mail size={18} /> },
          { label: "已退订", value: stats.unsubscribed, icon: <Trash2 size={18} /> },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">{c.label}</div>
              <div className="text-gray-400">{c.icon}</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      {/* 分组概览 */}
      {groups.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">订阅分组</div>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <span key={g.group} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 text-sm">
                <span className="text-gray-800">{g.group}</span>
                <span className="text-xs text-gray-500">活跃 {g.active} / 共 {g.total}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 订阅者列表 */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <button className={tabCls("active")} onClick={() => setTab("active")}>活跃</button>
            <button className={tabCls("unsubscribed")} onClick={() => setTab("unsubscribed")}>已退订</button>
            <button className={tabCls("all")} onClick={() => setTab("all")}>全部</button>
          </div>
          <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
            {loading && <div className="p-6 text-gray-400 text-sm">加载中...</div>}
            {!loading && items.length === 0 && (
              <div className="p-6 text-gray-400 text-sm text-center">暂无订阅者</div>
            )}
            {items.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900 truncate">
                    {s.email}
                    {s.name && <span className="text-gray-400 ml-2">{s.name}</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {s.source || "直接订阅"} · {s.createdAt ? new Date(s.createdAt).toLocaleDateString("zh-CN") : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.status === "active" && (
                    <select
                      value={s.group || ""}
                      onChange={(e) => doChangeGroup(s.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 focus:ring-2 focus:ring-red-500 outline-none"
                      title="修改分组"
                    >
                      <option value="">未分组</option>
                      {groups.map((g) => (
                        <option key={g.group} value={g.group}>{g.group}</option>
                      ))}
                      <option value="__new__" disabled>+ 输入新分组</option>
                    </select>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.status === "active" ? "活跃" : "已退订"}
                  </span>
                  <button onClick={() => doDelete(s.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="删除">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 群发表单 */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">群发邮件</h3>
            <p className="text-xs text-gray-400">自动附加退订链接；可指定分组，仅发送给该分组活跃订阅者</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标分组</label>
            <select
              value={sendGroup}
              onChange={(e) => setSendGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              <option value="">全部活跃订阅者（{stats.active} 人）</option>
              {groups.map((g) => (
                <option key={g.group} value={g.group}>
                  {g.group}（活跃 {g.active} 人）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮件主题</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="例如：新品发布 / 行业资讯"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮件内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="输入邮件正文，支持 HTML 标签（自动追加退订链接）"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">测试收件邮箱（可选）</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="先发一封测试邮件确认效果"
            />
          </div>
          {sendMsg && (
            <div className={`p-3 rounded-md text-sm ${sendMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {sendMsg.text}
            </div>
          )}
          <div className="flex gap-3 pt-2 items-center">
            <button
              onClick={() => doSend(true)}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Eye size={16} />
              {sending ? "发送中..." : "测试发送"}
            </button>
            <button
              onClick={() => doSend(false)}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
            >
              <Send size={16} />
              {sending ? "发送中..." : `群发${sendGroup ? `到「${sendGroup}」` : "给全部活跃"}（${targetCount} 人）`}
            </button>
          </div>
        </div>

        {/* 群发历史 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">群发历史（最近 20 条）</h2>
          </div>
          {campaigns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">暂无群发记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3 font-medium">主题</th>
                    <th className="py-2 pr-3 font-medium">分组</th>
                    <th className="py-2 pr-3 font-medium text-right">目标</th>
                    <th className="py-2 pr-3 font-medium text-right">成功</th>
                    <th className="py-2 pr-3 font-medium text-right">失败</th>
                    <th className="py-2 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2 pr-3 text-gray-700 max-w-[240px] truncate" title={c.subject}>{c.subject}</td>
                      <td className="py-2 pr-3 text-gray-500">{c.group || "全部活跃"}</td>
                      <td className="py-2 pr-3 text-right text-gray-500">{c.targetCount}</td>
                      <td className="py-2 pr-3 text-right text-green-600">{c.sentCount}</td>
                      <td className="py-2 pr-3 text-right text-red-500">{c.failedCount}</td>
                      <td className="py-2 text-gray-400 whitespace-nowrap">{c.createdAt ? new Date(c.createdAt).toLocaleString("zh-CN") : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
