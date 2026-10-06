"use client";

/**
 * 后台 · 产品快速选型（插件 product-selector）
 * ==========================================================================
 * 这个插件**不需要复杂配置**：选型维度是从产品中心的产品规格里**自动推导**的
 * （见 `lib/spec-facets.ts`），所以后台页只做三件事：
 *   ① 显示当前启用状态；② 一键启用/停用（走现有 `/api/admin/plugins` 的 toggle，不新增接口与权限码）；
 *   ③ 给前台选型页的直达链接 + 预览提示。
 *
 * 关联关系：选型结果就是**产品中心**的那棵树（`/api/public/products`），
 *   点结果卡片进的是产品详情页，加购走 `lib/quote-cart.ts`。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Power, Save, Sparkles } from "lucide-react";
import { deriveFacets, parseSpecRow } from "@/lib/spec-facets";

export default function ProductSelectorAdminPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /** 维度覆盖配置：改名 / 隐藏（存到插件 config，经 /api/public/plugins 的 configs 白名单下发给前台） */
  const [facetLabels, setFacetLabels] = useState<Record<string, string>>({});
  const [hiddenFacets, setHiddenFacets] = useState<string[]>([]);
  const [facetKeys, setFacetKeys] = useState<{ key: string; samples: string[]; count: number }[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/plugins", { cache: "no-store" });
    const d = await r.json();
    const row = (d?.list || []).find((x: any) => x.key === "product-selector");
    setEnabled(!!row?.enabled);
    const cfg = row?.config || {};
    setFacetLabels(cfg.facetLabels && typeof cfg.facetLabels === "object" ? cfg.facetLabels : {});
    setHiddenFacets(Array.isArray(cfg.hiddenFacets) ? cfg.hiddenFacets.map(String) : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * 自动推导全站选型维度键名（**在前端算**：直接用公开产品接口，不需要新增后台接口）。
   * 目的：把自动推导出来的脏键名（实测有 `MR尺 (in.`、`础订购号`）暴露给管理员改名/隐藏。
   */
  useEffect(() => {
    let alive = true;
    const loc = { get: (o: any, k: string) => String(o?.[k] || "") };
    fetch("/api/public/products?specs=40&lite=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const rows: any[] = [];
        for (const tab of d?.data || [])
          for (const c of tab.categories || [])
            for (const m of c.models || [])
              for (const s of m.specs || []) {
                try {
                  rows.push(parseSpecRow(s, loc));
                } catch {
                  /* ignore */
                }
              }
        const stat = new Map<string, { count: number; samples: Set<string> }>();
        for (const r of rows)
          for (const [k, v] of r.attrs) {
            const e = stat.get(k) || { count: 0, samples: new Set<string>() };
            e.count += 1;
            if (e.samples.size < 4) e.samples.add(v);
            stat.set(k, e);
          }
        const list = Array.from(stat.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 40)
          .map(([key, s]) => ({ key, count: s.count, samples: Array.from(s.samples) }));
        setFacetKeys(list);
      })
      .catch(() => {})
      .finally(() => alive && setLoadingKeys(false));
    return () => {
      alive = false;
    };
  }, []);

  const saveConfig = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "config", key: "product-selector", config: { facetLabels, hiddenFacets } }),
      });
      const d = await r.json();
      setMsg(d?.ok ? { ok: true, text: "维度配置已保存（前台选型器即时生效）" } : { ok: false, text: d?.error || "保存失败" });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "toggle", key: "product-selector" }),
      });
      const d = await r.json();
      if (d?.ok) {
        setEnabled(!!d.entry?.enabled);
        setMsg({ ok: true, text: d.entry?.enabled ? "已启用：前台会出现选型入口" : "已停用：前台入口隐藏" });
      } else {
        setMsg({ ok: false, text: d?.error || "操作失败" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-dark">产品快速选型</h1>
        <p className="text-sm text-dark-400 mt-1">
          三步式选型：类别 → 参数 → 匹配产品。维度从产品中心的产品规格自动推导，结果直接对应产品中心的型号。
        </p>
      </div>

      {msg && <div className={`text-sm px-4 py-2.5 rounded-lg ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg.text}</div>}

      <div className="bg-white rounded-xl border border-dark-100 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
              <Sparkles size={18} />
            </span>
            <div>
              <div className="font-semibold text-dark">插件状态</div>
              <div className="text-xs text-dark-400">
                {enabled === null ? "读取中…" : enabled ? "已启用（前台显示「快速选型」入口）" : "已停用（前台入口隐藏，页面仍可直达）"}
              </div>
            </div>
          </div>
          <button
            onClick={toggle}
            disabled={busy || enabled === null}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
              enabled ? "border border-dark-100 text-dark-600 hover:bg-dark-50" : "bg-primary text-white hover:bg-primary-600"
            }`}
          >
            {busy ? <Loader2 className="animate-spin" size={15} /> : <Power size={15} />}
            {enabled ? "停用" : "启用"}
          </button>
        </div>

        <div className="border-t border-dark-100 pt-4">
          <div className="text-sm font-semibold text-dark mb-2">前台入口</div>
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <a href="/products/selector" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
              <ExternalLink size={14} /> /products/selector（新窗口打开）
            </a>
            <span className="text-dark-300">|</span>
            <span className="text-dark-400 text-xs">产品中心页右上角也会出现「快速选型」按钮（插件启用时）</span>
          </div>
        </div>

        <div className="border-t border-dark-100 pt-4 text-xs text-dark-400 space-y-1.5">
          <div>· 选型维度（如「管外径 D(in.)」「MR尺寸 (in.)」）由产品规格自动推导，新增产品/规格后自动跟随，无需在此配置。</div>
          <div>· 结果卡片点进去就是产品中心的产品详情页；「加入询价车」与产品页同一套实现（货号/数量一并带入询价单）。</div>
        </div>
      </div>

      {/* ===== 维度改名 / 隐藏（P0-3）===== */}
      <div className="bg-white rounded-xl border border-dark-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="font-semibold text-dark">选型维度显示名</div>
            <div className="text-xs text-dark-400 mt-0.5">
              自动推导的键名可能不干净（如 <code className="text-dark-500">MR尺 (in.</code>）—— 这里可以改成规范名称，或直接隐藏不展示。
              改完立即对前台选型器生效。
            </div>
          </div>
          <button
            onClick={saveConfig}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} 保存维度配置
          </button>
        </div>

        {loadingKeys ? (
          <div className="text-sm text-dark-400 py-6 text-center">
            <Loader2 className="animate-spin inline me-2" size={15} /> 正在统计全站选型维度…
          </div>
        ) : facetKeys.length === 0 ? (
          <div className="text-sm text-dark-400 py-6 text-center">暂无可配置维度（产品规格为空时不会出现）</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-dark-50 text-dark-400 text-xs">
                <tr>
                  <th className="text-left px-3 py-2">原始键名</th>
                  <th className="text-left px-3 py-2">示例取值</th>
                  <th className="text-center px-3 py-2 w-24">出现</th>
                  <th className="text-left px-3 py-2 w-64">显示名（留空=用原名）</th>
                  <th className="text-center px-3 py-2 w-20">隐藏</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {facetKeys.map((f) => (
                  <tr key={f.key}>
                    <td className="px-3 py-2 font-mono text-xs text-dark-600 max-w-[220px] truncate" title={f.key}>
                      {f.key}
                    </td>
                    <td className="px-3 py-2 text-xs text-dark-400 max-w-[220px] truncate" title={f.samples.join(" | ")}>
                      {f.samples.join(" | ")}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-dark-400">{f.count}</td>
                    <td className="px-3 py-2">
                      <input
                        value={facetLabels[f.key] || ""}
                        onChange={(e) => setFacetLabels((p) => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.key}
                        className="w-full px-2 py-1.5 text-sm border border-dark-100 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={hiddenFacets.includes(f.key)}
                        onChange={(e) =>
                          setHiddenFacets((p) => (e.target.checked ? Array.from(new Set([...p, f.key])) : p.filter((x) => x !== f.key)))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
