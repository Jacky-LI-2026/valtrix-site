import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { translateServerText } from '@/lib/server/translate-core'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const { text, targetLang = 'en', capitalize = false } = await req.json()
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: '翻译内容不能为空' }, { status: 400 })
    }
    const r = await translateServerText(text, targetLang, capitalize)
    return NextResponse.json({
      success: true,
      translatedText: r.translatedText,
      note: r.note,
      provider: r.provider,
    })
  } catch (error: any) {
    console.error('翻译失败:', error)
    return NextResponse.json({ error: error.message || '翻译失败' }, { status: 500 })
  }
}
