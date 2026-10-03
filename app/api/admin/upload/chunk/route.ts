import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { writeFile, mkdir, rename, rm } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

// 视频/大文件分片上传（支持 >20MB 视频）
// POST formData: uploadId(前端 UUID), file(当前块), index(0-based), total(块数), name(原文件名), size(总字节)
// 前端串行逐块上传；后端 appendFile 顺序写入 tmp/{uploadId}.part，最后一块校验总大小后转入 public/uploads

const MAX_TOTAL = 512 * 1024 * 1024 // 512MB
const VIDEO_EXTS = ['mp4', 'webm']

function safeName(raw: string): string | null {
  const base = path.basename(String(raw || '').replace(/\\/g, '/'))
  const ext = base.split('.').pop()?.toLowerCase() || ''
  if (!VIDEO_EXTS.includes(ext)) return null
  // 只保留字母数字 - _ . 的中文文件名，避免路径问题
  const clean = base.replace(/[^\w\u4e00-\u9fa5.-]/g, '_')
  return clean
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  // 🔒 2026-09-16 语义修正：`req.formData()` 抛错 = **客户端发的不是合法 multipart**（或根本没带 body），
  //    属「客户端输入非法」⇒ 必须 400，而不是被下面的 catch 统一报成 500。
  //    与 `/api/admin/upload` 的坏图处理同一口径（500 表示服务端故障，会误导排障与前端处理）。
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: '请求体不是合法的 multipart/form-data（分片上传必须带 file 字段）' },
      { status: 400 }
    )
  }

  try {
    const file = formData.get('file') as File
    const uploadId = String(formData.get('uploadId') || '')
    const index = Number(formData.get('index'))
    const total = Number(formData.get('total'))
    const rawName = String(formData.get('name') || '')
    const totalSize = Number(formData.get('size'))

    if (!file || file.size === 0) return NextResponse.json({ error: '缺少分片数据' }, { status: 400 })
    if (!/^[A-Za-z0-9-]{8,64}$/.test(uploadId)) return NextResponse.json({ error: '非法 uploadId' }, { status: 400 })
    if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 0 || index >= total) {
      return NextResponse.json({ error: '分片参数错误' }, { status: 400 })
    }
    const finalName = safeName(rawName)
    if (!finalName) return NextResponse.json({ error: '仅支持 mp4 / webm 视频' }, { status: 400 })
    if (!totalSize || totalSize > MAX_TOTAL) return NextResponse.json({ error: '视频不能超过 512MB' }, { status: 400 })

    const tmpDir = path.join(process.cwd(), 'tmp', 'chunks')
    if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true })
    const partFile = path.join(tmpDir, `${uploadId}.part`)

    // 顺序写入分片
    const bytes = Buffer.from(await file.arrayBuffer())
    await writeFile(partFile, bytes, { flag: index === 0 ? 'w' : 'a' })

    // 最后一块：校验总大小 → 转入正式目录
    if (index === total - 1) {
      const actual = statSync(partFile).size
      if (actual !== totalSize) {
        await rm(partFile, { force: true }).catch(() => {})
        return NextResponse.json({ error: `文件校验失败（期望 ${totalSize}，实际 ${actual}），请重传` }, { status: 400 })
      }
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })
      const finalPath = path.join(uploadDir, finalName)
      await rename(partFile, finalPath)
      return NextResponse.json({ success: true, url: `/uploads/${finalName}` })
    }

    return NextResponse.json({ success: true, received: index })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '上传失败' }, { status: 500 })
  }
}
