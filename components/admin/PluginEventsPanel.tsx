"use client";

/**
 * 插件事件总线 · 状态面板
 * 展示系统内置事件定义 + 当前已订阅事件，体现插件间解耦联动架构。
 */
import { useEffect, useState } from "react";
import { Radio, Cable } from "lucide-react";

export default function PluginEventsPanel() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/plugins/events")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Cable size={16} className="text-purple-600" />
        <h2 className="text-sm font-medium text-gray-700">插件事件总线（插件间解耦联动）</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.defined.map((ev: string) => (
          <div key={ev} className="flex items-start gap-2 border border-gray-100 rounded-lg p-2.5">
            <Radio size={14} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0">
              <div className="text-xs font-mono text-gray-800">
                {ev}
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                  {data.subscribed.includes(ev) ? "已订阅" : "可订阅"}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{data.docs[ev] || ""}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">发布方无需知道谁在监听；新插件只需订阅事件即可接入联动（如内容发布→SEO 推送、商机产生→邮件通知）。</p>
    </div>
  );
}
