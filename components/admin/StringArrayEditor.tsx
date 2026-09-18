'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles, X } from 'lucide-react';

interface StringArrayEditorProps {
  value: string; // JSON字符串
  onChange: (value: string) => void;
  title?: string;
  addButtonText?: string;
  placeholder?: string;
  emptyText?: string;
  itemLabel?: string; // 每项的标签名称，如"内容"、"职责"
}

// 按分隔符/换行把 AI 文本拆成列表项（去空、去重、去序号）
const toItems = (raw: string): string[] => {
  const lines = raw.split(/\n|；|;/).map((x) => x.trim()).filter(Boolean);
  const cleaned = lines.map((x) => x.replace(/^\s*[\d一二三四五六七八九十]+[.、)）]\s*/, ''));
  // 若只有 1 条且过长（模型没按行输出），按句号/分号拆成多条
  if (cleaned.length === 1 && cleaned[0].length > 40) {
    const segs = cleaned[0].split(/[。；\n]/).map((x) => x.trim()).filter((x) => x.length > 3);
    if (segs.length > 1) return Array.from(new Set(segs));
  }
  return Array.from(new Set(cleaned));
};

export default function StringArrayEditor({
  value,
  onChange,
  title = '列表内容',
  addButtonText = '添加项',
  placeholder = '输入内容...',
  emptyText = '暂无内容，点击下方按钮添加',
  itemLabel = '内容',
}: StringArrayEditorProps) {
  const parseValue = (): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item: any) => typeof item === 'string' ? item : JSON.stringify(item)) : [];
    } catch {
      return [];
    }
  };

  const items = parseValue();

  const updateItems = (newItems: string[]) => {
    onChange(JSON.stringify(newItems, null, 2));
  };

  const addItem = () => {
    updateItems([...items, '']);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    updateItems(newItems);
  };

  const updateItem = (index: number, itemValue: string) => {
    const newItems = [...items];
    newItems[index] = itemValue;
    updateItems(newItems);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    updateItems(newItems);
  };

  // AI 生成列表项
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const aiGenerate = async () => {
    if (!aiPrompt.trim()) { setAiMsg('请输入生成要求，如：生成5条不锈钢闸阀的核心卖点'); return; }
    setAiBusy(true); setAiMsg('');
    try {
      const r = await fetch('/api/ai/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'editor_generate',
          action: 'generate',
          label: `${title}（列表）`,
          prompt: `请围绕以下要求生成 ${title} 的列表项，每条一行，不要编号、不要 Markdown 符号，直接输出列表内容：\n${aiPrompt}`,
        }),
      });
      const d = await r.json();
      if (!d.ok) { setAiMsg(d.error || '调用失败'); return; }
      const newItems = toItems(d.result);
      if (newItems.length === 0) { setAiMsg('AI 未生成有效内容，请调整要求重试'); return; }
      // 追加到现有项后（去重）
      const merged = Array.from(new Set([...items, ...newItems]));
      updateItems(merged);
      setAiOpen(false);
      setAiMsg(`已生成 ${newItems.length} 条，当前共 ${merged.length} 条`);
      setTimeout(() => setAiMsg(''), 3000);
    } catch (e: any) {
      setAiMsg(e.message || '网络异常');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-gray-700">{title}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setAiOpen((v) => !v); setAiMsg(''); }}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors"
            title="AI 生成列表项"
          >
            <Sparkles size={13} /> AI 生成
          </button>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Plus size={14} /> {addButtonText}
          </button>
        </div>
      </div>

      {aiOpen && (
        <div className="border border-purple-200 bg-purple-50/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-700">AI 生成 {itemLabel}</span>
            <button type="button" onClick={() => setAiOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            placeholder="例如：生成5条工业阀门行业产品应用优势，每条一句话"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={aiGenerate}
              disabled={aiBusy}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              <Sparkles size={13} /> {aiBusy ? '生成中…' : '生成并追加'}
            </button>
            {aiMsg && <span className="text-xs text-gray-500">{aiMsg}</span>}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-gray-400 italic text-center py-6 border border-dashed border-gray-200 rounded-md">
          {emptyText}
        </p>
      )}

      {items.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">第 {index + 1} 项</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
            >
              <Trash2 size={12} /> 删除
            </button>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{itemLabel}</label>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
