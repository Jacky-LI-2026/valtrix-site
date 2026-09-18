"use client";

import { useState, useEffect } from "react";
import { Database, Download, RefreshCw, Trash2, HardDrive } from "lucide-react";

export default function BackupAdminPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [backupCfg, setBackupCfg] = useState({ enabled: false, intervalDays: 1, time: "03:00", retainCount: 7 });
  const [savingCfg, setSavingCfg] = useState(false);

  useEffect(() => {
    fetchBackups();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/backup-config");
      const data = await res.json();
      if (data && typeof data.enabled === "boolean") {
        setBackupCfg({
          enabled: data.enabled,
          intervalDays: data.intervalDays || 1,
          time: data.time || "03:00",
          retainCount: data.retainCount || 7,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveBackupConfig = async () => {
    setSavingCfg(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/backup-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupCfg),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("定时备份设置已保存");
        setBackupCfg({
          enabled: data.enabled,
          intervalDays: data.intervalDays,
          time: data.time,
          retainCount: data.retainCount,
        });
      } else {
        setMessage("保存失败: " + (data.error || "未知错误"));
      }
    } catch (e) {
      setMessage("保存失败");
    } finally {
      setSavingCfg(false);
    }
  };

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backup");
      const data = await res.json();
      setBackups(data.backups || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setCreating(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage("备份创建成功: " + data.fileName);
        fetchBackups();
      } else {
        setMessage("备份失败: " + (data.error || "未知错误"));
      }
    } catch (e) {
      setMessage("备份失败");
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (fileName: string) => {
    try {
      const res = await fetch(`/api/admin/backup/download?file=${encodeURIComponent(fileName)}`);
      if (!res.ok) {
        alert("下载失败");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("下载失败");
    }
  };

  const deleteBackup = async (fileName: string) => {
    if (!confirm(`确定删除备份 ${fileName}？`)) return;
    try {
      const res = await fetch(`/api/admin/backup?file=${encodeURIComponent(fileName)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchBackups();
      } else {
        alert("删除失败");
      }
    } catch (e) {
      alert("删除失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">数据库备份</h1>
          <p className="text-gray-500 mt-1">创建和管理数据库备份文件</p>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <Database size={16} />
          {creating ? "创建中..." : "创建备份"}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.includes("失败") || message.includes("错误")
            ? "bg-red-50 border border-red-200 text-red-700"
            : "bg-green-50 border border-green-200 text-green-700"
        }`}>
          {message}
        </div>
      )}

      {/* 定时自动备份 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">定时自动备份</h3>
          <p className="text-xs text-gray-500 mt-0.5">开启后系统会在访问后台时自动检查并按时执行备份，自动保留最近 N 份</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">启用定时备份</div>
              <div className="text-xs text-gray-400">关闭后仅保留手动备份功能</div>
            </div>
            <button
              onClick={() => setBackupCfg({ ...backupCfg, enabled: !backupCfg.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                backupCfg.enabled ? "bg-red-600" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${backupCfg.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">备份间隔（天）</label>
              <input
                type="number"
                min={1}
                max={365}
                value={backupCfg.intervalDays}
                onChange={(e) => setBackupCfg({ ...backupCfg, intervalDays: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">执行时间（HH:MM）</label>
              <input
                type="time"
                value={backupCfg.time}
                onChange={(e) => setBackupCfg({ ...backupCfg, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">保留份数</label>
              <input
                type="number"
                min={1}
                max={100}
                value={backupCfg.retainCount}
                onChange={(e) => setBackupCfg({ ...backupCfg, retainCount: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveBackupConfig}
              disabled={savingCfg}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {savingCfg ? "保存中..." : "保存设置"}
            </button>
          </div>
        </div>
      </div>

      {/* 备份说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HardDrive size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">备份说明</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>备份包含所有数据表的完整数据（JSON格式）</li>
              <li>备份文件存储在项目 backups 目录下</li>
              <li>建议定期创建备份，特别是在系统更新前</li>
              <li>生产环境建议同时使用数据库原生备份工具（pg_dump）</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 备份列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">备份文件列表</h3>
          <button
            onClick={fetchBackups}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <RefreshCw size={14} />
            刷新
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Database size={48} className="mx-auto mb-4 opacity-50" />
            <p>暂无备份文件，点击上方“创建备份”按钮开始</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">文件名</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {backups.map((backup) => (
                <tr key={backup.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{backup.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{backup.createdAt}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadBackup(backup.name)}
                        className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      >
                        <Download size={14} />
                        下载
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.name)}
                        className="flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded text-sm"
                      >
                        <Trash2 size={14} />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
