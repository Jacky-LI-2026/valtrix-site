import { NextRequest, NextResponse } from 'next/server'
import { createCaptcha } from '@/lib/captcha'

// 验证码必须每次请求都重新生成，禁止任何缓存（否则同一验证码过期后永远"已过期"）
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const res = NextResponse.json(createCaptcha())
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.headers.set('Pragma', 'no-cache')
  return res
}
