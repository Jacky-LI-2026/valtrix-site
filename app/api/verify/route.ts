import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 简单的内存验证码存储（生产环境建议使用Redis）
const verificationCodes = new Map<string, { code: string; expires: number }>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, type = 'download' } = body

    if (!email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 })
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = Date.now() + 10 * 60 * 1000 // 10分钟有效

    // 存储验证码
    verificationCodes.set(email, { code, expires })

    // 记录验证码到数据库（用于审计）
    try {
      await prisma.verificationCode.create({
        data: {
          email,
          code,
          type,
          expiresAt: new Date(expires),
        },
      })
    } catch (e) {
      console.warn('记录验证码失败:', e)
    }

    // 发送邮件（这里使用模拟实现，生产环境应配置SMTP）
    // 开发环境下直接返回验证码，方便测试
    const isDev = process.env.NODE_ENV !== 'production'

    // 模拟邮件发送
    console.log(`[验证码] 发送到 ${email}: ${code}（10分钟有效）`)

    return NextResponse.json({
      success: true,
      message: '验证码已发送到您的邮箱',
      ...(isDev && { devCode: code }), // 开发环境返回验证码
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 验证验证码
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json({ error: '邮箱和验证码不能为空' }, { status: 400 })
    }

    // 从内存中获取验证码
    const stored = verificationCodes.get(email)

    if (!stored) {
      return NextResponse.json({ error: '验证码不存在或已过期，请重新获取' }, { status: 400 })
    }

    if (Date.now() > stored.expires) {
      verificationCodes.delete(email)
      return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 })
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: '验证码不正确' }, { status: 400 })
    }

    // 验证成功，删除验证码
    verificationCodes.delete(email)

    // 记录下载者信息
    try {
      const { name, company, phone } = body
      await prisma.downloadRecord.create({
        data: {
          name: name || '',
          company: company || '',
          phone: phone || '',
          email,
          verifiedAt: new Date(),
        },
      })
    } catch (e) {
      console.warn('记录下载者信息失败:', e)
    }

    return NextResponse.json({
      success: true,
      message: '验证成功',
      // 返回一个临时token，用于后续下载验证
      token: Buffer.from(`${email}:${Date.now()}`).toString('base64'),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
