"use client";
/**
 * 对外 API 网关管理（能力市场 → API 网关）
 * =====================================================
 * 密钥管理（创建/充值/吊销）、调用用量（审计聚合）、能力单价展示与调整。
 */
import { useEffect, useState } from "react";

interface GatewayKey {
  key: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  balance?: number | null;
  totalUsed?: number;
}
interface UsageStat { calls: number; credits: number; last: string }
interface PricingEntry { rule: { credits: number; perChar?: number; note: string }; source: string }

export default function GatewayAdminPage() {
  const [keys, setKeys] = useState<GatewayKey[]>([]);
  const [usage, setUsage] = useState<Record<string, UsageStat>>({});
  const [pricing, setPricing] = useState<Record<string, PricingEntry>>({});
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await fetch("/api/admin/gateway", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        setKeys(d.keys || []);
        setUsage(d.usage || {});
        setPricing(d.pricing || {});
      } else setMsg(d.error || "加载失败");
    } catch { setMsg("加载失败"); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function act(action: string, payload: Record<string, any>, okMsg: string) {
    setMsg("处理中...");
    try {
      const r = await fetch(`/api/admin/gateway?action=${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      setMsg(d.ok ? okMsg : (d.error || "失败"));
      if (d.ok) { setName(""); setBalance(""); load(); }
    } catch { setMsg("请求失败"); }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, sans-serif", color: "#1f2937" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>对外 API 网关</h1>
      <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 14 }}>
        第三方系统通过 <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>/api/integration/[capability]</code> 调用公开能力，统一鉴权 / 限流 / 计费 / 审计。
      </p>

      {msg && <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "8px 12px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{msg}</div>}

      {/* 新建 key */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>新建 API Key</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="用途说明（如：ERP 对接）"
            style={{ flex: "1 1 200px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
          <input value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="初始积分（留空=不限）" type="number"
            style={{ width: 160, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
          <button onClick={() => act("create", { name: name || "未命名", balance: balance === "" ? undefined : Number(balance) }, "创建成功")}
            style={{ padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>创建</button>
        </div>
      </div>

      {/* 密钥列表 */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>API Key 列表</h2>
        {loading ? <p style={{ color: "#9ca3af" }}>加载中...</p> : keys.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>暂无密钥，先新建一个。</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "8px 10px" }}>名称</th>
                <th style={{ padding: "8px 10px" }}>Key</th>
                <th style={{ padding: "8px 10px" }}>积分余额</th>
                <th style={{ padding: "8px 10px" }}>累计调用</th>
                <th style={{ padding: "8px 10px" }}>累计消耗</th>
                <th style={{ padding: "8px 10px" }}>最近使用</th>
                <th style={{ padding: "8px 10px" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const u = usage[(k.key.slice(-6)).padStart(6, "*")];
                return (
                  <tr key={k.key} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{k.name}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 12 }}>
                      {k.key.length > 16 ? k.key.slice(0, 8) + "…" + k.key.slice(-6) : k.key}
                      <button onClick={() => { navigator.clipboard.writeText(k.key); setMsg("已复制完整 Key"); }}
                        style={{ marginLeft: 8, fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}>复制</button>
                    </td>
                    <td style={{ padding: "8px 10px" }}>{k.balance === null || k.balance === undefined ? "不限" : <span style={{ fontWeight: 600, color: "#047857" }}>{k.balance}</span>}</td>
                    <td style={{ padding: "8px 10px" }}>{u?.calls ?? 0}</td>
                    <td style={{ padding: "8px 10px" }}>{u?.credits ?? k.totalUsed ?? 0}</td>
                    <td style={{ padding: "8px 10px", color: "#6b7280" }}>{k.lastUsed ? new Date(k.lastUsed).toLocaleString("zh-CN") : "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <button onClick={() => { const v = prompt("充值后积分余额（留空=不限）：", String(k.balance ?? "")); if (v !== null) act("charge", { key: k.key, balance: v === "" ? null : Number(v) }, "已更新余额"); }}
                        style={{ padding: "4px 12px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", marginRight: 6 }}>充值</button>
                      <button onClick={() => { if (confirm(`吊销 Key「${k.name}」？`)) act("revoke", { key: k.key }, "已吊销"); }}
                        style={{ padding: "4px 12px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>吊销</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 能力单价 */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>能力单价（credits 积分制）</h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>积分余额不足时网关返回 402。单价可在此调整，写入 site_config.plugin_api_pricing。</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "8px 10px" }}>能力</th>
              <th style={{ padding: "8px 10px" }}>基础积分/次</th>
              <th style={{ padding: "8px 10px" }}>每字符积分</th>
              <th style={{ padding: "8px 10px" }}>说明</th>
              <th style={{ padding: "8px 10px" }}>来源</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(pricing).map(([cap, p]) => (
              <tr key={cap} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: 500 }}>{cap}</td>
                <td style={{ padding: "8px 10px" }}>{p.rule.credits}</td>
                <td style={{ padding: "8px 10px" }}>{p.rule.perChar ?? "—"}</td>
                <td style={{ padding: "8px 10px", color: "#6b7280" }}>{p.rule.note}</td>
                <td style={{ padding: "8px 10px" }}>{p.source === "custom" ? <span style={{ color: "#b45309" }}>自定义</span> : "默认"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <button onClick={() => act("pricing", {}, "单价已重置为默认")} disabled
            style={{ padding: "6px 16px", background: "#e5e7eb", color: "#9ca3af", border: "none", borderRadius: 8, fontSize: 13, cursor: "not-allowed" }}>
            单价调整请通过 API 网关配置（默认价已内置）
          </button>
        </div>
      </div>
    </div>
  );
}
