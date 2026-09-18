"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, FileText } from "lucide-react";

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  label?: string;
  type?: "image" | "file";
}

export default function FileUpload({
  value,
  onChange,
  accept = "image/*",
  label = "上传文件",
  type = "image",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [thumbUrl, setThumbUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        onChange(data.url);
        setThumbUrl(data.thumbUrl || "");
      } else {
        setError(data.error || "上传失败");
      }
    } catch (err) {
      setError("上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
    setThumbUrl("");
  };

  const isImage = type === "image" || (value && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {value ? (
        <div className="relative inline-block">
          {isImage ? (
            <div className="relative w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <img
                src={thumbUrl || value}
                alt="预览"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <FileText size={20} className="text-gray-400" />
              <span className="text-sm text-gray-600 max-w-xs truncate">{value}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            title="移除"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="text-sm text-gray-500">上传中...</div>
          ) : (
            <>
              {isImage ? <ImageIcon size={24} className="text-gray-400 mb-2" /> : <Upload size={24} className="text-gray-400 mb-2" />}
              <span className="text-xs text-gray-500">点击上传</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleUpload}
        className="hidden"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
      {value && <p className="text-xs text-gray-400 break-all">{value}</p>}
    </div>
  );
}
