"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Member {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  customerNo: string | null;
  status: string;
  locale: string | null;
  level: string;
  customerType: string;
  customerTypeName: string;
  points: number;
  levelName: string;
  lastLoginAt: string | null;
  createdAt: string;
  favCount: number;
}

interface LevelOpt {
  key: string;
  name: string;
}

interface Stats {
  total: number;
  active: number;
  disabled: number;
  todayNew: number;
}

interface Detail {
  customerTypes?: { key: string; name: string }[];
  member: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    company: string | null;
    industry: string | null;
    country: string | null;
    customerNo: string | null;
    status: string;
    locale: string | null;
    level: string;
    customerType: string;
    points: number;
    levelName: string;
    lastLoginAt: string | null;
    createdAt: string;
    favTotal: number;
  };
  favorites: {
    id: string;
    createdAt: string;
    product: { id: string; slug: string; model: string; name: string; nameEn: string; images: any };
  }[];
  orders: {
    id: string;
    orderNo: string;
    amount: number;
    discountAmount: number;
    status: string;
    payMethod: string;
    itemCount: number;
    createdAt: string;
  }[];
}

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-") : "-";

export default function MembersPage() {
  const [list, setList] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, disabled: 0, todayNew: 0 });
  const [q, setQ] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [levelOpts, setLevelOpts] = useState<LevelOpt[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async (pageNo = 1, query = "", lv = "") => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/members?page=${pageNo}&size=${size}&q=${encodeURIComponent(query)}&level=${encodeURIComponent(lv)}`);
      const d = await r.json();
      if (d.ok) {
        setList(d.members);
        setStats(d.stats);
        setTotal(d.total);
        setPage(d.page);
        if (d.levels && d.levels.length) setLevelOpts(d.levels);
      }
    } finally {
      setLoading(false);
    }
  }, [size]);

  useEffect(() => {
    load(1, "", "");
  }, [load]);

  const doSearch = () => {
    setPage(1);
    load(1, q, levelFilter);
  };

  const toggleStatus = async (m: Member) => {
    const next = m.status === "active" ? "disabled" : "active";
    const r = await fetch(`/api/admin/members/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const d = await r.json();
    if (d.ok) {
      setMsg(`已${next === "active" ? "启用" : "禁用"} ${m.email}`);
      load(page, q, levelFilter);
    } else {
      setMsg("操作失败：" + (d.error || ""));
    }
  };

  const removeMember = async (m: Member) => {
    if (!confirm(`确认删除会员 ${m.email}？其收藏将一并删除，不可恢复。`)) return;
    const r = await fetch(`/api/admin/members/${m.id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.ok) {
      setMsg(`已删除 ${m.email}`);
      load(page, q, levelFilter);
    } else {
      setMsg("删除失败：" + (d.error || ""));
    }
  };

  const saveLevel = async () => {
    if (!detail) return;
    const r = await fetch(`/api/admin/members/${detail.member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: detail.member.level, points: detail.member.points }),
    });
    const d = await r.json();
    if (d.ok) {
      setMsg(`已更新等级/积分：${detail.member.email}`);
      setDetail(null);
      load(page, q, levelFilter);
    } else {
      setMsg("更新失败：" + (d.error || ""));
    }
  };

  const openDetail = async (m: Member) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const r = await fetch(`/api/admin/members/${m.id}`);
      const d = await r.json();
      if (d.ok) setDetail(d);
      else setMsg("获取详情失败：" + (d.error || ""));
    } finally {
      setDetailLoading(false);
    }
  };

  const cards = [
    { label: "会员总数", value: stats.total, cls: "text-gray-900" },
    { label: "正常启用", value: stats.active, cls: "text-green-600" },
    { label: "已禁用", value: stats.disabled, cls: "text-red-500" },
    { label: "今日新增", value: stats.todayNew, cls: "text-blue-600" },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">会员中心</h1>
        <p className="text-sm text-gray-500 mt-1">前台注册会员管理：搜索 / 启用禁用 / 查看收藏与订单</p>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 text-sm border border-green-200">{msg}</div>
      )}

      {/* 统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className={`text-2xl font-bold mt-1 ${c.cls}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 搜索 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="搜索邮箱 / 姓名 / 手机号 / 公司 / 客户编号"
          className="border rounded px-3 py-2 text-sm w-72"
        />
        <select
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setPage(1); load(1, q, e.target.value); }}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">全部等级</option>
          {levelOpts.map((lv) => (
            <option key={lv.key} value={lv.key}>{lv.name}</option>
          ))}
        </select>
        <button onClick={doSearch} className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700">
          搜索
        </button>
        <Link href="/admin/member-levels" className="ml-auto text-sm text-blue-600 hover:underline self-center">
          等级与权益管理 →
        </Link>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">客户编号</th>
              <th className="px-4 py-3 font-medium">邮箱</th>
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">公司</th>
              <th className="px-4 py-3 font-medium">手机</th>
              <th className="px-4 py-3 font-medium">等级</th>
              <th className="px-4 py-3 font-medium">客户分类</th>
              <th className="px-4 py-3 font-medium">积分</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">收藏</th>
              <th className="px-4 py-3 font-medium">最后登录</th>
              <th className="px-4 py-3 font-medium">注册时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={14} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={14} className="px-4 py-8 text-center text-gray-400">暂无会员数据</td></tr>
            ) : (
              list.map((m) => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{m.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.customerNo || "-"}</td>
                  <td className="px-4 py-3">{m.email}</td>
                  <td className="px-4 py-3">{m.name || "-"}</td>
                  <td className="px-4 py-3">{m.company || "-"}</td>
                  <td className="px-4 py-3">{m.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.level === "black" ? "bg-gray-900 text-white" :
                      m.level === "gold" ? "bg-amber-100 text-amber-700" :
                      m.level === "silver" ? "bg-slate-100 text-slate-600" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {m.levelName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.customerType === "machine" ? "bg-blue-100 text-blue-700" :
                      m.customerType === "parts" ? "bg-purple-100 text-purple-700" :
                      m.customerType === "material" ? "bg-teal-100 text-teal-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {m.customerTypeName || m.customerType || "inquiry"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{m.points}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${m.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {m.status === "active" ? "正常" : "已禁用"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{m.favCount}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(m.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openDetail(m)} className="text-blue-600 hover:underline">详情</button>
                      <button onClick={() => toggleStatus(m)} className="text-amber-600 hover:underline">
                        {m.status === "active" ? "禁用" : "启用"}
                      </button>
                      <button onClick={() => removeMember(m)} className="text-red-500 hover:underline">删除</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {total > size && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>共 {total} 条</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1, q)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              上一页
            </button>
            <span className="px-2 py-1">{page}</span>
            <button
              disabled={page * size >= total}
              onClick={() => load(page + 1, q)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 详情抽屉 */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/30 flex justify-end z-50" onClick={() => setDetail(null)}>
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">会员详情</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700">✕ 关闭</button>
            </div>
            {detailLoading ? (
              <div className="py-12 text-center text-gray-400">加载中...</div>
            ) : detail ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-4 mb-4">
                  <div><span className="text-gray-500">邮箱：</span>{detail.member.email}</div>
                  <div><span className="text-gray-500">姓名：</span>{detail.member.name || "-"}</div>
                  <div><span className="text-gray-500">手机：</span>{detail.member.phone || "-"}</div>
                  <div><span className="text-gray-500">语种：</span>{detail.member.locale || "zh"}</div>
                  <div><span className="text-gray-500">状态：</span>{detail.member.status === "active" ? "正常" : "已禁用"}</div>
                  <div><span className="text-gray-500">注册：</span>{fmtDate(detail.member.createdAt)}</div>
                  <div><span className="text-gray-500">最后登录：</span>{fmtDate(detail.member.lastLoginAt)}</div>
                  <div><span className="text-gray-500">收藏数：</span>{detail.member.favTotal}</div>
                </div>

                {/* 企业资料（米思米式 B 端信息） */}
                <div className="border rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">企业资料</h3>
                    {detail.member.customerNo && (
                      <span className="font-mono text-xs text-gray-500">客户编号 {detail.member.customerNo}</span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">公司名称</div>
                      <input
                        className="border rounded px-3 py-2 text-sm w-full"
                        value={detail.member.company || ""}
                        onChange={(e) => setDetail({ ...detail, member: { ...detail.member, company: e.target.value } })}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">客户分类</div>
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-3 py-2 text-sm w-full"
                          value={detail.member.customerType || "inquiry"}
                          onChange={(e) => setDetail({ ...detail, member: { ...detail.member, customerType: e.target.value } })}
                        >
                          {(detail.customerTypes || []).map((ct: any) => (
                            <option key={ct.key} value={ct.key}>{ct.name}（{ct.key}）</option>
                          ))}
                        </select>
                        {detail.member.customerType === "inquiry" && (
                          <button
                            onClick={() => setDetail({ ...detail, member: { ...detail.member, customerType: "parts" } })}
                            className="text-xs whitespace-nowrap text-purple-600 border border-purple-300 rounded px-2 py-1.5 hover:bg-purple-50"
                            title="该客户已购买，转为配件客户后可查看配件价格"
                          >
                            转为配件客户
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">配件价格仅对整机/配件客户开放；已购客户可一键转为配件客户</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">所属行业</div>
                        <select
                          className="border rounded px-3 py-2 text-sm w-full"
                          value={detail.member.industry || ""}
                          onChange={(e) => setDetail({ ...detail, member: { ...detail.member, industry: e.target.value } })}
                        >
                          <option value="">-</option>
                          <option value="semiconductor">半导体</option>
                          <option value="petrochemical">石油化工</option>
                          <option value="optical">光学</option>
                          <option value="newEnergy">新能源</option>
                          <option value="water-treatment">水处理</option>
                          <option value="precision">精密加工</option>
                          <option value="other">其他</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">国家/地区</div>
                        <input
                          className="border rounded px-3 py-2 text-sm w-full"
                          value={detail.member.country || ""}
                          onChange={(e) => setDetail({ ...detail, member: { ...detail.member, country: e.target.value } })}
                        />
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const r = await fetch(`/api/admin/members/${detail.member.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            company: detail.member.company,
                            industry: detail.member.industry,
                            country: detail.member.country,
                            customerType: detail.member.customerType || "inquiry",
                          }),
                        });
                        const d = await r.json();
                        setMsg(d.ok ? `已更新企业资料：${detail.member.email}` : "更新失败：" + (d.error || ""));
                        if (d.ok) { setDetail(null); load(page, q, levelFilter); }
                      }}
                      className="w-full bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
                    >
                      保存企业资料
                    </button>
                  </div>
                </div>

                {/* 等级 / 积分调整 */}
                <div className="border rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">等级与积分</h3>
                    <span className="text-xs text-gray-400">调整后保存立即生效</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">当前等级</div>
                      <select
                        className="border rounded px-3 py-2 text-sm w-full"
                        value={detail.member.level}
                        onChange={(e) => setDetail({ ...detail, member: { ...detail.member, level: e.target.value } })}
                      >
                        {levelOpts.map((lv) => (
                          <option key={lv.key} value={lv.key}>{lv.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-40">
                      <div className="text-xs text-gray-500 mb-1">积分</div>
                      <input
                        type="number"
                        min={0}
                        className="border rounded px-3 py-2 text-sm w-full"
                        value={detail.member.points}
                        onChange={(e) => setDetail({ ...detail, member: { ...detail.member, points: Math.max(0, Number(e.target.value) || 0) } })}
                      />
                    </div>
                    <button onClick={saveLevel} className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap">
                      保存调整
                    </button>
                  </div>
                </div>

                <h3 className="font-medium mb-2">商城订单（{detail.orders.length}）</h3>
                {detail.orders.length === 0 ? (
                  <div className="text-sm text-gray-400 mb-6">暂无订单</div>
                ) : (
                  <div className="mb-6 space-y-2">
                    {detail.orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                        <div>
                          <div className="font-medium">{o.orderNo}</div>
                          <div className="text-xs text-gray-400">{fmtDate(o.createdAt)} · {o.itemCount} 项 · {o.payMethod}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">¥{Number(o.amount - o.discountAmount).toFixed(2)}</div>
                          <div className={`text-xs ${o.status === "completed" ? "text-green-600" : o.status === "cancelled" ? "text-red-500" : "text-amber-600"}`}>
                            {o.status === "pending" ? "待确认" : o.status === "confirmed" ? "已确认" : o.status === "completed" ? "已完成" : o.status === "cancelled" ? "已取消" : o.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="font-medium mb-2">产品收藏（{detail.favorites.length}）</h3>
                {detail.favorites.length === 0 ? (
                  <div className="text-sm text-gray-400">暂无收藏</div>
                ) : (
                  <div className="space-y-2">
                    {detail.favorites.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 text-sm border rounded px-3 py-2">
                        <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                          {f.product.images?.[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.product.images[0]} alt={f.product.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{f.product.name}</div>
                          <div className="text-xs text-gray-400 truncate">{f.product.model} · {f.product.slug}</div>
                        </div>
                        <Link href={`/products/${f.product.slug}`} target="_blank" className="ml-auto text-blue-600 hover:underline text-xs">
                          查看产品
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
