'use client'

import { useState, useRef } from 'react'
import { Upload, Image as ImageIcon, X, Loader2, RotateCcw, Settings } from 'lucide-react'

interface ThreeSixtyUploadProps {
  value: string // 路径模板，如 /uploads/360/zw-10d/Frame{index}.webp
  onChange: (template: string, totalFrames: number, startIndex: number) => void
  productModel?: string // 产品型号，用于生成路径
  totalFrames: number
  startIndex: number
}

export default function ThreeSixtyUpload({
  value,
  onChange,
  productModel = '',
  totalFrames,
  startIndex,
}: ThreeSixtyUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [error, setError] = useState('')
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 从模板中解析目录路径（兼容 /uploads/360/... 与 /images/360/...）
  const getDirectoryFromTemplate = (template: string): string => {
    if (!template) return ''
    const match = template.match(/^(.*\/)Frame\{index\}\.(png|jpg|jpeg|webp)$/i)
    return match ? match[1] : ''
  }

  // 生成路径模板（360 帧统一存到 /uploads/360/<slug>/Frame{index}.webp）
  const generateTemplate = (model: string): string => {
    const slug = model.toLowerCase().replace(/[^a-z0-9]/g, '-')
    return `/uploads/360/${slug}/Frame{index}.webp`
  }

  // 帧图片前端压缩（canvas 转 webp，最大宽度 1024px，质量 0.85）
  const compressImage = (file: File, maxWidth: number = 1024, quality: number = 0.85): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas not supported'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob)
              else reject(new Error('Compression failed'))
            },
            'image/webp',
            quality
          )
        }
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })
  }

  // 上传单张图片到固定路径（/uploads/360/<slug>/Frame<NNNNNN>.webp）
  const uploadSingleImage = async (blob: Blob, targetPath: string, fileName: string): Promise<string> => {
    const formData = new FormData()
    const file = new File([blob], fileName, { type: 'image/webp' })
    formData.append('file', file)
    formData.append('path', targetPath)

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || '上传失败')
    }
    return data.url
  }

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError('')
    setUploadProgress(0)
    setUploadedCount(0)
    setPreviewImages([])

    try {
      const fileArray = Array.from(files)
      // 按文件名排序，确保帧顺序正确
      fileArray.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

      const template = generateTemplate(productModel || 'product')
      const slug = productModel.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'product'

      const uploadedUrls: string[] = []
      const previews: string[] = []

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const frameIndex = startIndex + i
        // 6 位补零，与前台 ThreeSixtyViewer 的 padStart(6) 保持一致
        const frameLabel = String(frameIndex).padStart(6, '0')
        const targetPath = `360/${slug}/Frame${frameLabel}`

        // 前端压缩（webp 1024px）
        const compressedBlob = await compressImage(file)

        // 上传到固定路径（服务端再压缩为 webp）
        const url = await uploadSingleImage(compressedBlob, targetPath, `Frame${frameLabel}.webp`)
        uploadedUrls.push(url)

        // 生成预览（第一张和最后几张）
        if (i < 3 || i === fileArray.length - 1) {
          previews.push(url)
        }

        setUploadedCount(i + 1)
        setUploadProgress(Math.round(((i + 1) / fileArray.length) * 100))
      }

      setPreviewImages(previews.slice(0, 4))
      onChange(template, fileArray.length, startIndex)
    } catch (err: any) {
      setError(err.message || '上传失败，请重试')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 清除360配置
  const handleClear = () => {
    onChange('', 60, 1)
    setPreviewImages([])
    setImgErrors(new Set())
    setError('')
  }

  const directory = getDirectoryFromTemplate(value)

  // 从模板推导首帧图片URL（用于显示已上传的缩略图）
  const getFrameUrl = (frameIndex: number): string => {
    if (!value) return ''
    return value.replace('{index}', String(frameIndex).padStart(6, '0'))
  }

  // 已有配置时的预览帧（首帧 + 中间几帧）
  const existingPreviewFrames = value
    ? [startIndex, Math.floor(startIndex + totalFrames / 4), Math.floor(startIndex + totalFrames / 2), startIndex + totalFrames - 1]
        .filter((v, i, arr) => arr.indexOf(v) === i && v >= startIndex && v < startIndex + totalFrames)
    : []

  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set())

  return (
    <div className="space-y-3">
      {/* 上传区域 */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            图片路径模板（上传后自动生成）
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value, totalFrames, startIndex)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none font-mono"
            placeholder="/uploads/360/zw-10d/Frame{index}.webp"
          />
          {directory && (
            <p className="text-xs text-gray-400 mt-1">
              目录: {directory} · 共 {totalFrames} 帧 · 起始帧 {startIndex}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
          >
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> 上传中</>
            ) : (
              <><Upload size={16} /> 上传360图片</>
            )}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <X size={16} /> 清除
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* 上传进度 */}
      {uploading && (
        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>正在上传并压缩图片... {uploadedCount}/{uploadProgress > 0 ? Math.round(uploadedCount / (uploadProgress / 100)) : '...'}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            图片将压缩为 WebP（最大宽度1024px），自动命名为 Frame000001.webp、Frame000002.webp...
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
      )}

      {/* 预览图：上传中显示上传的预览，已有配置时显示从模板推导的缩略图 */}
      {(previewImages.length > 0 || (value && existingPreviewFrames.length > 0)) && (
        <div className="flex gap-2 flex-wrap items-center">
          {previewImages.length > 0 ? (
            previewImages.map((url, index) => (
              <div key={index} className="relative">
                <img
                  src={url}
                  alt={`360预览 ${index + 1}`}
                  className="h-16 w-16 object-cover rounded border border-gray-200"
                />
                {index === 0 && <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] px-1 rounded">首帧</span>}
              </div>
            ))
          ) : (
            existingPreviewFrames.map((frameIdx) => {
              const url = getFrameUrl(frameIdx)
              const hasError = imgErrors.has(frameIdx)
              return (
                <div key={frameIdx} className="relative">
                  {hasError ? (
                    <div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-[10px] text-gray-400 text-center px-1">
                      图片缺失
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`360帧 ${frameIdx}`}
                      className="h-16 w-16 object-cover rounded border border-gray-200"
                      onError={() => setImgErrors(prev => new Set(prev).add(frameIdx))}
                    />
                  )}
                  {frameIdx === startIndex && <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] px-1 rounded">首帧</span>}
                  <span className="absolute -bottom-1 -right-1 bg-gray-700 text-white text-[9px] px-1 rounded">#{frameIdx}</span>
                </div>
              )
            })
          )}
          {totalFrames > 4 && previewImages.length === 0 && (
            <div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-xs text-gray-500">
              +{totalFrames - existingPreviewFrames.length}
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div className="text-xs text-gray-400 bg-gray-50 rounded-md p-3 border border-gray-100">
        <p className="font-medium text-gray-500 mb-1 flex items-center gap-1">
          <Settings size={12} /> 使用说明
        </p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>选择多张360度旋转帧图片（建议36张或60张），按文件名序号排序</li>
          <li>系统自动压缩为 WebP（最大宽度1024px），并自动命名 Frame000001.webp、Frame000002.webp...</li>
          <li>上传完成后自动生成路径模板，前台产品详情页即可使用360度旋转功能</li>
          <li>也可手动输入路径模板（如已通过 FTP 上传的图片序列，可填 /uploads/360/型号/Frame{"{index}"}.png）</li>
        </ul>
      </div>
    </div>
  )
}
