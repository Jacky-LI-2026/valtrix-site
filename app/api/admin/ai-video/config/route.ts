import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const DEFAULT_CONFIG = {
  enabled: true,
  // 分镜文案生成：复用 DeepSeek 文本 AI（callAiText 统一密钥）
  scriptModel: 'deepseek-chat',
  scriptLang: 'zh', // zh/en 分镜文案语言
  // 视频生成服务（豆包/Seedance 等，需要用户自行开通密钥后接入）
  videoProvider: 'seedance', // seedance / volcengine / custom
  videoProviderNote: '接入说明：视频生成需在豆包(Seedance)或火山引擎开通对应能力并配置密钥；当前版本先生成专业分镜文案，视频渲染能力预留接入点。',
  videoKey: '',
  videoModel: 'seedance_2.0',
  defaultDuration: 8, // 秒
  defaultRatio: '16:9',
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const row = await prisma.siteConfig.findUnique({ where: { configKey: 'ai_video_config' } })
  const cfg = (row?.configValue && typeof row.configValue === 'object' ? row.configValue : {}) as any
  return NextResponse.json({ ok: true, data: { ...DEFAULT_CONFIG, ...cfg } })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const allowed = Object.keys(DEFAULT_CONFIG)
  const clean: Record<string, any> = {}
  for (const k of allowed) {
    if (body[k] !== undefined) clean[k] = body[k]
  }
  await prisma.siteConfig.upsert({
    where: { configKey: 'ai_video_config' },
    update: { configValue: clean as any },
    create: { configKey: 'ai_video_config', configValue: clean as any },
  })
  return NextResponse.json({ ok: true })
}
