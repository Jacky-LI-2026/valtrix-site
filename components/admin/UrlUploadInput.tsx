'use client'

import { useState, useRef } from 'react'
import { Upload, Image as ImageIcon, FileText, X, Loader2, Sparkles } from 'lucide-react'

interface UrlUploadInputProps {
  value: string
  onChange: (url: string) => void
  label?: string
  placeholder?: string
  accept?: string // 文件类型限制，如 "image/*" 或 "application/pdf"
  showPreview?: boolean // 是否显示图片预览
  className?: string
  required?: boolean
}

export default function UrlUploadInput({
  value,
  onChange,
  label,
  placeholder = '输入URL或点击上传',
  accept = 'image/*,application/pdf',
  showPreview = true,
  className = '',
  required = false,
}: UrlUploadInputProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // AI 配图（受 image_placeholder 功能点控制）
  const [aiOpen, setAiOpen] = useState(false)
  const [aiKeyword, setAiKeyword] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiMsg, setAiMsg] = useState('')

  // 判断是否是图片
  const isImage = (url: string) => {
    if (!url) return false
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || url.startsWith('/uploads/')
  }

  // 处理文件上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok && data.success) {
        onChange(data.url)
      } else {
        setUploadError(data.error || '上传失败')
      }
    } catch (error) {
      setUploadError('上传失败，请重试')
    } finally {
      setUploading(false)
      // 重置文件输入，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  // AI 配图：关键词 → 占位图 URL → 填入
  const runAiPlaceholder = async () => {
    if (!aiKeyword.trim()) { setAiMsg('请输入图片描述关键词'); return }
    setAiBusy(true); setAiMsg('')
    try {
      const r = await fetch('/api/ai/placeholder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: aiKeyword.trim(), w: 1600, h: 900 }),
      })
      const d = await r.json()
      if (d.ok && d.url) {
        onChange(d.url)
        setAiOpen(false)
        setAiKeyword('')
      } else {
        setAiMsg(d.error || '生成失败')
      }
    } catch (e: any) {
      setAiMsg(e.message || '网络异常')
    } finally {
      setAiBusy(false)
    }
  }

  // 清除URL
  const clearUrl = () => {
    onChange('')
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none pr-8"
          />
          {value && (
            <button
              type="button"
              onClick={clearUrl}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={uploading}
          className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> 上传中</>
          ) : (
            <><Upload size={16} /> 上传</>
          )}
        </button>
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-md text-sm text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          title="AI 占位配图（输入关键词生成）"
        >
          <Sparkles size={16} /> AI配图
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {/* AI 配图弹窗 */}
      {aiOpen && (
        <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-purple-600" />
            <span className="text-sm font-medium text-purple-700">AI 占位配图</span>
            <button type="button" onClick={() => { setAiOpen(false); setAiMsg('') }} className="ml-auto text-purple-400 hover:text-purple-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiKeyword}
              onChange={(e) => setAiKeyword(e.target.value)}
              placeholder="如：工业阀门 / 流体控制设备"
              className="flex-1 px-3 py-2 border border-purple-200 rounded text-sm focus:outline-none focus:border-purple-400"
              onKeyDown={(e) => { if (e.key === 'Enter') runAiPlaceholder() }}
            />
            <button
              type="button"
              onClick={runAiPlaceholder}
              disabled={aiBusy}
              className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {aiBusy ? <><Loader2 size={14} className="animate-spin" /> 生成中</> : <><Sparkles size={14} /> 生成</>}
            </button>
          </div>
          {aiMsg && <p className={`text-xs mt-1.5 ${aiMsg.includes('未开启') ? 'text-amber-600' : 'text-red-500'}`}>{aiMsg}</p>}
          <p className="text-xs text-purple-400 mt-1.5">免费占位图（随机风景/工业图）；语义 AI 生图可在「AI 开关矩阵」接入图像服务商。</p>
        </div>
      )}
      {uploadError && (
        <p className="text-xs text-red-500 mt-1">{uploadError}</p>
      )}
      {/* 图片预览 */}
      {showPreview && value && isImage(value) && (
        <div className="mt-2 relative inline-block">
          <img
            src={value}
            alt="预览"
            className="h-24 w-auto object-cover rounded border border-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}
      {/* 文件类型图标 */}
      {showPreview && value && !isImage(value) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          {value.endsWith('.pdf') ? (
            <><FileText size={16} className="text-red-500" /> PDF文件</>
          ) : (
            <><ImageIcon size={16} className="text-blue-500" /> 文件链接</>
          )}
          <span className="truncate max-w-xs">{value}</span>
        </div>
      )}
    </div>
  )
}
