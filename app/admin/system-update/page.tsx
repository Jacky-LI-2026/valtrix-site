"use client";

import { useState, useCallback } from "react";

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  file?: string;
  publishedAt?: string;
  size?: number;
  md5?: string;
}

export default function AdminUpdatePage() {
  const [localVersion, setLocalVersion] = useState<string>("-");
  const [configured, setConfigured] = useState(false);
  const [updates, setUpdates] = useState<UpdateInfo[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [appliedFiles, setAppliedFiles] = useState(0);

  const addLog = useCallback((line: string) => setLog((l) => [...l, line]), []);

  const checkUpdate = async () => {
    setBusy(true); setError(""); setMessage(""); setLog([]);
    try {
      const r = await fetch("/api/admin/update");
      const d = await r.json();
      setLocalVersion(d.localVersion || "-");
      setConfigured(!!d.configured);
      setUpdates(d.updates || []);
      if (d.error) setError(d.error);
      addLog(`本地版本：${d.localVersion}`);
      if (d.configured) {
        addLog(`更新服务器：${d.serverUrl}`);
        addLog(`远程可用版本：${(d.updates || []).length} 个`);
      }
    } catch (e: any) {
      setError("检查失败：" + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const applyRemote = async (u: UpdateInfo) => {
    if (!u.file) { setError("该版本缺少更新包文件"); return; }
    if (!confirm(`确认下载并应用版本 ${u.version} 的增量更新？\n应用前请先备份数据库与代码。`)) return;
    setBusy(true); setError(""); setMessage(""); setLog([]);
    try {
      addLog(`开始下载 ${u.file} ...`);
      const dl = await fetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "download", version: u.version, file: u.file, md5: u.md5 || "" }),
      });
      const dld = await dl.json();
      if (!dld.ok) { setError(dld.error || "下载失败"); return; }
      addLog(`下载完成（${Math.round(dld.size / 1024)} KB），开始应用...`);
      const ap = await fetch("/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", file: dld.file }),
      });
      const apd = await ap.json();
      if (!apd.ok) { setError(apd.error || "应用失败"); return; }
      setAppliedFiles(apd.applied?.length || 0);
      addLog(`✅ 更新成功：版本 ${apd.version}，更新 ${apd.applied?.length || 0} 个文件`);
      if (apd.migration) addLog("⚠️ 本次更新包含数据库变更，请手动执行 npx prisma db push 后重启服务");
      else addLog("提示：建议重启服务使更新完全生效（pm2 restart zuowen-web 或重启 Node 进程）");
      setMessage(`版本 ${apd.version} 已应用`);
    } catch (e: any) {
      setError("操作失败：" + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const uploadAndApply = async (file: File) => {
    if (!confirm(`确认上传并应用升级包 ${file.name}？\n应用前请先备份数据库与代码。`)) return;
    setBusy(true); setError(""); setMessage(""); setLog([]);
    try {
      addLog(`上传 ${file.name} ...`);
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/update", { method: "POST", body: fd });
      const d = await r.json();
      if (!d.ok) { setError(d.error || "上传/应用失败"); return; }
      setAppliedFiles(d.applied?.length || 0);
      addLog(`✅ 更新成功：版本 ${d.version}，更新 ${d.applied?.length || 0} 个文件`);
      if (d.migration) addLog("⚠️ 本次更新包含数据库变更，请手动执行 npx prisma db push 后重启服务");
      else addLog("提示：建议重启服务使更新完全生效");
      setMessage(`版本 ${d.version} 已应用`);
    } catch (e: any) {
      setError("操作失败：" + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">系统更新</h1>
        <button
          onClick={checkUpdate}
          disabled={busy}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "处理中..." : "检查更新"}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded border border-red-200">{error}</div>}
      {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded border border-green-200">{message}</div>}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg border">
          <div className="text-xs text-gray-500 mb-1">当前版本</div>
          <div className="text-2xl font-bold">{localVersion}</div>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <div className="text-xs text-gray-500 mb-1">更新服务器</div>
          <div className="text-lg font-medium">{configured ? "已配置" : "未配置"}</div>
          <div className="text-xs text-gray-400 mt-1">在 .env 设置 UPDATE_SERVER_URL</div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">远程可用更新</h2>
        {updates.length === 0 ? (
          <div className="p-4 bg-white rounded-lg border text-gray-400 text-sm">暂无远程更新信息{configured ? "" : "（未配置更新服务器）"}。点击「检查更新」获取。</div>
        ) : (
          <div className="space-y-3">
            {updates.map((u) => (
              <div key={u.version} className="p-4 bg-white rounded-lg border flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold">v{u.version} {u.publishedAt ? <span className="text-xs text-gray-400 ml-2">{u.publishedAt}</span> : null}</div>
                  <div className="text-sm text-gray-600 mt-1">{u.releaseNotes || "无更新说明"}</div>
                </div>
                <button
                  onClick={() => applyRemote(u)}
                  disabled={busy}
                  className="shrink-0 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  下载并应用
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">上传升级包（离线更新）</h2>
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-500 mb-3">从供应商获取增量更新包（zip，含 manifest.json）后上传，系统自动解压并覆盖对应文件。</p>
          <input
            type="file"
            accept=".zip"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAndApply(f);
              e.target.value = "";
            }}
            className="block text-sm text-gray-600"
          />
        </div>
      </div>

      {log.length > 0 && (
        <div className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-xs leading-relaxed max-h-80 overflow-auto">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-gray-600 leading-relaxed">
        <div className="font-semibold text-gray-800 mb-1">使用说明</div>
        <ol className="list-decimal ml-5 space-y-1">
          <li>在线更新：供应商提供更新服务器地址后，在 .env 配置 <code className="bg-blue-100 px-1 rounded">UPDATE_SERVER_URL=https://...</code>，重启服务，即可「检查更新 → 下载并应用」。</li>
          <li>离线更新：供应商发送增量更新包 zip，在此上传即可自动应用。</li>
          <li>更新前务必先备份（系统部署 → 备份）数据库与代码。</li>
          <li>包含数据库变更的更新，应用后需在项目目录执行 <code className="bg-blue-100 px-1 rounded">npx prisma db push</code> 并重启服务。</li>
        </ol>
      </div>
    </div>
  );
}
