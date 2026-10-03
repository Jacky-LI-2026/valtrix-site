"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Save, Sparkles } from "lucide-react";

/**
 * 维护模式（后台开关）· /admin/maintenance
 * ==========================================================================
 * owner 2026-09-26 确认要做：「网站正在维护中」的开关。
 *   · 开启后**前台访客**收到 HTTP 503 + 维护页（对搜索引擎是"暂时不可用"，不会像 404 被删索引）；
 *   · **后台 / 接口 / 静态资源 / 服务器本机 / 白名单 IP / 已登录会话**一律旁路（否则自己也进不去，
 *     而且部署脚本要从本机 curl 校验 200 —— 那条必须放行）；
 *   · 拦截实现在 Node 层 `lib/server/maintenance.js`，配置读 `site_config.maintenance`，**5 秒内生效**。
 */
const LANGS = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
] as const;

type LangCode = (typeof LANGS)[number]["code"];
interface Cfg {
  enabled: boolean;
  title: Record<string, string>;
  message: Record<string, string>;
  eta: string;
  contact: string;
  bypassIps: string[];
}

export default function MaintenancePage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [lang, setLang] = useState<LangCode>("zh");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/maintenance")
      .then((r) => r.json())
      .then((d) => { if (d?.config) setCfg(d.config); else setMsg(d?.error || "读取失败"); })
      .catch((e) => setMsg(e?.message || "读取失败"));
  }, []);

  const setField = (k: "title" | "message", code: string, v: string) =>
    setCfg((c) => (c ? { ...c, [k]: { ...c[k], [code]: v } } : c));

  /** 一键翻译：把中文标题/说明翻到其余 5 个语种（走统一翻译接口） */
  const translateAll = async () => {
    if (!cfg) return;
    setBusy(true); setMsg("");
    const title = (cfg.title.zh || "").trim();
    const message = (cfg.message.zh || "").trim();
    if (!title && !message) { setBusy(false); setMsg("请先填写中文标题或说明"); return; }
    const next: Cfg = { ...cfg, title: { ...cfg.title }, message: { ...cfg.message } };
    try {
      for (const l of LANGS.filter((x) => x.code !== "zh")) {
        for (const [k, text] of [["title", title], ["message", message]] as const) {
          if (!text) continue;
          const res = await fetch("/api/admin/translate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, targetLang: l.code, capitalize: k === "title" }),
          });
          const d = await res.json().catch(() => ({}));
          if (!res.ok || !d.translatedText) throw new Error(`${l.label} ${k} 翻译失败：${d.error || res.status}`);
          (next as any)[k][l.code] = d.translatedText;
          setCfg({ ...next });
        }
      }
      setMsg("已翻译 5 个语种");
    } catch (e: any) {
      setMsg(e?.message || "翻译失败");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!cfg) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || `保存失败（${res.status}）`);
      setCfg(d.config);
      setMsg(d.config.enabled ? "已保存并**开启**维护模式（约 5 秒内生效）" : "已保存并**关闭**维护模式");
    } catch (e: any) {
      setMsg(e?.message || "保存失败");
    } finally {
      setBusy(false);
    }
  };

  if (!cfg) return <div className="p-8 text-gray-500">{msg || "加载中…"}</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-[22px] font-bold text-gray-900 mb-1">维护模式</h1>
      <p className="text-sm text-gray-500 mb-4">开启后前台访客会看到维护页（HTTP 503），后台与接口不受影响。</p>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex gap-2 mb-5">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <div>
          <b>开启前请注意</b>：① 前台所有页面都会变成维护页（产品/新闻等打不开，这是维护模式的语义）；
          ② <b>你和管理员（已登录会话）不受影响</b>，后台、接口、图片等静态资源照常；
          ③ 开关保存后约 <b>5 秒</b>生效；④ 建议填上「预计恢复时间」，避免访客反复刷新。
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-5">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span>
            <span className="block text-sm font-semibold text-gray-900">开启维护模式</span>
            <span className="block text-xs text-gray-500 mt-0.5">当前状态：{cfg.enabled ? <b className="text-red-600">已开启</b> : "已关闭"}</span>
          </span>
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} className="w-6 h-6 accent-red-600" />
        </label>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-sm font-semibold text-gray-900">维护页文案（六语种）</span>
          <span className="flex items-center gap-2">
            {msg && <span className={`text-xs ${msg.startsWith("已") ? "text-green-600" : "text-red-500"}`}>{msg}</span>}
            <button type="button" onClick={translateAll} disabled={busy}
              className="inline-flex items-center gap-1 text-xs border border-red-200 text-red-600 px-2.5 py-1 rounded hover:bg-red-50 disabled:opacity-50">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} 一键翻译（中文→其他）
            </button>
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {LANGS.map((l) => (
            <button key={l.code} type="button" onClick={() => setLang(l.code)}
              className={`px-3 py-1.5 text-xs rounded-md border ${lang === l.code ? "bg-red-600 text-white border-red-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">标题（{lang}）</label>
            <input type="text" maxLength={120} value={cfg.title[lang] || ""} onChange={(e) => setField("title", lang, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="网站维护中" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">说明（{lang}，可换行）</label>
            <textarea rows={3} value={cfg.message[lang] || ""} onChange={(e) => setField("message", lang, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="我们正在升级维护，预计很快恢复…" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">预计恢复时间（自由文本，可空）</label>
          <input type="text" value={cfg.eta} onChange={(e) => setCfg({ ...cfg, eta: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="如：2026-09-27 10:00" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">紧急联系方式（可空）</label>
          <input type="text" value={cfg.contact} onChange={(e) => setCfg({ ...cfg, contact: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="如：info@zuowentech.com" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">白名单 IP（可空；逗号或换行分隔，这些 IP 不会被拦）</label>
          <textarea rows={2} value={cfg.bypassIps.join(", ")} onChange={(e) => setCfg({ ...cfg, bypassIps: e.target.value.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="如：1.2.3.4, 5.6.7.8" />
        </div>
      </div>

      <button onClick={save} disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 保存
      </button>
      {msg && <span className={`ml-3 text-xs ${msg.startsWith("已") ? "text-green-600" : "text-red-500"}`}>{msg}</span>}
    </div>
  );
}
