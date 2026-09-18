"use client";

/**
 * 访客行为热力图 · 后台页
 * 选择页面 → 20x20 点击热力图（Canvas）+ 滚动深度分布
 */
import { useEffect, useState } from "react";
import { MousePointerClick, ScrollText } from "lucide-react";

export default function HeatmapPage() {
  const [data, setData] = useState<any>(null);
  const [paths, setPaths] = useState<[string, number][]>([]);
  const [selected, setSelected] = useState("/");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/heatmap?path=" + encodeURIComponent(selected))
      .then((r) => r.json())
      .then((d) => { setData(d); setPaths(d.paths || []); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selected]);

  useEffect(() => {
    if (!data || typeof window === "undefined") return;
    const el = document.getElementById("hm-canvas") as HTMLCanvasElement | null;
    if (!el) return;
    const G = data.gridSize || 20;
    const W = el.width, H = el.height;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const cellW = W / G, cellH = H / G;
    const max = data.maxCell || 1;
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        const v = (data.grid?.[gy]?.[gx]) || 0;
        if (!v) continue;
        const alpha = 0.08 + 0.92 * (v / max);
        ctx.fillStyle = `rgba(204, 0, 0, ${alpha.toFixed(3)})`;
        ctx.fillRect(gx * cellW + 1, gy * cellH + 1, cellW - 2, cellH - 2);
      }
    }
  }, [data]);

  // 滚动深度柱状（纯 div）
  const renderDepth = () => {
    const bins = data?.depthBins || [];
    const max = data?.maxDepth || 1;
    return (
      <div className="flex items-end gap-2 h-40">
        {bins.map((v: number, i: number) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-red-500/80 rounded-t" style={{ height: `${Math.max(4, (v / max) * 120)}px` }} title={`${v} 次`}></div>
            <span className="text-[10px] text-gray-500">{i * 10}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">访客行为热力图</h1>
          <p className="text-sm text-gray-500">采集前台访客点击坐标与滚动深度，红色越深代表互动越密集。</p>
        </div>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          {paths.map(([p, c]) => <option key={p} value={p}>{p}（{c} 条）</option>)}
        </select>
      </div>

      {loading && <div className="text-gray-500">加载中...</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5"><MousePointerClick size={15} className="text-red-600" /> 点击热力图 · {data.path}（{data.total} 条记录）</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white relative" style={{ aspectRatio: "16/9" }}>
              <canvas id="hm-canvas" width={640} height={360} className="w-full h-full"></canvas>
            </div>
            <p className="text-xs text-gray-400 mt-2">热区反映访客点击最密集的区域，可用于优化按钮/链接/CTA 位置。</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5"><ScrollText size={15} className="text-blue-600" /> 滚动深度分布</h2>
            {renderDepth()}
            <p className="text-xs text-gray-400 mt-2">柱越高代表越多访客滚动到该深度，可判断内容是否被完整阅读。</p>
          </div>
        </div>
      )}
    </div>
  );
}
