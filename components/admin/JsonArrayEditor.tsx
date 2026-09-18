'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles, X } from 'lucide-react';

interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'textarea';
  placeholder?: string;
}

interface JsonArrayEditorProps {
  value: string; // JSON字符串
  onChange: (value: string) => void;
  fields: FieldConfig[];
  title?: string;
  addButtonText?: string;
  emptyText?: string;
}

export default function JsonArrayEditor({
  value,
  onChange,
  fields,
  title = '列表内容',
  addButtonText = '添加项',
  emptyText = '暂无内容，点击下方按钮添加',
}: JsonArrayEditorProps) {
  const parseValue = (): any[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const items = parseValue();

  const updateItems = (newItems: any[]) => {
    onChange(JSON.stringify(newItems, null, 2));
  };

  const addItem = () => {
    const newItem: any = {};
    fields.forEach(f => {
      newItem[f.key] = '';
    });
    updateItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    updateItems(newItems);
  };

  const updateField = (index: number, key: string, fieldValue: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: fieldValue };
    updateItems(newItems);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    updateItems(newItems);
  };

  // AI 生成数组项：基于字段结构 + 主题
  const [aiOpen, setAiOpen] = useState(false);
  const [aiHint, setAiHint] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState('');

  const handleAiGenerate = async () => {
    setAiBusy(true);
    setAiMsg('');
    try {
      const fieldDesc = fields.map((f) => `${f.key}(${f.label})`).join('、');
      const r = await fetch('/api/ai/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'json_array_generate',
          action: 'generate_json',
          label: title,
          prompt: `请为「${aiHint || title || '内容'}」生成列表项 JSON 数组，每项结构包含字段：${fieldDesc}，4-8 项，专业企业官网风格，只输出数组本身。`,
        }),
      });
      const d = await r.json();
      if (!d.ok) { setAiMsg(d.error || 'AI 调用失败'); return; }
      let raw = (d.result || '').trim();
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('返回格式不是数组');
      const newItems = arr
        .filter((x: any) => x && typeof x === 'object')
        .map((x: any) => {
          const item: any = {};
          fields.forEach((f) => { item[f.key] = x[f.key] != null ? String(x[f.key]) : ''; });
          return item;
        })
        .filter((x: any) => Object.values(x).some((v) => String(v).trim()));
      if (!newItems.length) throw new Error('没有有效内容');
      updateItems([...items, ...newItems]);
      setAiMsg(`已生成 ${newItems.length} 项`);
    } catch (e: any) {
      setAiMsg('AI 生成失败：' + (e?.message || '返回内容无法解析'));
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{title}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors"
            title="AI 根据主题自动生成列表内容"
          >
            <Sparkles size={14} /> AI 生成
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
        <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
              <Sparkles size={12} /> AI 生成数组项
            </span>
            <button type="button" onClick={() => setAiOpen(false)} className="text-gray-400 hover:text-gray-600" title="关闭">
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={aiHint}
            onChange={(e) => setAiHint(e.target.value)}
            placeholder={`输入主题，如：${fields[0]?.label || '内容'}相关的要点`}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiBusy}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs hover:bg-purple-700 disabled:opacity-50"
            >
              {aiBusy ? '生成中…' : '生成并追加'}
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
        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
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

          <div className="space-y-3">
            {fields.map(field => (
              <div key={field.key}>
                <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={item[field.key] || ''}
                    onChange={(e) => updateField(index, field.key, e.target.value)}
                    placeholder={field.placeholder || `输入${field.label}...`}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-y"
                  />
                ) : (
                  <input
                    type="text"
                    value={item[field.key] || ''}
                    onChange={(e) => updateField(index, field.key, e.target.value)}
                    placeholder={field.placeholder || `输入${field.label}...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
