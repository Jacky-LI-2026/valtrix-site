import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { callAiText } from '@/lib/ai/gateway'

// 手动触发采集
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { sourceId } = body

    if (!sourceId) {
      return NextResponse.json({ error: '缺少采集源ID' }, { status: 400 })
    }

    const source = await prisma.newsCollectionSource.findUnique({
      where: { id: BigInt(sourceId) },
    })

    if (!source) {
      return NextResponse.json({ error: '采集源不存在' }, { status: 404 })
    }

    // 执行真实采集
    const result = await executeCollection(source)

    // 更新采集源状态
    await prisma.newsCollectionSource.update({
      where: { id: BigInt(sourceId) },
      data: {
        lastFetched: new Date(),
        lastStatus: result.success ? 'success' : 'failed',
        lastError: result.error || null,
      },
    })

    return NextResponse.json({
      success: result.success,
      collected: result.collected,
      message: result.message,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ===== 工具：HTML 实体解码 =====
function decodeEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n) => String.fromCharCode(parseInt(n, 16)))
    .trim()
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZuowenCollector/1.0)' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

// ===== RSS 解析（RSS 2.0 + Atom 兼容，正则提取）=====
// 提取 block 内指定标签内容（按优先级返回第一个非空）
function extractField(block: string, tags: string[]): string {
  for (const tag of tags) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
    const m = block.match(re)
    if (m && m[1] && m[1].trim()) return m[1]
  }
  return ''
}

function parseRss(xml: string, maxItems = 20): { title: string; link: string; description: string; pubDate: string | null }[] {
  const items: { title: string; link: string; description: string; pubDate: string | null }[] = []
  // 兼容 RSS <item> 与 Atom <entry>
  const blocks = xml.match(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi) || []
  for (const block of blocks) {
    const mTitle = block.match(/<(?:title|atom:title)[^>]*>([\s\S]*?)<\/(?:title|atom:title)>/i)
    const mLink = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i) || block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)
    const mDate = block.match(/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i)
    const title = mTitle ? decodeEntities(stripTags(mTitle[1])) : ''
    const link = mLink ? decodeEntities(mLink[1]) : ''
    // 正文：优先 content:encoded 完整正文，再 description/summary。
    // 关键坑：必须先 decodeEntities（其中含 CDATA 剥除）再 stripTags，
    // 否则 CDATA 包裹的正文会被 stripTags 当作 HTML 标签整体删除（正文变空）。
    const descRaw = extractField(block, ['content:encoded', 'content', 'description', 'summary', 'atom:summary'])
    const description = descRaw ? stripTags(decodeEntities(descRaw)) : ''
    const pubDate = mDate ? decodeEntities(mDate[1]) : null
    if (!title || !link) continue
    items.push({ title: title.slice(0, 200), link: link.slice(0, 500), description: description.slice(0, 3000), pubDate })
    if (items.length >= maxItems) break
  }
  return items
}

