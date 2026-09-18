"use client";

/**
 * 运营驾驶舱
 * 聚合各商机渠道（询价/考察预约/表单/下载留资/留言）的 KPI、趋势、分布
 */
import { useEffect, useState } from "react";
import { Inbox, CalendarClock, FileText, MessageSquare, TrendingUp, Users } from "lucide-react";

const TYPE_ICON: Record<string, any> = {
  询价: Inbox,
  考察预约: CalendarClock,
  下载留资: FileText,
  表单提交: FileText,
  留言: MessageSquare,
};

export default function OperationsDashboard() {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/operations?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    if (!data) return;
    const loadEcharts = (): Promise<void> =>
      new Promise((resolve) => {
        if (typeof (window as any).echarts !== "undefined") return resolve();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js";
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });
    const renderCharts = () => {
      // 趋势折线
      const trendEl = document.getElementById("op-trend");
      if (trendEl && typeof (window as any).echarts !== "undefined") {
        const c = (window as any).echarts.init(trendEl);
        c.setOption({
          tooltip: { trigger: "axis" },
          grid: { left: 40, right: 16, top: 24, bottom: 30 },
          xAxis: { type: "category", data: data.trend.dates, axisLabel: { color: "#888", fontSize: 11 } },
          yAxis: { type: "value", minInterval: 1, axisLabel: { color: "#888", fontSize: 11 } },
          series: [{
            name: "商机数", type: "line", smooth: true, data: data.trend.values,
            itemStyle: { color: "#CC0000" }, areaStyle: { color: "rgba(204,0,0,0.08)" },
          }],
        });
      }
      // 渠道分布
      const typeEl = document.getElementById("op-type");
      if (typeEl && typeof (window as any).echarts !== "undefined") {
        const c = (window as any).echarts.init(typeEl);
        const colors = ["#CC0000", "#E8930C", "#2F6FED", "#16A34A", "#7C3AED"];
        c.setOption({
          tooltip: { trigger: "item" },
          series: [{
            type: "pie", radius: ["42%", "68%"],
            data: Object.entries(data.byType || {}).map(([k, v], i) => ({ name: k, value: v, itemStyle: { color: colors[i % colors.length] } })),
            label: { fontSize: 11 },
          }],
        });
      }
      // 国家分布
      const countryEl = document.getElementById("op-country");
      if (countryEl && typeof (window as any).echarts !== "undefined") {
        const c = (window as any).echarts.init(countryEl);
        const countries = (data.byCountry || []).map((x: any) => x[0]);
        const values = (data.byCountry || []).map((x: any) => x[1]);
        c.setOption({
          tooltip: { trigger: "axis" },
          grid: { left: 70, right: 16, top: 12, bottom: 30 },
          xAxis: { type: "value", minInterval: 1, axisLabel: { color: "#888", fontSize: 11 } },
          yAxis: { type: "category", data: countries, axisLabel: { color: "#555", fontSize: 11 } },
          series: [{ type: "bar", data: values, itemStyle: { color: "#2F6FED", borderRadius: [0, 4, 4, 0] }, label: { show: true, position: "right", fontSize: 10, color: "#555" } }],
        });
      }
    };
    loadEcharts().then(() => {
      renderCharts();
      const t = setTimeout(() => renderCharts(), 300);
      const onResize = () => {
        ["op-trend", "op-type", "op-country"].forEach((id) => {
          const el = document.getElementById(id);
          if (el && (el as any).__chart) (el as any).__chart.resize();
        });
      };
      window.addEventListener("resize", onResize);
      return () => { clearTimeout(t); window.removeEventListener("resize", onResize); };
    });
  }, [data]);

  const KPI_CARDS = [
    { label: "今日商机", value: data?.kpi?.today ?? "-", icon: TrendingUp, cls: "bg-red-50 text-red-600" },
    { label: "近 7 天商机", value: data?.kpi?.week ?? "-", icon: Users, cls: "bg-blue-50 text-blue-600" },
    { label: "累计商机", value: data?.kpi?.total ?? "-", icon: Inbox, cls: "bg-green-50 text-green-600" },
    { label: "表单数量", value: data?.kpi?.forms ?? "-", icon: FileText, cls: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">运营驾驶舱</h1>
          <p className="text-sm text-gray-500">聚合询价、考察预约、表单、下载留资、留言等商机渠道。</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded text-sm ${days === d ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              近{d}天
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-gray-500">加载中...</div>}

      {/* KPI 卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((c) => (
          <div key={c.label} className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.cls}`}><c.icon size={18} /></div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">{c.value}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 趋势 */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-2">商机趋势（近 {days} 天）</h2>
        <div id="op-trend" style={{ width: "100%", height: 260 }}></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-2">渠道分布</h2>
          <div id="op-type" style={{ width: "100%", height: 240 }}></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-2">客户地区分布（Top）</h2>
          <div id="op-country" style={{ width: "100%", height: 240 }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">询价状态</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data?.quoteStatus || {}).map(([k, v]) => (
              <div key={k} className="px-3 py-2 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">{v as any}</div>
                <div className="text-xs text-gray-500">{k}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">活跃表单</h2>
          {data?.topForms?.length ? (
            <div className="space-y-2">
              {data.topForms.map((f: any) => (
                <div key={f.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{f.name}</span>
                  <span className="text-sm text-gray-900 font-medium">{f.count} 次提交</span>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-gray-400">暂无表单数据</div>}
        </div>
      </div>
    </div>
  );
}
