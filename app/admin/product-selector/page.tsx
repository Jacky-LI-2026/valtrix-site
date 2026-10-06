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
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Power, Sparkles } from "lucide-react";

export default function ProductSelectorAdminPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/plugins", { cache: "no-store" });
    const d = await r.json();
    const row = (d?.list || []).find((x: any) => x.key === "product-selector");
    setEnabled(!!row?.enabled);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    </div>
  );
}
