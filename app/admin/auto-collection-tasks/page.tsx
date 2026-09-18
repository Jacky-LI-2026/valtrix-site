"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Trash2, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface AutoCollectionTask {
  id: string;
  name: string;
  keyword: string;
  categoryId: string | null;
  frequency: string;
  autoPublish: boolean;
  includeImage: boolean;
  defaultImage: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  enabled: boolean;
  createdAt: string;
}

export default function AutoCollectionTasksPage() {
  const [tasks, setTasks] = useState<AutoCollectionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/admin/auto-collection-tasks");
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runTask = async (id: string) => {
    setRunning(id);
    try {
      // 手动执行采集任务（调用采集执行逻辑）
      const res = await fetch("/api/admin/collection/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id }),
      });
      const data = await res.json();
      alert(data.message || (data.success ? "采集完成" : "采集失败"));
      fetchTasks();
    } catch (e: any) {
      alert("执行失败: " + e.message);
    } finally {
      setRunning(null);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("确定删除该自动采集任务？")) return;
    try {
      await fetch(`/api/admin/auto-collection-tasks/${id}`, { method: "DELETE" });
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "hourly": return "每小时";
      case "daily": return "每天";
      case "weekly": return "每周";
      default: return freq;
    }
  };

  if (loading) {
    return <div className="p-8 text-dark-400">加载中...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-dark">自动采集任务</h1>
          <p className="text-dark-500 text-sm mt-1">管理定时自动采集任务，共 {tasks.length} 个任务</p>
        </div>
        <button
          onClick={() => alert("请在新闻管理页面的AI采集工具中创建自动采集任务")}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors"
        >
          <Plus size={18} />
          新建任务
        </button>
      </div>

      <div className="bg-white rounded-lg border border-dark-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-50 border-b border-dark-100">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">任务名称</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">关键词</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">频率</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">自动发布</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">状态</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">上次执行</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-dark-400">
                  暂无自动采集任务
                  <div className="text-xs mt-2">请在新闻管理页面点击“AI采集”，勾选“保存为自动采集任务”创建</div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="border-b border-dark-50 hover:bg-dark-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-dark">{task.name}</div>
                    <div className="text-xs text-dark-400">创建于 {new Date(task.createdAt).toLocaleDateString("zh-CN")}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded">{task.keyword}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-dark-600">
                      <Clock size={14} />
                      {getFrequencyLabel(task.frequency)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.autoPublish ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">自动发布</span>
                    ) : (
                      <span className="text-xs bg-dark-100 text-dark-500 px-2 py-1 rounded">手动发布</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {task.enabled ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={14} /> 启用
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-dark-400">
                          <XCircle size={14} /> 禁用
                        </span>
                      )}
                      {task.includeImage && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">含图</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-500">
                    {task.lastRunAt
                      ? new Date(task.lastRunAt).toLocaleString("zh-CN")
                      : "未执行"}
                    {task.lastStatus === "failed" && (
                      <div className="text-xs text-red-500">执行失败</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => runTask(task.id)}
                        disabled={running === task.id}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded disabled:opacity-50"
                        title="立即执行"
                      >
                        {running === task.id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-dark-50 rounded-lg">
        <h3 className="font-medium text-dark mb-2">自动采集任务说明</h3>
        <ul className="text-sm text-dark-500 space-y-1">
          <li>• 自动采集任务按设定频率自动执行，调用大模型生成行业新闻</li>
          <li>• 采集内容包括：标题、摘要、图片建议、正文（800-1200字）</li>
          <li>• 勾选“自动发布”后，生成的新闻将自动发布到前台</li>
          <li>• 可在新闻管理页面的AI采集工具中创建新任务</li>
          <li>• 定时任务由系统后台自动执行，也可手动点击“立即执行”测试</li>
        </ul>
      </div>
    </div>
  );
}
