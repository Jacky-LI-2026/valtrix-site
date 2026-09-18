import { NextRequest, NextResponse } from 'next/server'
import { getBrandName } from '@/lib/brand'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 一键 AI 补全 SEO/GEO 配置（异步任务版）
 * POST /api/admin/seo-fill  → 启动后台任务，立即返回 { taskId }
 * GET  /api/admin/seo-fill?task=<id> → 查询任务进度
 * 遍历内容模块：中文 SEO 缺失自动生成、多语言（En/Ja/Ko/Fr/Ar）用 AI 翻译补全、
 * GEO 地区/城市缺失用站点地址补全。单条失败不中断整批。
 */

// 全局内存任务表（进程内；pm2 重启会丢失，可接受）
const TASKS = new Map<string, { status: string; message: string; progress: string; result?: unknown; error?: string }>()

const LANGS = ['en', 'ja', 'ko', 'fr', 'ar'] as const
const SUFFIX: Record<string, string> = { en: 'En', ja: 'Ja', ko: 'Ko', fr: 'Fr', ar: 'Ar' }

interface ModuleConf {
  key: string
  model: string
  titleField: string
  descFields: string[]
  label: string
}

const MODULES: ModuleConf[] = [
  { key: 'products', model: 'product', titleField: 'name', descFields: ['summary', 'description'], label: '产品' },
  { key: 'news', model: 'news', titleField: 'title', descFields: ['summary', 'content'], label: '新闻' },
  { key: 'industries', model: 'industry', titleField: 'name', descFields: ['tagline', 'description'], label: '行业' },
  { key: 'services', model: 'service', titleField: 'title', descFields: ['subtitle', 'description'], label: '服务' },
  { key: 'careers', model: 'job', titleField: 'title', descFields: ['summary', 'description'], label: '职位' },
  { key: 'resources', model: 'resourceItem', titleField: 'title', descFields: ['description'], label: '资源' },
  { key: 'about', model: 'aboutSection', titleField: 'title', descFields: ['description'], label: '关于' },
]

const BASE_URL = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// 按列类型长度截断，避免 P2000 值超长（seoTitle* 为 VarChar(200)/En VarChar(300)）
function capField(key: string, v: string): string {
  const s = String(v || '').trim()
  if (key.startsWith('seoTitle')) {
    if (key.endsWith('En')) return s.slice(0, 290)
    return s.slice(0, 190)
  }
  return s
}

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
    console.error('[SEO补全] 翻译失败:', (e as Error).message)
  }
  return ''
}

