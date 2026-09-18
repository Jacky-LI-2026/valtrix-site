import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { callAiText, aiCapabilityEnabled } from '@/lib/ai/gateway'

// 大模型调用接口（统一走 lib/ai/gateway.ts，配置源 = site_config.ai_global_config，
// 密钥三级回退，与全站 AI 开关矩阵联动；此前误读 ai_config 表导致"已配置却报未配置"）
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, content, language } = body

    if (!action || !content) {
      return NextResponse.json({ error: '缺少action或content参数' }, { status: 400 })
    }

    const enabled = await aiCapabilityEnabled('ai-text')
    if (!enabled) {
      return NextResponse.json({
        error: 'AI 文本能力未启用：请在「插件管理 → AI 文本」开启，并在 AI 配置中填写 DeepSeek Key（系统设置 → AI 配置/翻译配置）',
      }, { status: 400 })
    }

    // 根据action构建prompt
    let prompt = ''
    switch (action) {
      case 'polish':
        prompt = `请润色以下文章，保持原意，使语言更加流畅专业：\n\n${content}`
        break
      case 'summary':
        prompt = `请为以下文章生成200字以内的摘要：\n\n${content}`
        break
      case 'translate':
        const targetLang = language || 'en'
        prompt = `请将以下文章翻译成${targetLang === 'en' ? '英文' : '中文'}：\n\n${content}`
        break
      case 'title':
        prompt = `请为以下文章生成3个吸引人的标题：\n\n${content}`
        break
      default:
        prompt = content
    }

    const result = await callAiText(prompt, { system: '你是一个专业的内容编辑助手。' })

    return NextResponse.json({
      success: true,
      action,
      result,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
