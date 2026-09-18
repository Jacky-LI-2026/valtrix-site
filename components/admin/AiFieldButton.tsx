'use client';

/**
 * 字段级 AI 写作按钮（公共组件）
 * =====================================================
 * 受「AI 开关矩阵」功能点开关控制（editor_generate / editor_polish / editor_summary）。
 * 挂到任意文本/多行文本字段旁：写文章 / 润色 / 摘要，结果回填字段。
 * 用法：<AiFieldButton label="产品简介" langLabel="English" value={v} onResult={(r)=>onChange(r)} />
 */
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  label: string;
  /** 当前语种显示名（如 中文 / English / 日本語） */
  langLabel?: string;
  value: string;
  onResult: (v: string) => void;
}

const LANG_SHOW: Record<string, string> = {
  zh: '中文', en: 'English', ja: '日本語', ko: '한국어', fr: 'Français', ar: 'العربية',
};

export default function AiFieldButton({ label, langLabel, value, onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'generate' | 'polish' | 'summary'>('generate');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const run = async () => {
    setBusy(true); setMsg('');
    try {
      const featureMap = { generate: 'editor_generate', polish: 'editor_polish', summary: 'editor_summary' } as const;
      const r = await fetch('/api/ai/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: featureMap[mode],
          action: mode,
          label: langLabel ? `${label} · ${langLabel}` : label,
          text: value,
          prompt: prompt || undefined,
        }),
      });
      const d = await r.json();
      if (!d.ok) { setMsg(d.error || '调用失败'); return }
      onResult(d.result);
      setOpen(false);
      setMsg('已生成并填入字段');
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) {
      setMsg(e.message || '网络异常');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMsg('') }}
        title="AI 生成 / 润色 / 摘要（开关矩阵控制）"
        className="flex items-center gap-1 px-2.5 py-2 rounded-md text-xs border border-red-200 text-red-600 hover:bg-red-50 whitespace-nowrap">
        <Sparkles size={13} /> AI
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles size={16} className="text-red-600" /> AI 写作 · {label}
              {langLabel && <span className="text-xs font-normal text-gray-400">（{langLabel}）</span>}
            </h4>
            <div className="mt-3 flex gap-2">
              {([['generate', '写文章'], ['polish', '润色'], ['summary', '摘要/SEO']] as const).map(([m, t]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-md text-xs border ${mode === m ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {t}
                </button>
              ))}
            </div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
              placeholder={`补充写作要求（选填）。当前字段：${label}${value ? '，已有内容将作为润色/摘要输入' : ''}`}
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500" />
            {msg && <p className={`mt-2 text-xs ${msg.includes('已生成') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button type="button" onClick={run} disabled={busy}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                {busy ? '生成中...' : '开始生成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