async function runTask(taskId: string, cookie: string) {
  const stats: Record<string, unknown> = {}
  let totalFilled = 0
  let totalFailed = 0
  try {
    // 站点配置 → GEO 补全
    let geoRegion = '北京市,广东省深圳市'
    let geoCity = '北京,深圳'
    try {
      const sc = await (prisma as any).siteConfig.findFirst({ where: { configKey: 'contact_info' } })
      const ci = sc?.configValue
      if (ci && Array.isArray(ci.addresses) && ci.addresses.length > 0) {
        const joined = ci.addresses.join(',')
        const cityZh = (joined.includes('北京') ? '北京' : '') + (joined.includes('深圳') ? (joined.includes('北京') ? ',深圳' : '深圳') : '')
        const regionZh = (joined.includes('北京') ? '北京市' : '') + (joined.includes('深圳') ? (joined.includes('北京') ? ',广东省深圳市' : '广东省深圳市') : '')
        if (cityZh) { geoCity = cityZh; geoRegion = regionZh }
      }
    } catch { /* 保持默认 */ }

    for (let mi = 0; mi < MODULES.length; mi++) {
      const conf = MODULES[mi]
      const model = (prisma as any)[conf.model]
      if (!model) { stats[conf.key] = { label: conf.label, skipped: true }; continue }
      const rows = await model.findMany({ orderBy: { id: 'asc' } })
      let filled = 0
      let failed = 0
      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri]
        const updates: Record<string, unknown> = {}
        const hasField = (k: string) => k in row

        // 1. 中文 SEO 自动生成
        const titleZh = row[conf.titleField] ? String(row[conf.titleField]) : ''
        if ((!row.seoTitle || !String(row.seoTitle).trim()) && titleZh && hasField('seoTitle')) {
          updates.seoTitle = titleZh.slice(0, 200)
        }
        if ((!row.seoDescription || !String(row.seoDescription).trim()) && hasField('seoDescription')) {
          let desc = ''
          for (const f of conf.descFields) {
            if (row[f] && String(row[f]).trim()) { desc = stripHtml(String(row[f])); break }
          }
          if (desc) updates.seoDescription = desc.slice(0, 160)
        }
        if ((!row.seoKeywords || !String(row.seoKeywords).trim()) && hasField('seoKeywords')) {
          updates.seoKeywords = `${getBrandName() ? getBrandName() + "," : ""}${titleZh},工业阀门,闸阀,球阀,蝶阀,流体控制`
        }

        // 2. 多语言 SEO 补全（翻译）
        const baseFields = ['seoTitle', 'seoDescription', 'seoKeywords']
        for (const base of baseFields) {
          const zh = updates[base] !== undefined ? String(updates[base]) : (row[base] ? String(row[base]) : '')
          if (!zh || !zh.trim()) continue
          for (const lang of LANGS) {
            const key = base + SUFFIX[lang]
            if (!hasField(key)) continue
            if (row[key] && String(row[key]).trim()) continue
            if (updates[key] !== undefined) continue
            await new Promise((r) => setTimeout(r, 400))
            const t = await translateText(zh, lang, cookie)
            // 翻译返回非空即写入（含同形词：如中文"精密加工"→日文同为"精密加工"，不等于失败）
            if (t && t.trim()) updates[key] = t
            else failed++
          }
        }

        // 3. GEO 补全
        if ((!row.geoRegion || !String(row.geoRegion).trim()) && hasField('geoRegion')) updates.geoRegion = geoRegion
        if ((!row.geoCity || !String(row.geoCity).trim()) && hasField('geoCity')) updates.geoCity = geoCity

        if (Object.keys(updates).length > 0) {
          try {
            for (const k of Object.keys(updates)) {
              if (typeof updates[k] === 'string') updates[k] = capField(k, updates[k] as string)
            }
            await model.update({ where: { id: row.id }, data: updates })
            filled++
          } catch (e) {
            console.error('[SEO补全] 写入失败', conf.key, row.id, (e as Error).message)
            failed++
          }
        }

        TASKS.set(taskId, {
          status: 'running',
          message: `正在补全 ${conf.label}（${mi + 1}/${MODULES.length} 模块）`,
          progress: `${ri + 1}/${rows.length} 条`,
        })
      }
      stats[conf.key] = { label: conf.label, total: rows.length, filled, failed }
      totalFilled += filled
      totalFailed += failed
    }

    TASKS.set(taskId, {
      status: 'done',
      message: `SEO/GEO 一键补全完成：共补全 ${totalFilled} 个字段，失败 ${totalFailed} 个。`,
      progress: '完成',
      result: { totalFilled, totalFailed, modules: stats },
    })
  } catch (e: any) {
    TASKS.set(taskId, { status: 'error', message: e?.message || 'SEO/GEO 补全失败', progress: '失败', error: String(e?.message || e) })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const cookie = req.headers.get('cookie') || ''
  const taskId = 'seofill_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  TASKS.set(taskId, { status: 'running', message: '启动中...', progress: '' })
  // 后台执行，立即返回
  void runTask(taskId, cookie)
  return NextResponse.json({ ok: true, taskId })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const taskId = req.nextUrl.searchParams.get('task') || ''
  const t = TASKS.get(taskId)
  if (!t) return NextResponse.json({ ok: false, task: null })
  return NextResponse.json({ ok: true, task: t })
}
