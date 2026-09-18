import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation, pickTarget } from '@/lib/operation-log'
import { adminCreateSiteId } from '@/lib/tenant/admin-scope'

// 获取所有资源
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const items = await prisma.resourceItem.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    })
    return NextResponse.json(serializeBigInt(items))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 创建资源
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
  await recordOperation({ module: 'resources', action: 'create', target: pickTarget(body) })
    const {
      title,
      titleEn,
      titleJa,
      titleKo,
      titleFr,
      titleAr,
      slug,
      categoryId,
      description,
      descriptionEn,
      descriptionJa,
      descriptionKo,
      descriptionFr,
      descriptionAr,
      format,
      size,
      fileUrl,
      sortOrder,
      status,
      seoTitle,
      seoTitleEn,
      seoTitleJa,
      seoTitleKo,
      seoTitleFr,
      seoTitleAr,
      seoDescription,
      seoDescriptionEn,
      seoDescriptionJa,
      seoDescriptionKo,
      seoDescriptionFr,
      seoDescriptionAr,
      seoKeywords,
      seoKeywordsEn,
      seoKeywordsJa,
      seoKeywordsKo,
      seoKeywordsFr,
      seoKeywordsAr,
      geoRegion,
      geoCity,
    } = body

    if (!title || !categoryId) {
      return NextResponse.json({ error: '标题和分类不能为空' }, { status: 400 })
    }

    const item = await prisma.resourceItem.create({
      data: {
        siteId: adminCreateSiteId(),
title,
        titleEn: titleEn || '',
        titleJa: titleJa || '',
        titleKo: titleKo || '',
        titleFr: titleFr || '',
        titleAr: titleAr || '',
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        categoryId: BigInt(categoryId),
        description: description || '',
        descriptionEn: descriptionEn || '',
        descriptionJa: descriptionJa || '',
        descriptionKo: descriptionKo || '',
        descriptionFr: descriptionFr || '',
        descriptionAr: descriptionAr || '',
        format: format || 'pdf',
        size: size || '',
        fileUrl: fileUrl || '',
        sortOrder: sortOrder || 0,
        status: status || 'published',
        seoTitle: seoTitle || '',
        seoTitleEn: seoTitleEn || '',
        seoTitleJa: seoTitleJa || '',
        seoTitleKo: seoTitleKo || '',
        seoTitleFr: seoTitleFr || '',
        seoTitleAr: seoTitleAr || '',
        seoDescription: seoDescription || '',
        seoDescriptionEn: seoDescriptionEn || '',
        seoDescriptionJa: seoDescriptionJa || '',
        seoDescriptionKo: seoDescriptionKo || '',
        seoDescriptionFr: seoDescriptionFr || '',
        seoDescriptionAr: seoDescriptionAr || '',
        seoKeywords: seoKeywords || '',
        seoKeywordsEn: seoKeywordsEn || '',
        seoKeywordsJa: seoKeywordsJa || '',
        seoKeywordsKo: seoKeywordsKo || '',
        seoKeywordsFr: seoKeywordsFr || '',
        seoKeywordsAr: seoKeywordsAr || '',
        geoRegion: geoRegion || '',
        geoCity: geoCity || '',
      },
    })

    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
