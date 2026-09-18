import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 批量多语言翻译（任务模式，带进度）
 * POST /api/admin/batch-translate  → 启动后台任务，立即返回 { taskId }
 * GET  /api/admin/batch-translate?task=<id> → 查询任务进度 { taskId, status, message, progress, result? }
 * body: { module: 'products'|'news'|'industries'|'services'|'resources'|'careers', limit?: number, overwrite?: boolean }
 */

// 语言代码与字段后缀
const LANGS = ['en', 'ja', 'ko', 'fr', 'ar'] as const
const SUFFIX: Record<string, string> = { en: 'En', ja: 'Ja', ko: 'Ko', fr: 'Fr', ar: 'Ar' }

// 模块 → Prisma 模型名 + 需翻译的标量文本字段（base 字段，多语言后缀自动 base+Suffix）
const MODULES: Record<string, { model: string; fields: string[]; label: string }> = {
  products: { model: 'product', fields: ['name', 'subtitle', 'summary', 'description'], label: '产品' },
  news: { model: 'news', fields: ['title', 'summary', 'content'], label: '新闻' },
  industries: { model: 'industry', fields: ['name', 'tagline', 'description'], label: '行业' },
  services: { model: 'service', fields: ['title', 'subtitle', 'description'], label: '服务' },
  resources: { model: 'resourceItem', fields: ['title', 'description'], label: '资源' },
  careers: { model: 'job', fields: ['title', 'department', 'location', 'summary'], label: '职位' },
}

// 内存任务表（服务重启丢失，仅用于实时进度展示）
const TASKS = new Map<string, { status: string; message: string; progress: string; result?: any; error?: string }>()

// 本机翻译 API 基础地址（服务端自环调用，复用多通道翻译）
const BASE_URL = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`

async function translateText(text: string, targetLang: string, cookie: string): Promise<string> {
  if (!text || !text.trim()) return ''
  try {
    const res = await fetch(`${BASE_URL}/api/admin/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ text, targetLang }),
    })
    if (res.ok) {
      const d = await res.json()
      if (d.provider !== 'fallback' && d.translatedText && d.translatedText.trim()) {
        return d.translatedText
      }
    }
  } catch (e) {
    console.error('[批量翻译] 翻译失败:', (e as Error).message)
  }
  return ''
}

async function runTask(taskId: string, conf: { model: string; fields: string[]; label: string }, cookie: string, limit: number, overwrite: boolean) {
  const model = (prisma as any)[conf.model]
  try {
    const rows = await model.findMany({ orderBy: { id: 'asc' }, take: limit })
    let translated = 0
    let failed = 0
    let filled = 0
    const total = rows.length

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri]
      TASKS.set(taskId, { status: 'running', message: '翻译中...', progress: `${ri + 1}/${total} 条` })
      const updates: Record<string, unknown> = {}
      for (const base of conf.fields) {
        const zh = row[base]
        if (!zh || typeof zh !== 'string' || !zh.trim()) continue
        for (const lang of LANGS) {
          const key = base + SUFFIX[lang]
          if (!(key in row)) continue
          // 已有该语种内容则跳过（除非显式要求重新翻译）
          if (!overwrite && row[key] && String(row[key]).trim()) continue
          // 节流：避免翻译 API 限流
          await new Promise((r) => setTimeout(r, 1150))
          const t = await translateText(String(zh), lang, cookie)
          if (t && t !== String(zh)) {
            updates[key] = t
            translated++
            filled++
          } else {
            failed++
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        await model.update({ where: { id: row.id }, data: updates })
      }
    }

    TASKS.set(taskId, {
      status: 'done',
      message: `${conf.label}批量翻译完成`,
      progress: '完成',
      result: {
        module: conf.model,
        label: conf.label,
        total,
        translated,
        filled,
        failed,
        overwrite,
        message: `${conf.label}批量翻译完成${overwrite ? '（重新翻译模式，已覆盖已有译文）' : '（仅填补空缺）'}：共 ${total} 条，成功填充 ${translated} 个字段，失败 ${failed} 个（失败字段保持原文）。`,
      },
    })
  } catch (e: any) {
    TASKS.set(taskId, { status: 'error', message: e?.message || '批量翻译失败', progress: '', error: e?.message || '批量翻译失败' })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const modKey = String(body.module || '')
  const conf = MODULES[modKey]
  if (!conf) {
    return NextResponse.json({ error: '不支持的模块', supported: Object.keys(MODULES) }, { status: 400 })
  }

  const cookie = req.headers.get('cookie') || ''
  const model = (prisma as any)[conf.model]
  if (!model) return NextResponse.json({ error: `模型 ${conf.model} 不存在` }, { status: 500 })

  const limit = Math.max(1, Math.min(Number(body.limit) || 100000, 100000))
  // 重新翻译（覆盖已有译文）：必须严格 `=== true`，未传时为 false，避免误覆盖人工译文
  const overwrite = body.overwrite === true

  const taskId = `bt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  TASKS.set(taskId, { status: 'running', message: '启动中...', progress: '0/0 条' })
  // 后台执行，立即返回任务 ID（不 await）
  runTask(taskId, conf, cookie, limit, overwrite)

  return NextResponse.json({ ok: true, taskId, label: conf.label })
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('task')
  if (!taskId) return NextResponse.json({ ok: false, error: '缺少任务 ID' }, { status: 400 })
  const task = TASKS.get(taskId)
  if (!task) return NextResponse.json({ ok: false, error: '任务不存在或已过期' }, { status: 404 })
  return NextResponse.json({ ok: true, task: { taskId, status: task.status, message: task.message, progress: task.progress, result: task.result, error: task.error } })
}
