import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { callAiText } from '@/lib/ai/gateway'
import { prisma } from '@/lib/prisma'
import { recordOperation } from '@/lib/operation-log'
import fs from 'fs'
import path from 'path'

const TASKS_FILE = path.join(process.cwd(), 'data', 'video-tasks.jsonl')

function loadTasks(): any[] {
  try {
    if (!fs.existsSync(TASKS_FILE)) return []
    return fs.readFileSync(TASKS_FILE, 'utf8')
      .split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l) } catch { return null } })
      .filter(Boolean)
  } catch { return [] }
}

function appendTask(t: any) {
  try {
    fs.mkdirSync(path.dirname(TASKS_FILE), { recursive: true })
    fs.appendFileSync(TASKS_FILE, JSON.stringify(t) + '\n')
  } catch (e) { console.warn('写任务失败', e) }
}

/** GET：视频生成任务列表 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const tasks = loadTasks().reverse()
  return NextResponse.json({ ok: true, tasks })
}

/**
 * POST：AI 视频分镜文案生成
 * body: { subject 主题, sellingPoints 卖点[], style 风格, duration 秒, lang 文案语言 }
 * 输出：专业分镜脚本（场景/画面/旁白/字幕/时长），记录任务供后续接入 Seedance 渲染。
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const subject = String(body.subject || '').trim()
  if (!subject) return NextResponse.json({ error: '请填写视频主题' }, { status: 400 })

  const selling = Array.isArray(body.sellingPoints) ? body.sellingPoints.filter(Boolean) : []
  const style = String(body.style || '科技工业风').trim()
  const duration = Math.min(60, Math.max(5, Number(body.duration) || 8))
  const lang = body.lang === 'en' ? 'en' : 'zh'

  const prompt = `请为一条企业产品宣传短视频生成专业分镜脚本。
主题：${subject}
核心卖点：${selling.length ? selling.join('；') : '（未提供，请根据主题合理提炼）'}
风格：${style}
目标时长：${duration}秒
要求：
1. 输出 JSON 数组，每个元素一个镜头：{ "scene": 镜头序号, "duration": 秒数, "visual": "画面内容描述（含镜头运动/场景/元素）", "voiceover": "旁白文案", "subtitle": "屏幕字幕" }
2. 镜头时长合计等于 ${duration} 秒，4-8 个镜头
3. 画面描述要具体、可执行（适合 AI 视频生成工具），旁白简洁有力、符合${style}调性
4. 只输出 JSON，不要其他解释文字`

  try {
    const raw = await callAiText(prompt, { temperature: 0.7, maxTokens: 2000 })
    // 提取 JSON
    let script: any[] = []
    try {
      const start = raw.indexOf('[')
      const end = raw.lastIndexOf(']')
      if (start >= 0 && end > start) script = JSON.parse(raw.slice(start, end + 1))
      else script = []
    } catch (e) {
      script = []
    }
    if (!Array.isArray(script) || script.length === 0) {
      return NextResponse.json({ error: 'AI 生成失败（返回内容无法解析），请重试或检查 DeepSeek 密钥' }, { status: 502 })
    }

    const task = {
      id: 'VT' + Date.now().toString(36).toUpperCase(),
      subject, sellingPoints: selling, style, duration, lang,
      script,
      status: 'script_done', // script_done → video_pending → video_done
      videoUrl: null,
      createdAt: new Date().toISOString(),
      createdBy: session.user.name || session.user.email,
    }
    appendTask(task)
    await recordOperation({ module: 'ai', action: 'generate', target: `AI视频分镜：${subject}` })
    return NextResponse.json({ ok: true, task })
  } catch (e: any) {
    return NextResponse.json({ error: 'AI 调用失败：' + (e.message || '未知错误') }, { status: 502 })
  }
}
