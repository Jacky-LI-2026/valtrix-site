"use client";

import { useRef, useState, useEffect } from "react";
import { Upload, X, Loader2, Film } from "lucide-react";

interface VideoFieldProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB/块

/**
 * 公共视频字段：URL 录入 + 大文件分片直传（支持 >20MB 视频，512MB 上限）
 * 前台自动渲染 HTML5 播放器。用于产品演示视频、新闻视频等单值视频字段。
 */
export default function VideoField({
  label = "视频",
  value,
  onChange,
  placeholder = "/uploads/xxx.mp4 或 https://...",
  hint = "支持 mp4 / webm 或外链视频地址；可本地直传最大 512MB；前台详情页渲染为播放器（用封面图作海报）",
}: VideoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(true);

  // 「视频内容」插件开关：关闭则隐藏视频字段
  useEffect(() => {
    fetch("/api/public/plugins", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.state && typeof d.state["video-content"] === "boolean") {
          setVideoEnabled(d.state["video-content"]);
        }
      })
      .catch(() => {});
  }, []);

  if (!videoEnabled) return null;

  const triggerFileSelect = () => fileInputRef.current?.click();

  // 分片上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size === 0) {
      setUploadError("文件为空");
      return;
    }
    if (!/\.(mp4|webm)$/i.test(file.name)) {
      setUploadError("仅支持 mp4 / webm 视频");
      return;
    }
    setUploading(true);
    setUploadError("");
    setProgress(0);
    cancelRef.current = false;
    const uploadId = crypto.randomUUID();
    const total = Math.ceil(file.size / CHUNK_SIZE);

    try {
      for (let i = 0; i < total; i++) {
        if (cancelRef.current) break;
        const blob = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const fd = new FormData();
        fd.append("uploadId", uploadId);
        fd.append("file", blob, file.name);
        fd.append("index", String(i));
        fd.append("total", String(total));
        fd.append("name", file.name);
        fd.append("size", String(file.size));
        const res = await fetch("/api/admin/upload/chunk", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setUploadError(data.error || "上传失败");
          setUploading(false);
          return;
        }
        setProgress(Math.round(((i + 1) / total) * 100));
      }
      if (!cancelRef.current) {
        onChange(`/uploads/${file.name.replace(/[^\w\u4e00-\u9fa5.-]/g, "_")}`);
      }
    } catch (err: any) {
      setUploadError(err?.message || "上传失败，请重试");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    cancelRef.current = true;
    setUploading(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none pr-8"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={uploading ? cancelUpload : triggerFileSelect}
          disabled={uploading && !cancelRef.current}
          className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
        >
          {uploading ? (
            cancelRef.current ? (
              <><Loader2 size={16} className="animate-spin" /> 取消中</>
            ) : (
              <><X size={16} /> 取消</>
            )
          ) : (
            <><Upload size={16} /> 上传视频</>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="video/mp4,video/webm" onChange={handleFileChange} className="hidden" />
      </div>
      {uploading && !cancelRef.current && (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Film size={14} />
            <span>分片直传中… {progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
      {hint && !uploading && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
