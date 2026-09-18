"use client";

import { useState, useEffect, useCallback } from "react";
import { KeyRound, ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface LicenseState {
  activated: boolean;
  status: string;
  currentDomain: string;
  configuredDomains?: string[];
  siteName?: string;
  record: {
    cid: string;
    domains: string[];
    edition: string;
    exp: number;
    issued: number;
    seats: number;
    activatedAt: string;
  } | null;
  error?: string;
}

const EDITION_LABELS: Record<string, string> = {
  trial: "试用版",
  pro: "专业版",
  enterprise: "旗舰版",
};

export default function LicensePage() {
  const [state, setState] = useState<LicenseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/license");
      const data = await res.json();
      try {
        const scRes = await fetch("/api/admin/site-config");
        const sc = await scRes.json();
        data.siteName = sc.siteName || "";
        if (!data.configuredDomains || data.configuredDomains.length === 0) {
          data.configuredDomains = (sc.siteDomain || "").split(/[\r\n,，;；]/).map((d: string) => d.trim()).filter(Boolean);
        }
      } catch (e) { /* 站点配置获取失败不阻断 */ }
      setState(data);
    } catch (e) {
      setMessage({ type: "error", text: "获取授权状态失败" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const activate = async () => {
    if (!code.trim()) {
      setMessage({ type: "error", text: "请输入授权码" });
      return;
    }
    setActivating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "ok", text: data.message });
        setCode("");
        await fetchStatus();
      } else {
        setMessage({ type: "error", text: data.error || "激活失败" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "激活失败，请重试" });
    } finally {
      setActivating(false);
    }
  };

  const deactivate = async () => {
    if (!window.confirm("确定解除当前授权？解除后系统将进入未授权状态。")) return;
    setActivating(true);
    try {
      const res = await fetch("/api/admin/license", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "ok", text: data.message || "已解除授权" });
        await fetchStatus();
      } else {
        setMessage({ type: "error", text: data.error || "解除失败" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "解除失败" });
    } finally {
      setActivating(false);
    }
  };

  const statusBadge = () => {
    if (!state) return null;
    switch (state.status) {
      case "valid":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-green-50 text-green-700">
            <ShieldCheck size={14} /> 已授权（有效）
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-red-50 text-red-700">
            <XCircle size={14} /> 授权已过期
          </span>
        );
      case "domain-mismatch":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-yellow-50 text-yellow-700">
            <AlertTriangle size={14} /> 域名不匹配
          </span>
        );
      case "invalid":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-red-50 text-red-700">
            <ShieldAlert size={14} /> 授权数据无效
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
            <KeyRound size={14} /> 未授权
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <KeyRound size={24} className="text-red-600" />
            授权管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            本系统商用授权状态。当前站点：{state?.siteName || "（未配置站点名称）"}
            {state?.currentDomain ? `（${state.currentDomain}）` : ""}
          </p>
          {state?.configuredDomains && state.configuredDomains.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              站点配置域名（站点设置→域名信息）：{state.configuredDomains.join("，")}
            </p>
          )}
        </div>
        <div>{statusBadge()}</div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading && !state ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-400">
          加载中...
        </div>
      ) : (
        <>
          {/* 已授权信息 */}
          {state?.activated && state.record && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">授权信息</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-400">被授权方（授权码客户名）</div>
                  <div className="text-sm font-medium text-gray-800 mt-1">{state.record.cid}</div>
                  {state.siteName && (
                    <div className="text-xs text-gray-400 mt-1">站点名称：{state.siteName}（后台站点配置）</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-400">版本</div>
                  <div className="text-sm font-medium text-gray-800 mt-1">
                    {EDITION_LABELS[state.record.edition] || state.record.edition}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">授权站点数</div>
                  <div className="text-sm font-medium text-gray-800 mt-1">{state.record.seats}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">绑定域名</div>
                  <div className="text-sm font-medium text-gray-800 mt-1">
                    {state.record.domains.length ? state.record.domains.join(", ") : "不限"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">到期时间</div>
                  <div className="text-sm font-medium text-gray-800 mt-1">
                    {state.record.exp === 0
                      ? "永久"
                      : new Date(state.record.exp * 1000).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">激活时间</div>
                  <div className="text-sm font-medium text-gray-800 mt-1">
                    {new Date(state.record.activatedAt).toLocaleString("zh-CN")}
                  </div>
                </div>
              </div>
              {state.status !== "valid" && (
                <div className="mt-4 p-3 rounded-lg text-sm bg-yellow-50 text-yellow-700">
                  {state.status === "expired" && "当前授权已过期，请联系授权方续期（提供新授权码即可）。"}
                  {state.status === "domain-mismatch" && `当前站点域名（${state.currentDomain}${state.configuredDomains && state.configuredDomains.length ? "；配置域名：" + state.configuredDomains.join("，") : ""}）不在授权域名列表内，请在站点设置→域名信息中确认或联系授权方重新签发。`}
                  {state.status === "invalid" && "授权数据无效，请重新输入有效授权码。"}
                </div>
              )}
              <button
                onClick={deactivate}
                disabled={activating}
                className="mt-4 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                解除授权
              </button>
            </div>
          )}

          {/* 激活授权码 */}
          {!state?.activated || state.status === "expired" || state.status === "invalid" ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">激活授权</h2>
              <p className="text-sm text-gray-500 mb-4">
                请输入授权方提供的授权码（粘贴完整字符串，含前后所有字符）。
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="粘贴授权码..."
                  rows={3}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={activate}
                  disabled={activating}
                  className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  <KeyRound size={16} />
                  {activating ? "激活中..." : "激活授权"}
                </button>
              </div>
            </div>
          ) : (
            state.status === "valid" && (
              <div className="bg-white rounded-lg border border-green-200 p-6 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                <div className="text-sm text-gray-700">
                  本系统已获得正式授权，可正常使用全部功能。
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
