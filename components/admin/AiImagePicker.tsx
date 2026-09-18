"use client";

/**
 * AI 配图按钮（通用组件）
 * =====================================================
 * 挂在任意图片输入字段旁：点击弹出 AI 生图面板（描述 + 比例）→ 生成 → onResult(url)。
 * 用法：
 *   <AiImagePicker value={url} onResult={(u) => setUrl(u)} />
 */
import { useState } from "react";
import { Sparkles, Loader2, Image as ImageIcon } from "lucide-react";

const RATIOS = [
  { label: "横版 16:9", w: 1280, h: 720 },
  { label: "横版 4:3", w: 1024, h: 768 },
  { label: "方形 1:1", w: 1024, h: 1024 },
  { label: "竖版 3:4", w: 768, h: 1024 },
];

export default function AiImagePicker({ value, onResult, placeholder = "描述要生成的图片，如：不锈钢闸阀在现代化车间中……" }: {
  value?: string | null;
  onResult: (url: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const generate = async () => {
    if (!prompt.trim()) { setMsg("请输入图片描述"); return; }
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, width: ratio.w, height: ratio.h }),
      });
      const d = await r.json();
      if (d.error) { setMsg("生成失败：" + d.error); return; }
      onResult(d.url);
      setOpen(false);
      setPrompt("");
    } catch (e: any) { setMsg("生成异常：" + e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs hover:bg-purple-100"
      >
        <Sparkles size={13} /> AI 配图
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ImageIcon size={16} /> AI 生成图片</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {value && (
              <div className="mb-3">
                <img src={value} alt="当前图片" className="max-h-32 rounded border border-gray-200 object-contain" />
              </div>
            )}

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {RATIOS.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setRatio(r)}
                  className={`px-3 py-1.5 rounded text-xs border ${ratio === r ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {msg && <div className="text-xs text-red-500 mt-2">{msg}</div>}

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setOpen(false)} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button
                onClick={generate}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {busy ? "生成中（约 10-30 秒）..." : "生成图片"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
