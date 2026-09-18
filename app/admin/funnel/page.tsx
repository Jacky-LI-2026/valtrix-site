"use client";

import { useEffect, useState } from "react";

const STAGES_META: Record<string, { name: string; color: string }> = {
  visit: { name: "页面访问", color: "#8BC8EA" },
  visitor: { name: "访客数", color: "#9BBBF4" },
  deep: { name: "深度访客", color: "#A3D5E8" },
  interaction: { name: "高价值互动", color: "#94D8C3" },
  lead: { name: "商机留资", color: "#A2DDAA" },
  won: { name: "成交", color: "#52C41A" },
};

const LEVEL_STYLE: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-100",
  medium: "bg-amber-50 text-amber-600 border-amber-100",
  low: "bg-gray-50 text-gray-500 border-gray-100",
};

export default function FunnelPage() {
  const [range, setRange] = useState("30d");
  const [view, setView] = useState<"funnel" | "leads">("funnel");
  const [data, setData] = useState<any>(null);
  const [leads, setLeads] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async (r: string) => {
    setLoading(true);
    try {
      const [fd, ld] = await Promise.all([
        fetch(`/api/admin/funnel?range=${r}`).then((x) => x.json()),
        fetch(`/api/admin/funnel?range=${r}&view=leads`).then((x) => x.json()),
      ]);
      if (fd?.stages) setData(fd);
      if (ld?.leads) setLeads(ld);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(range);
  }, [range]);

  const maxVal = data?.stages?.length ? Math.max(...data.stages.map((s: any) => Number(s.value || 0)), 1) : 1;
  const rateText = (to: string) => {
    const r = data?.rates?.find((x: any) => x.to === to);
    return r ? r.rate : 0;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold">销售漏斗与线索评分</h1>
            <p className="mt-1 text-sm text-gray-500">
              基于访客浏览/互动/留资行为聚合的销售漏斗与意向评分（高价值互动=下载/询价/留言等事件）。
            </p>
          </div>
          <div className="flex items-center gap-1">
            {["7d", "30d", "90d"].map((r) => (
              <button key={r} type="button" onClick={() => setRange(r)}
                className={"rounded px-3 py-1.5 text-sm " + (range === r ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-600")}>
                {r === "7d" ? "近 7 天" : r === "30d" ? "近 30 天" : "近 90 天"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-1 border-b border-gray-100">
          {(["funnel", "leads"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={"border-b-2 px-4 py-2 text-sm " + (view === v ? "border-[var(--color-primary)] font-medium text-gray-800" : "border-transparent text-gray-400")}>
              {v === "funnel" ? "销售漏斗" : "线索评分"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-10 text-center text-sm text-gray-400">加载中…</div>}

      {!loading && view === "funnel" && data?.stages && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 漏斗图 */}
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <h3 className="mb-4 text-sm font-medium">转化漏斗（{range === "7d" ? "近 7 天" : range === "30d" ? "近 30 天" : "近 90 天"}）</h3>
            <div className="space-y-3">
              {data.stages.map((s: any, i: number) => {
                const meta = STAGES_META[s.key] || { name: s.key, color: "#ccc" };
                const w = Math.max(6, Math.round((Number(s.value) / maxVal) * 100));
                return (
                  <div key={s.key}>
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="font-medium text-gray-700">{i + 1}. {meta.name}</span>
                      <span className="text-gray-500">
                        {Number(s.value).toLocaleString()}
                        {i > 0 && <span className="ml-2 text-[var(--color-primary)]">↓ {rateText(s.key)}%</span>}
                      </span>
                    </div>
                    <div className="h-7 w-full overflow-hidden rounded bg-gray-50">
                      <div className="flex h-full items-center justify-end rounded px-2 text-[11px] font-medium text-white"
                        style={{ width: w + "%", background: meta.color }}>
                        {w > 18 ? Number(s.value).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* 指标卡 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.stages.map((s: any) => {
                const meta = STAGES_META[s.key] || { name: s.key, color: "#ccc" };
                return (
                  <div key={s.key} className="rounded-lg border border-gray-100 bg-white p-3">
                    <div className="text-xs text-gray-400">{meta.name}</div>
                    <div className="mt-1 text-xl font-semibold" style={{ color: meta.color }}>{Number(s.value).toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-4">
              <h3 className="mb-3 text-sm font-medium">层级转化率</h3>
              <div className="space-y-2 text-sm">
                {data.rates.map((r: any) => (
                  <div key={r.from + r.to} className="flex items-center justify-between">
                    <span className="text-gray-500">{STAGES_META[r.from]?.name || r.from} → {STAGES_META[r.to]?.name || r.to}</span>
                    <span className="font-medium" style={{ color: "var(--color-primary)" }}>{r.rate}%</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                口径：商机留资 = 留言 + 报价询价单；成交 = 状态为「成交」的商机。深度访客 = 浏览 ≥ 2 页的访客。
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && view === "leads" && (
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-medium">访客意向评分（Top 50）</h3>
            {leads?.summary && (
              <div className="flex gap-2 text-xs">
                <span className="rounded bg-red-50 px-2 py-0.5 text-red-600">高意向 {leads.summary.high}</span>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-600">中意向 {leads.summary.medium}</span>
                <span className="rounded bg-gray-50 px-2 py-0.5 text-gray-500">低意向 {leads.summary.low}</span>
              </div>
            )}
          </div>
          {!leads?.leads?.length ? (
            <div className="py-10 text-center text-sm text-gray-400">当前时间范围暂无访客数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                    <th className="px-3 py-2">意向</th>
                    <th className="px-3 py-2">评分</th>
                    <th className="px-3 py-2">访客</th>
                    <th className="px-3 py-2">地域</th>
                    <th className="px-3 py-2">设备</th>
                    <th className="px-3 py-2">关键行为</th>
                    <th className="px-3 py-2">最后活跃</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.leads.map((l: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="px-3 py-2">
                        <span className={"rounded border px-2 py-0.5 text-xs " + (LEVEL_STYLE[l.level] || LEVEL_STYLE.low)}>{l.levelText}</span>
                      </td>
                      <td className="px-3 py-2 font-semibold" style={{ color: "var(--color-primary)" }}>{l.score}</td>
                      <td className="max-w-[160px] truncate px-3 py-2 text-gray-600" title={l.visitorKey}>{l.ip || l.visitorKey?.slice(0, 20)}</td>
                      <td className="px-3 py-2 text-gray-500">{[l.country, l.region, l.city].filter(Boolean).join(" ") || "-"}</td>
                      <td className="px-3 py-2 text-gray-500">{l.browser || "-"} · {l.os || "-"}</td>
                      <td className="px-3 py-2 text-gray-500">{l.behaviors?.join("，") || "-"}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {l.lastSeenAt ? new Date(l.lastSeenAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
