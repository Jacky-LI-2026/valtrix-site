"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, ShoppingCart, Users, Package } from "lucide-react";

interface StatBlock {
  sales: number;
  orders: number;
  avg: number;
}

export default function AdminShopStatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/admin/shop/stats");
      const d = await r.json();
      if (d.ok) setStats(d);
      else setError(d.error || "加载失败");
    } catch {
      setError("网络错误");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!stats || !chartRef.current) return;
    const el = chartRef.current;
    const days = stats.daily || [];
    const width = el.clientWidth || 800;
    const height = 280;
    el.innerHTML = "";
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const padL = 48, padR = 8, padT = 18, padB = 26;
    const maxSales = Math.max(...days.map((d: any) => d.sales), 1);
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const n = days.length;
    const bw = innerW / n;
    // 网格
    for (let g = 0; g <= 4; g++) {
      const y = padT + (innerH * g) / 4;
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", String(padL));
      line.setAttribute("y1", String(y));
      line.setAttribute("x2", String(width - padR));
      line.setAttribute("y2", String(y));
      line.setAttribute("stroke", "#F0EFEA");
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);
      const txt = document.createElementNS(svgNS, "text");
      txt.setAttribute("x", String(padL - 6));
      txt.setAttribute("y", String(y + 3));
      txt.setAttribute("text-anchor", "end");
      txt.setAttribute("font-size", "10");
      txt.setAttribute("fill", "#9CA3AF");
      txt.textContent = String(Math.round((maxSales * (4 - g)) / 4));
      svg.appendChild(txt);
    }
    // 柱
    days.forEach((d: any, i: number) => {
      const h = Math.max(1, (d.sales / maxSales) * innerH);
      const x = padL + i * bw + bw * 0.2;
      const w = bw * 0.6;
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(padT + innerH - h));
      rect.setAttribute("width", String(Math.max(2, w)));
      rect.setAttribute("height", String(h));
      rect.setAttribute("rx", "2");
      rect.setAttribute("fill", "#CC0000");
      rect.setAttribute("opacity", d.sales > 0 ? "0.85" : "0.12");
      svg.appendChild(rect);
      // 每 5 天标一个日期
      if (i % 5 === 0 || i === n - 1) {
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("x", String(x + w / 2));
        t.setAttribute("y", String(height - 8));
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", "10");
        t.setAttribute("fill", "#9CA3AF");
        t.textContent = d.date;
        svg.appendChild(t);
      }
    });
    el.appendChild(svg);
  }, [stats]);

  const cards = [
    { key: "today", label: "今日", icon: TrendingUp },
    { key: "yesterday", label: "昨日", icon: TrendingUp },
    { key: "week", label: "本周", icon: ShoppingCart },
    { key: "month", label: "本月", icon: Users },
  ];

  const statOf = (k: string): StatBlock => stats?.stats?.[k] || { sales: 0, orders: 0, avg: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">商城销售统计</h1>
          <p className="text-sm text-gray-500">已取消订单不计入销售额 · 累计订单 {stats?.stats?.totalOrders ?? "-"} 单 · 在售商品 {stats?.stats?.productCount ?? "-"} 个</p>
        </div>
        <button onClick={load} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">刷新</button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const s = statOf(c.key);
          const Icon = c.icon;
          return (
            <div key={c.key} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{c.label}</span>
                <Icon className="h-4 w-4 text-gray-300" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">¥{s.sales.toLocaleString()}</div>
              <div className="mt-1 text-xs text-gray-400">
                {s.orders} 单 · 客单价 ¥{s.avg.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-medium text-gray-900">近 30 天销售趋势（日销售额 ¥）</h2>
        <div ref={chartRef} className="mt-3 w-full" style={{ minHeight: 280 }} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-medium text-gray-900">商品销售排行 Top 10</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="py-2 pr-2 font-medium">排名</th>
              <th className="py-2 pr-2 font-medium">商品</th>
              <th className="py-2 pr-2 font-medium text-right">销量</th>
              <th className="py-2 font-medium text-right">销售额</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(stats?.rank || []).length === 0 && (
              <tr><td colSpan={4} className="py-10 text-center text-gray-400">暂无销售数据</td></tr>
            )}
            {(stats?.rank || []).map((r: any) => (
              <tr key={r.rank} className="text-gray-700">
                <td className="py-2.5 pr-2 text-gray-400">{r.rank}</td>
                <td className="py-2.5 pr-2 font-medium">{r.name}</td>
                <td className="py-2.5 pr-2 text-right">{r.qty}</td>
                <td className="py-2.5 text-right font-medium">¥{r.sales.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
