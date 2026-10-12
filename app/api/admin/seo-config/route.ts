import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

/**
 * 可写字段白名单（owner 2026-10-12）
 * ==========================================================================
 * 🔴 为什么必须白名单：本接口原来是 `data: body` **盲写** —— 客户端给什么键就写什么列。
 *    实测事故（左文站 2026-09-29）：整行被写成**整体右移一格**的错位数据
 *    （companyName 里存了关键词、email 里存了电话、latitude 里存了邮箱、geoRegion 里存了经度、
 *     baiduSiteUrl 里存了地区码 CN-BJ）⇒ `getBaiduPushConfig().site` 变成 "CN-BJ"，
 *     **百度主动推送从配好那天起一直失败**且无人察觉。
 *    现在只放行下面这些已知列：多余/错位的键直接被丢掉，写不歪。
 */
const EDITABLE_FIELDS = [
  'siteName', 'siteNameEn',
  'defaultTitle', 'defaultDesc', 'keywords',
  'defaultTitleEn', 'defaultTitleJa', 'defaultTitleKo', 'defaultTitleFr', 'defaultTitleAr',
  'defaultDescEn', 'defaultDescJa', 'defaultDescKo', 'defaultDescFr', 'defaultDescAr',
  'keywordsEn', 'keywordsJa', 'keywordsKo', 'keywordsFr', 'keywordsAr',
  'companyName', 'companyAddress', 'phone', 'email',
  'latitude', 'longitude', 'geoRegion', 'socialLinks',
  'baiduSiteUrl', 'baiduPushToken', 'indexnowKey',
] as const

/** 只保留白名单内的键（其余一律丢弃） */
function pickEditable(body: any): Record<string, any> {
  const out: Record<string, any> = {}
  if (!body || typeof body !== 'object') return out
  for (const k of EDITABLE_FIELDS) {
    if (k in body) out[k] = body[k]
  }
  return out
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const config = await prisma.sEOConfig.findFirst({
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(serializeBigInt(config))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = pickEditable(await req.json())
    const existing = await prisma.sEOConfig.findFirst({
      orderBy: { id: 'asc' },
    })

    if (existing) {
      const config = await prisma.sEOConfig.update({
        where: { id: existing.id },
        data: body,
      })
      return NextResponse.json(serializeBigInt(config))
    } else {
      const config = await prisma.sEOConfig.create({
        data: body,
      })
      return NextResponse.json(serializeBigInt(config))
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
