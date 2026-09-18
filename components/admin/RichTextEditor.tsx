"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

// 动态导入react-quill，避免SSR问题
const ReactQuill = dynamic(() => import("react-quill"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
      <span className="text-gray-400 text-sm">编辑器加载中...</span>
    </div>
  ),
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  readOnly?: boolean;
  aiLabel?: string;
}

/** AI 工具条（润色 / 摘要 / 生成），受 AI 开关矩阵功能点控制 */
function RichTextAiToolbar({ value, onChange, aiLabel }: { value: string; onChange: (v: string) => void; aiLabel: string }) {
  const [mode, setMode] = useState<null | 'generate' | 'polish' | 'summary'>(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const plainText = () => {
    try {
      const div = document.createElement('div');
      div.innerHTML = value;
      return div.textContent || '';
    } catch {
      return value || '';
    }
  };

  const run = async () => {
    if (!mode) return;
    setBusy(true); setMsg('');
    try {
      const featureMap = { generate: 'editor_generate', polish: 'editor_polish', summary: 'editor_summary' } as const;
      // 富文本：若含 HTML 标签则保留原文结构发送（DeepSeek 可保留标签），否则用纯文本
      const isHtml = /<[a-z][\s\S]*>/i.test(value || '');
      const sendText = isHtml ? (value || '') : plainText();
      const extraPrompt = isHtml ? '。原文包含 HTML 标签，请完整保留原有标签与段落结构，只改写文字内容' : '';
      const r = await fetch('/api/ai/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: featureMap[mode], action: mode, label: aiLabel, text: sendText, prompt: (prompt || '') + extraPrompt }),
      });
      const d = await r.json();
      if (!d.ok) { setMsg(d.error || '调用失败'); return; }
      onChange(d.result);
      setMode(null); setPrompt('');
      setMsg('已生成并填入编辑器');
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) {
      setMsg(e.message || '网络异常');
    } finally {
      setBusy(false);
    }
  };

  const MODES = [
    ['polish', '润色'],
    ['summary', '摘要'],
    ['generate', '生成'],
  ] as const;

  return (
    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
      <span className="text-xs text-gray-400 mr-1">AI</span>
      {MODES.map(([m, t]) => (
        <button key={m} type="button" onClick={() => { setMode(m); setMsg(''); }}
          className="px-2 py-1 rounded text-xs border border-red-200 text-red-600 hover:bg-red-50">{t}</button>
      ))}
      {msg && <span className="text-xs text-green-600">{msg}</span>}
      {mode && (
        <span className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMode(null)}>
          <span className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <span className="block text-base font-semibold text-gray-900 mb-1">
              AI {mode === 'generate' ? '生成' : mode === 'polish' ? '润色' : '摘要'} · {aiLabel}
            </span>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
              placeholder={'补充写作要求（选填）' + (plainText() ? '，已有内容将作为输入' : '')}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500" />
            <span className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setMode(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button type="button" onClick={run} disabled={busy}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">{busy ? '生成中...' : '开始'}</button>
            </span>
          </span>
        </span>
      )}
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "请输入内容...",
  height = 300,
  readOnly = false,
  aiLabel = "正文内容",
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const quillRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理图片选择：上传到服务器（服务端自动压缩为 webp 大图+缩略图），插入返回的 URL，避免 base64 内嵌膨胀
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "上传失败");
      }

      // 获取编辑器实例
      const reactQuill = quillRef.current;
      const editor = reactQuill?.getEditor?.() || reactQuill?.editor || reactQuill;
      if (editor && typeof editor.insertEmbed === "function") {
        const range = editor.getSelection(true);
        const index = range?.index ?? 0;
        editor.insertEmbed(index, "image", data.url);
        editor.setSelection(index + 1);
      } else {
        // fallback：直接在光标位置插入 HTML
        document.execCommand("insertImage", false, data.url);
      }
    } catch (err) {
      console.error("图片上传失败:", err);
      alert("图片上传失败，请重试");
    } finally {
      setUploading(false);
    }

    e.target.value = "";
  }, []);

  // 自定义图片按钮处理
  const imageHandler = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 工具栏配置（useMemo 避免重复初始化）
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ align: [] }],
          ["link", "image", "video"],
          ["blockquote", "code-block"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    [imageHandler]
  );

  const formats = useMemo(
    () => [
      "header", "bold", "italic", "underline", "strike",
      "color", "background", "list", "bullet", "indent",
      "align", "link", "image", "video", "blockquote", "code-block",
    ],
    []
  );

  if (!mounted) {
    return (
      <div
        className="w-full bg-gray-50 rounded border border-gray-300 flex items-center justify-center"
        style={{ height }}
      >
        <span className="text-gray-400 text-sm">编辑器加载中...</span>
      </div>
    );
  }

  return (
    <div className="rich-text-editor w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      {!readOnly && <RichTextAiToolbar value={value} onChange={onChange} aiLabel={aiLabel} />}
      <ReactQuill
        {...({ ref: quillRef } as any)}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        readOnly={readOnly}
      />
      {uploading && (
        <div className="text-xs text-gray-500 mt-1">图片上传中，正在压缩为 WebP 并保存...</div>
      )}
      <style jsx global>{`
        .rich-text-editor {
          position: relative;
          z-index: 1;
        }
        .rich-text-editor .quill {
          background: white;
          border-radius: 0.375rem;
          display: flex;
          flex-direction: column;
        }
        .rich-text-editor .ql-toolbar.ql-snow {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          background: #f9fafb;
          border: 1px solid #d1d5db;
          border-bottom: none;
          flex-shrink: 0;
        }
        .rich-text-editor .ql-container.ql-snow {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          border: 1px solid #d1d5db;
          font-size: 14px;
          flex: 1;
          overflow: hidden;
        }
        .rich-text-editor .ql-editor {
          min-height: ${height - 42}px;
          max-height: ${height + 200}px;
          overflow-y: auto;
          padding: 12px 15px;
        }
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          font-style: normal;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
