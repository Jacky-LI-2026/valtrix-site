import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'

export const runtime = 'nodejs'

// 图片类型（转 webp 压缩，生成大图 + 缩略图）
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ANIMATED_TYPES = ['image/gif']

// 压缩图片为 webp：返回 { buffer, width, height }
type InvalidImageError = Error & { code: 'INVALID_IMAGE' }

function invalidImage(message: string): InvalidImageError {
  const e = new Error(message) as InvalidImageError
  e.code = 'INVALID_IMAGE'
  return e
}

// 损坏/伪造的图片数据：sharp 解码失败属「客户端给了非法内容」⇒ 应当 400 而不是 500（2026-09-17 自基地同步）。
// ⚠️ 故意不用 class extends Error + instanceof：若编译到 ES5，原型链会断，instanceof 恒为 false（假阴性）。
async function compressToWebp(buffer: Buffer, maxEdge: number, quality: number) {
  try {
    return await sharp(buffer)
      .rotate() // 自动修正 EXIF 方向
      .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
  } catch (e: any) {
    throw invalidImage(`图片内容无法解析（文件已损坏或不是真实图片）：${e?.message || 'decode failed'}`)
  }
}

// 校验自定义目标路径（供 360 帧等固定命名上传）：只允许字母数字 / _ -，禁止 ..、反斜杠、以 / 开头
function sanitizeTargetPath(p: string): string | null {
  if (!p || typeof p !== 'string') return null
  const trimmed = p.trim().replace(/^\/+|\/+$/g, '')
  if (!/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(trimmed)) return null
  if (trimmed.includes('..')) return null
  if (/\\/.test(trimmed)) return null
  return trimmed
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const targetPath = sanitizeTargetPath(String(formData.get('path') || ''))

    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 })
    }

    // 限制文件大小 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过20MB' }, { status: 400 })
    }

    // 允许的文件类型
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-rar-compressed',
      'video/mp4', 'video/webm',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支持的文件类型' }, { status: 400 })
    }

    // 确定上传目录
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ===== 指定目标路径（360 帧等固定命名）：压缩为 webp 保存到 <uploads>/<path>.webp，覆盖同名，不生成缩略图 =====
    if (targetPath) {
      if (IMAGE_TYPES.includes(file.type)) {
        const fullBuffer = await compressToWebp(buffer, 1600, 80)
        const target = path.join(uploadDir, ...targetPath.split('/'))
        const dir = path.dirname(target)
        if (!existsSync(dir)) await mkdir(dir, { recursive: true })
        await writeFile(`${target}.webp`, fullBuffer)
        return NextResponse.json({
          success: true,
          url: `/uploads/${targetPath}.webp`,
          name: file.name,
          size: fullBuffer.length,
          type: 'image/webp',
        })
      }
      // 非图片 + path：按原扩展名保存到指定路径
      const ext = path.extname(file.name).toLowerCase()
      const safeExt = /^\.(pdf|doc|docx|xls|xlsx|zip|rar|mp4|webm|gif|svg)$/.test(ext) ? ext : ''
      const target = path.join(uploadDir, ...targetPath.split('/'))
      const dir = path.dirname(target)
      if (!existsSync(dir)) await mkdir(dir, { recursive: true })
      await writeFile(`${target}${safeExt}`, buffer)
      return NextResponse.json({
        success: true,
        url: `/uploads/${targetPath}${safeExt}`,
        name: file.name,
        size: file.size,
        type: file.type,
      })
    }

    // ===== 默认：图片压缩为 webp 大图 + 缩略图 =====
    if (IMAGE_TYPES.includes(file.type)) {
      const baseName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      const fullName = `${baseName}.webp`
      const thumbName = `${baseName}_thumb.webp`

      // 大图：最长边 1600px，质量 80（WEB 清晰度）
      const fullBuffer = await compressToWebp(buffer, 1600, 80)
      // 缩略图：最长边 400px，质量 75
      const thumbBuffer = await compressToWebp(buffer, 400, 75)

      const fullPath = path.join(uploadDir, fullName)
      const thumbPath = path.join(uploadDir, thumbName)
      await Promise.all([
        writeFile(fullPath, fullBuffer),
        writeFile(thumbPath, thumbBuffer),
      ])

      return NextResponse.json({
        success: true,
        url: `/uploads/${fullName}`,
        thumbUrl: `/uploads/${thumbName}`,
        name: file.name,
        size: fullBuffer.length,
        thumbSize: thumbBuffer.length,
        type: 'image/webp',
      })
    }

    // GIF / SVG 等保持原样（GIF 动画、SVG 矢量不转 webp）
    const ext = path.extname(file.name) || ''
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // 返回可访问的URL
    const fileUrl = `/uploads/${fileName}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error: any) {
    console.error('文件上传失败:', error)
    // 图片解码失败 = 客户端提供的文件非法 ⇒ 400；其余（磁盘/权限/sharp 环境）仍为 500。
    const status = error?.code === 'INVALID_IMAGE' ? 400 : 500
    return NextResponse.json({ error: error.message || '上传失败' }, { status })
  }
}
