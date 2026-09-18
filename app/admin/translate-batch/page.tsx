"use client";

import { useState } from "react";
import { Languages, RefreshCw, CheckCircle2, AlertTriangle, Sparkles, MapPin } from "lucide-react";

const MODULES = [
  { key: "products", label: "产品", desc: "名称 / 副标题 / 简介 / 详情（16 型号）" },
  { key: "news", label: "新闻", desc: "标题 / 摘要 / 正文" },
  { key: "industries", label: "行业", desc: "名称 / 标语 / 描述" },
  { key: "services", label: "服务", desc: "标题 / 副标题 / 描述" },
  { key: "resources", label: "资源", desc: "标题 / 描述（资料下载）" },
  { key: "careers", label: "职位", desc: "标题 / 部门 / 地点 / 摘要" },
];

export default function BatchTranslatePage() {
  const [running, setRunning] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [seoRunning, setSeoRunning] = useState(false);
  const [seoResult, setSeoResult] = useState<any>(null);
  const [seoError, setSeoError] = useState("");
  const [seoProgress, setSeoProgress] = useState("");
  const [seoPct, setSeoPct] = useState(0);

  const runTranslate = async (m: (typeof MODULES)[number]) => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setError("");
    setProgress("启动中...");
    setProgressPct(0);
    try {
      const res = await fetch("/api/admin/batch-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: m.key, overwrite }),
      });
      const data = await res.json();
      if (!res.ok || !data.taskId) {
        setError(data.error || "批量翻译失败");
        setRunning(false);
        return;
      }
      const taskId = data.taskId;
      // 轮询任务进度
      const poll = async () => {
        try {
          const r2 = await fetch(`/api/admin/batch-translate?task=${taskId}`, { cache: "no-store" });
          const d2 = await r2.json();
          if (d2.ok && d2.task) {
            const t = d2.task;
            setProgress(t.message + (t.progress ? ` · ${t.progress}` : ""));
            if (t.progress) {
              const m = /(\d+)\/(\d+)/.exec(t.progress);
              if (m && Number(m[2]) > 0) setProgressPct(Math.round((Number(m[1]) / Number(m[2])) * 100));
            }
            if (t.status === "done") {
              setResult(t.result);
              setProgress("");
              setProgressPct(100);
              setRunning(false);
              clearInterval(pollTimer);
            } else if (t.status === "error") {
              setError(t.error || t.message || "批量翻译失败");
              setProgress("");
              setRunning(false);
              clearInterval(pollTimer);
            }
          }
        } catch (e) {
          setError("查询进度失败：" + (e as Error).message);
          setRunning(false);
          clearInterval(pollTimer);
        }
      };
      const pollTimer = window.setInterval(poll, 2000);
      poll();
    } catch (e) {
      setError("请求失败：" + (e as Error).message);
      setRunning(false);
    }
  };

  const runSeoFill = async () => {
    if (running || seoRunning) return;
    setSeoRunning(true);
    setSeoResult(null);
    setSeoError("");
    setSeoProgress("启动中...");
    setSeoPct(0);
    try {
      const res = await fetch("/api/admin/seo-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.taskId) {
        setSeoError((data as any).error || "SEO/GEO 补全启动失败");
        setSeoRunning(false);
        return;
      }
      const taskId = data.taskId;
      // 轮询任务进度
      const poll = async () => {
        try {
          const r2 = await fetch(`/api/admin/seo-fill?task=${taskId}`, { cache: "no-store" });
          const d2 = await r2.json();
          if (d2.ok && d2.task) {
            setSeoProgress(d2.task.progress ? `${d2.task.message} · ${d2.task.progress}` : d2.task.message);
            if (d2.task.progress) {
              const m = /(\d+)\/(\d+)/.exec(d2.task.progress);
              if (m && Number(m[2]) > 0) setSeoPct(Math.round((Number(m[1]) / Number(m[2])) * 100));
            }
            if (d2.task.status === "done") {
              setSeoResult(d2.task.result);
              setSeoProgress("");
              setSeoPct(100);
              setSeoRunning(false);
              clearInterval(pollTimer);
            } else if (d2.task.status === "error") {
              setSeoError(d2.task.message || "SEO/GEO 补全失败");
              setSeoProgress("");
              setSeoRunning(false);
              clearInterval(pollTimer);
            }
          }
        } catch (e) {
          setSeoError("查询进度失败：" + (e as Error).message);
          setSeoRunning(false);
          clearInterval(pollTimer);
        }
      };
      const pollTimer = window.setInterval(poll, 2000);
      poll();
    } catch (e) {
      setSeoError("请求失败：" + (e as Error).message);
      setSeoRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">批量多语言翻译</h1>
        <p className="text-gray-500 mt-1">
          一键将某模块全部内容的缺失语种（英文/日文/韩文/法文/阿拉伯文）自动翻译并保存。
          仅补译缺失字段，已有内容不会被覆盖；如需重译已填满的语种，请打开下方「重新翻译（覆盖已有译文）」开关。
        </p>
      </div>

      {/* 重新翻译（覆盖已有译文）开关 */}
      <div
        className={`rounded-lg border p-4 ${
          overwrite ? "bg-red-50 border-red-300" : "bg-white border-gray-100 shadow-sm"
        }`}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            disabled={running}
            className="mt-0.5 w-4 h-4 accent-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="flex-1">
            <span className={`text-sm font-medium ${overwrite ? "text-red-700" : "text-gray-900"}`}>
              重新翻译（覆盖已有译文）
            </span>
            <span className={`block text-xs mt-1 ${overwrite ? "text-red-600 font-medium" : "text-gray-500"}`}>
              关闭＝只填补空缺的语种（默认，安全）；打开＝已有译文也会重新翻译并覆盖，请谨慎使用。
            </span>
            {overwrite && (
              <span className="mt-2 flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  警示：会覆盖已有译文，包括人工修改过的译文，且无法撤销。请确认后再点「一键翻译全部」。
                </span>
              </span>
            )}
          </span>
        </label>
      </div>

      {running && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <RefreshCw size={18} className="text-blue-600 animate-spin" />
            <span className="text-sm text-blue-700">{progress || '翻译进行中，请勿关闭页面...'}</span>
          </div>
          <div className="mt-3 h-2 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-green-600 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium">{result.message}</p>
            <p className="text-xs mt-1">模块 {result.label} · 条目 {result.total} · 成功填充 {result.filled} · 失败 {result.failed}{result.overwrite ? " · 重新翻译模式" : ""}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 mt-0.5" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <div key={m.key} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <Languages size={16} />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{m.label}</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 flex-1">{m.desc}</p>
            <button
              onClick={() => runTranslate(m)}
              disabled={running}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              一键翻译全部
            </button>
          </div>
        ))}
      </div>

      {/* SEO/GEO 一键补全 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <h3 className="text-base font-semibold text-gray-900">SEO/GEO 一键补全</h3>
          <span className="ml-auto text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">AI 智能</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          用 AI 一键补全所有内容模块（产品/新闻/行业/服务/职位/资源/关于）缺失的 SEO 标题、描述、关键词
          （含英文/日文/韩文/法文/阿拉伯文多语言）与 GEO 地区、城市。仅补缺失字段，已有内容不会被覆盖。
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={runSeoFill}
            disabled={running || seoRunning}
            className="px-4 py-2 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {seoRunning ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> AI 补全中...
              </>
            ) : (
              <>
                <Sparkles size={14} /> 一键 AI 补全全部模块
              </>
            )}
          </button>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <MapPin size={12} /> 含 GEO 地区/城市自动填充
          </span>
        </div>

        {seoProgress && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <RefreshCw size={14} className="animate-spin" />
              {seoProgress}
            </div>
            <div className="mt-2 h-2 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${seoPct}%` }} />
            </div>
          </div>
        )}

        {seoError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 mt-0.5" />
            <span className="text-sm text-red-700">{seoError}</span>
          </div>
        )}

        {seoResult && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-600 mt-0.5" />
              <div className="text-sm text-green-700">
                <p className="font-medium">{seoResult.message}</p>
              </div>
            </div>
            {seoResult.modules && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                {Object.entries(seoResult.modules).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between py-0.5 border-b border-green-100">
                    <span>{v.label}</span>
                    <span className="text-gray-500">
                      {v.total} 条 · 补全 <span className="text-green-600 font-medium">{v.filled}</span> · 失败{" "}
                      <span className={v.failed ? "text-red-600" : "text-gray-400"}>{v.failed}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
