"use client";

import { useEffect, useState } from "react";
import { Rocket, Settings2, RefreshCw, FileText, CheckCircle2, History } from "lucide-react";

interface TypeOption { name: string; label: string }

export default function AiAutopilotPage() {
  const [cfg, setCfg] = useState<any>({
    types: ["products", "news"],
    targetLangs: ["en", "ja"] as string[],
    autoPublish: false,
    maxPerRun: 5,
    schedule: "0 2 * * *",
    scheduleEnabled: false,
  });
  const [allTypes, setAllTypes] = useState<TypeOption[]>([]);
  const [draftMap, setDraftMap] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"ok" | "err">("ok");
  const [result, setResult] = useState<any>(null);

  const LANGS = [{ v: "en", l: "英文" }, { v: "ja", l: "日文" }, { v: "ko", l: "韩文" }, { v: "fr", l: "法文" }, { v: "ar", l: "阿拉伯文" }];

  const flash = (m: string, t: "ok" | "err" = "ok") => { setMsg(m); setMsgType(t); setTimeout(() => setMsg(""), 3500); };

  const load = async () => {
    try {
      const r = await fetch("/api/admin/ai-autopilot");
      const d = await r.json();
      if (d.ok) {
        setCfg({
          types: d.cfg.types && d.cfg.types.length ? d.cfg.types : ["products", "news"],
          targetLangs: d.cfg.targetLangs || [],
          autoPublish: !!d.cfg.autoPublish,
          maxPerRun: d.cfg.maxPerRun || 5,
          schedule: d.cfg.schedule || "0 2 * * *",
          scheduleEnabled: !!d.cfg.scheduleEnabled,
        });
        setAllTypes([...(d.statTypes || []), ...(d.dynTypes || [])]);
        const map: Record<string, number> = {};
        (d.statCounts || {}) && Object.entries(d.statCounts).forEach(([k, v]) => { map[k] = Number(v); });
        (d.dynCounts || []).forEach((c: any) => { if (c.status === "draft") map[c.type] = (map[c.type] || 0) + (c._count?.id || 0); });
        setDraftMap(map);
        setLogs(d.logs || []);
      } else flash(d.error || "加载失败", "err");
    } catch { flash("加载失败", "err"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleType = (name: string) => {
    setCfg((c: any) => ({
      ...c,
      types: c.types.includes(name) ? c.types.filter((x: string) => x !== name) : [...c.types, name],
    }));
  };

  const save = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/ai-autopilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", ...cfg }) });
      const d = await r.json();
      if (d.ok) { flash("配置已保存"); load(); }
      else flash(d.error || "保存失败", "err");
    } catch { flash("网络异常", "err"); }
    finally { setBusy(false); }
  };

  const run = async () => {
    setBusy(true); setMsg(""); setResult(null);
    try {
      const r = await fetch("/api/admin/ai-autopilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run", ...cfg }) });
      const d = await r.json();
      if (!d.ok) { flash(d.error || "运行失败", "err"); return; }
      setResult(d.result);
      flash("运行完成");
      load();
    } catch (e: any) { flash(e.message || "网络异常", "err"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-gray-500">加载中...</div>;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <Rocket size={24} className="text-red-600" />
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">AI 自动运营</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        自动流水线：取「内容类型」草稿 → AI 补全中文 + AI 翻译目标语种 → 按配置自动发布 → 百度推送。支持全部内容栏目（产品/新闻/服务/行业/案例/FAQ/动态类型）。
      </p>

      {msg && <div className={`text-sm rounded-md px-4 py-2 mb-4 ${msgType === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4"><Settings2 size={15} /> 流水线配置</h2>
          <div className="space-y-4">
            <div className="text-sm">
              <label className="block text-gray-600 mb-1">目标内容类型（可多选）</label>
              <div className="flex flex-wrap gap-2">
                {allTypes.map((t) => (
                  <label key={t.name} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md cursor-pointer text-xs">
                    <input type="checkbox" checked={cfg.types.includes(t.name)}
                      onChange={() => toggleType(t.name)} className="w-4 h-4" />
                    {t.label}（{draftMap[t.name] || 0} 草稿）
                  </label>
                ))}
              </div>
            </div>
            <div className="text-sm">
              <label className="block text-gray-600 mb-1">目标语种（AI 翻译补全）</label>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((l) => (
                  <label key={l.v} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md cursor-pointer">
                    <input type="checkbox" checked={cfg.targetLangs.includes(l.v)}
                      onChange={(e) => setCfg((c: any) => ({ ...c, targetLangs: e.target.checked ? [...c.targetLangs, l.v] : c.targetLangs.filter((x: string) => x !== l.v) }))}
                      className="w-4 h-4" />
                    {l.l}
                  </label>
                ))}
              </div>
            </div>
            <div className="text-sm">
              <label className="block text-gray-600 mb-1">每轮最多处理（1-20）</label>
              <input type="number" min={1} max={20} value={cfg.maxPerRun}
                onChange={(e) => setCfg((c: any) => ({ ...c, maxPerRun: Number(e.target.value) || 5 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={cfg.autoPublish} onChange={(e) => setCfg((c: any) => ({ ...c, autoPublish: e.target.checked }))} className="w-4 h-4" />
              AI 处理后自动发布（关闭则存为草稿待人工审核）
            </label>

            <div className="border-t border-gray-100 pt-4">
              <div className="text-sm font-semibold text-gray-800 mb-2">定时调度</div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <input type="checkbox" checked={cfg.scheduleEnabled} onChange={(e) => setCfg((c: any) => ({ ...c, scheduleEnabled: e.target.checked }))} className="w-4 h-4" />
                启用定时自动运行（服务器每分钟检查）
              </label>
              <div className="text-sm">
                <label className="block text-gray-600 mb-1">Cron 表达式（分 时 日 月 周）</label>
                <div className="flex gap-2">
                  <input value={cfg.schedule} onChange={(e) => setCfg((c: any) => ({ ...c, schedule: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono" />
                  <button onClick={() => setCfg((c: any) => ({ ...c, schedule: "0 2 * * *" }))} className="px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-500 hover:bg-gray-50">默认</button>
                </div>
                <div className="text-xs text-gray-400 mt-1">示例：0 2 * * * = 每天凌晨 2:00；*/30 * * * * = 每 30 分钟</div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={busy} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">保存配置</button>
              <button onClick={run} disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                <RefreshCw size={14} /> {busy ? "运行中..." : "立即运行一轮"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4"><FileText size={15} /> 运行结果</h2>
          {!result ? (
            <div className="text-sm text-gray-400 py-8 text-center">点击「立即运行一轮」后在此显示处理结果</div>
          ) : (
            <div>
              {Array.isArray(result) && result.map((r: any, ri: number) => (
                <div key={ri} className="mb-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2">类型：{r.type}</div>
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {[["处理", r.processed], ["发布", r.published], ["更新", r.updated], ["跳过", r.skipped], ["错误", r.errors]].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-gray-50 p-2 text-center">
                        <div className="text-lg font-bold text-gray-900">{v}</div>
                        <div className="text-[11px] text-gray-500">{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="max-h-64 overflow-auto">
                {(Array.isArray(result) ? result.flatMap((r: any) => (r.results || []).map((x: any) => ({ ...x, type: r.type }))) : []).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100">
                    <span className="truncate pr-2 text-xs"><span className="text-gray-400">{r.type}</span> {r.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${r.status === 'published' ? 'bg-green-100 text-green-700' : r.status === 'updated' ? 'bg-blue-100 text-blue-700' : r.status === 'skipped' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'}`}>
                      <CheckCircle2 size={11} /> {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2"><History size={14} /> 运行日志</h3>
            {logs.length === 0 ? (
              <div className="text-xs text-gray-400">暂无运行记录</div>
            ) : (
              <div className="max-h-48 overflow-auto">
                {logs.map((l: any, i: number) => (
                  <div key={i} className="text-xs py-1.5 border-b border-gray-100 flex justify-between">
                    <span className="text-gray-500">{l.ts?.replace("T", " ").slice(0, 19)}</span>
                    <span>{(l.types || []).join(", ")} · 处理 {l.processed} / 发布 {l.published} / 更新 {l.updated} / 错误 {l.errors}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