// ===== HTML 解析：提取正文链接（过滤导航/广告）=====
function parseHtml(html: string, baseUrl: string, maxItems = 20): { title: string; link: string }[] {
  const out: { title: string; link: string }[] = []
  const anchors = html.match(/<a[^>]+href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) || []
  const seen = new Set<string>()
  for (const a of anchors) {
    const hrefM = a.match(/href=["']([^"']+)["']/i)
    const textM = a.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
    if (!hrefM || !textM) continue
    let href = decodeEntities(hrefM[1])
    const title = decodeEntities(stripTags(textM[1])).slice(0, 200)
    if (!href || !title || title.length < 6) continue
    // 过滤纯锚点/脚本/邮件/无意义链接
    if (/^(#|javascript:|mailto:|tel:)/i.test(href)) continue
    if (/^(javascript|void)/i.test(href)) continue
    // 相对路径补全
    if (href.startsWith('/')) {
      const u = new URL(baseUrl)
      href = u.origin + href
    } else if (!/^https?:\/\//i.test(href)) continue
    // 过滤明显非正文链接（导航词）
    if (/^(首页|关于|登录|注册|联系|更多|上一页|下一页|下一页|评论|分享|新闻|about|home|login|register|contact|privacy|terms)$/i.test(title)) continue
    const key = href + title
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ title, link: href.slice(0, 500) })
    if (out.length >= maxItems) break
  }
  return out
}

// ===== 采集后 AI 处理（任务级 aiMode：off / summary / polish）=====
async function applyAiToEntry(source: any, entry: { title: string; content: string }): Promise<{ summary: string; content: string }> {
  const mode = source?.aiMode || (source?.useAI ? 'polish' : 'off')
  if (mode === 'off') return { summary: entry.content.slice(0, 300), content: entry.content }
  try {
    if (mode === 'summary') {
      const s = await callAiText(`请为以下新闻生成 60 字以内的中文摘要（纯文本，不要 Markdown 符号）：\n\n${entry.content.slice(0, 2000)}`, { maxTokens: 200, temperature: 0.4 })
      return { summary: (s || entry.content.slice(0, 300)).slice(0, 500), content: entry.content }
    }
    // polish：AI 润色正文（保持原意、更通顺专业）
    const c = await callAiText(`请润色以下新闻正文，使其更专业、通顺、结构清晰（保持原意与事实，纯文本输出，不要 Markdown 标题符号）：\n\n${entry.content.slice(0, 3000)}`, { maxTokens: 1500, temperature: 0.5 })
    return { summary: entry.content.slice(0, 300), content: c || entry.content }
  } catch (e: any) {
    console.error('[采集] AI 处理失败，回退原文:', e?.message)
    return { summary: entry.content.slice(0, 300), content: entry.content }
  }
}

// ===== 采集执行函数（真实实现）=====
async function executeCollection(source: any) {
  let collected = 0
  const errors: string[] = []
  try {
    const url = String(source.url || '').trim()
    if (!/^https?:\/\//i.test(url)) throw new Error('采集源 URL 必须以 http(s):// 开头')

    const body = await fetchText(url)
    let entries: { title: string; link: string; description?: string; pubDate?: string | null }[] = []

    if (source.type === 'rss') {
      entries = parseRss(body)
    } else if (source.type === 'html') {
      entries = parseHtml(body, url)
    } else if (source.type === 'api') {
      // JSON API：期望 { items: [...] } 或数组，字段 title/link/description
      try {
        const json = JSON.parse(body)
        const arr = Array.isArray(json) ? json : Array.isArray(json.items) ? json.items : Array.isArray(json.data) ? json.data : []
        for (const it of arr) {
          const t = it?.title || it?.name || it?.headline
          const l = it?.link || it?.url || it?.href
          if (t && l) entries.push({ title: String(t).slice(0, 200), link: String(l).slice(0, 500), description: it?.description ? String(it.description).slice(0, 2000) : '' })
          if (entries.length >= 20) break
        }
      } catch {
        throw new Error('API 类型要求返回 JSON（数组或 {items:[]}）')
      }
    } else {
      throw new Error(`不支持的采集类型: ${source.type}`)
    }

    console.log(`[采集] ${source.name} url=${url} type=${source.type} bodyLen=${body.length} entries=${entries.length}`)

    const status: string = source.autoPublish ? 'published' : 'draft'
    const now = new Date()
    const categoryId = source.categoryId ? BigInt(source.categoryId) : null

    for (const e of entries) {
      try {
        // 去重：同 title 或同 sourceUrl 已存在则跳过
        const dup = await prisma.news.findFirst({
          where: {
            OR: [{ title: e.title }, { sourceUrl: e.link }],
          },
        })
        if (dup) continue
        const slug = `collected-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
        const content = e.description || e.title
        // 任务级 AI 处理（off/summary/polish）
        const { summary, content: finalContent } = await applyAiToEntry(source, { title: e.title, content })
        await prisma.news.create({
          data: {
            title: e.title,
            slug,
            summary,
            content: finalContent,
            source: source.name,
            sourceUrl: e.link,
            categoryId,
            status,
            publishedAt: e.pubDate && !isNaN(Date.parse(e.pubDate)) ? new Date(e.pubDate) : now,
          },
        })
        collected++
      } catch (err: any) {
        console.error('[采集] 写入失败:', e?.title, err?.message)
        if (err?.code === 'P2002') continue // 唯一冲突（slug/title）跳过
        errors.push(`${e.title}: ${err.message}`)
      }
    }

    const aiNote = source?.aiMode === 'summary' ? '（AI 摘要模式）' : source?.aiMode === 'polish' ? '（AI 润色模式）' : (source?.useAI ? '（useAI 已启用）' : '')
    return {
      success: true,
      collected,
      message: `采集源"${source.name}"完成，新增 ${collected} 条，来源类型 ${source.type}${aiNote}${errors.length ? `；${errors.length} 条失败` : ''}`,
    }
  } catch (error: any) {
    return {
      success: false,
      collected,
      error: error.message,
      message: `采集失败: ${error.message}`,
    }
  }
}
