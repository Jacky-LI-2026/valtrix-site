"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PRICING_MODES } from "@/lib/pricing";

interface PricingData {
  mode: string;
  updatedAt: string | null;
  customerTypes: { key: string; name: string; discount: number; seePartsPrice: boolean }[];
  levels: { key: string; name: string; discount: number }[];
}

export default function PricingSettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<PricingData | null>(null);
  const [mode, setMode] = useState("hidden");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/pricing", { cache: "no-store" });
    const d = await r.json();
    setData(d);
    setMode(d.mode || "hidden");
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setMsg("");
    const r = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(d.error || "保存失败"); return; }
    setMsg("✓ 已保存");
    await load();
    router.refresh();
    setTimeout(() => setMsg(""), 2500);
  }

  const modeMeta = PRICING_MODES.find((m) => m.key === mode);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">定价与价格显示</h1>
          <p className="text-sm text-gray-500 mt-1">
            控制前台价格可见性策略。产品参考价在「产品管理」中设置；客户分类折扣在「客户分类管理」中设置，会员等级折扣在「等级与权益」中设置，最终折扣取两者较大值。
          </p>
        </div>
        <button onClick={save} className="bg-red-600 text-white px-5 py-2 rounded text-sm hover:bg-red-700">保存设置</button>
      </div>

      {msg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded">{msg}</div>}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">价格显示模式</h2>
        <div className="space-y-3">
          {PRICING_MODES.map((m) => (
            <label
              key={m.key}
              className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition ${mode === m.key ? "border-red-400 bg-red-50/40" : "border-gray-200 hover:border-gray-300"}`}
            >
              <input
                type="radio"
                name="pricingMode"
                checked={mode === m.key}
                onChange={() => setMode(m.key)}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium">{m.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
              </div>
            </label>
          ))}
        </div>
        {modeMeta && (
          <p className="text-xs text-gray-400 mt-3">
            当前模式：<span className="text-red-600 font-medium">{modeMeta.label}</span>
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">客户分类折扣</h2>
          <p className="text-xs text-gray-400 mb-3">在「客户分类管理」中修改折扣与配件价格权限</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b">
                <th className="py-2">分类</th>
                <th className="py-2 text-center">折扣</th>
                <th className="py-2 text-center">可见配件价</th>
              </tr>
            </thead>
            <tbody>
              {data?.customerTypes.map((t) => (
                <tr key={t.key} className="border-b">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2 text-center">{t.discount}%</td>
                  <td className="py-2 text-center">{t.seePartsPrice ? "✓" : "—"}</td>
                </tr>
              ))}
              {(!data || data.customerTypes.length === 0) && (
                <tr><td colSpan={3} className="py-3 text-center text-gray-400 text-xs">暂无分类</td></tr>
              )}
            </tbody>
          </table>
          <a href="/admin/customer-types" className="inline-block mt-3 text-xs text-blue-600 hover:underline">前往客户分类管理 →</a>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">会员等级折扣</h2>
          <p className="text-xs text-gray-400 mb-3">在「等级与权益」中修改等级折扣</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b">
                <th className="py-2">等级</th>
                <th className="py-2 text-center">折扣</th>
              </tr>
            </thead>
            <tbody>
              {data?.levels.map((l) => (
                <tr key={l.key} className="border-b">
                  <td className="py-2">{l.name}</td>
                  <td className="py-2 text-center">{l.discount}%</td>
                </tr>
              ))}
              {(!data || data.levels.length === 0) && (
                <tr><td colSpan={2} className="py-3 text-center text-gray-400 text-xs">暂无等级</td></tr>
              )}
            </tbody>
          </table>
          <a href="/admin/member-levels" className="inline-block mt-3 text-xs text-blue-600 hover:underline">前往等级与权益 →</a>
        </div>
      </div>

      {data?.updatedAt && (
        <p className="text-xs text-gray-400">最近更新：{new Date(data.updatedAt).toLocaleString("zh-CN")}</p>
      )}
    </div>
  );
}
