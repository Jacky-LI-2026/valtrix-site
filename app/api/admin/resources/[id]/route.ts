import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation, pickTarget } from '@/lib/operation-log'

// 获取单个资源
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const item = await prisma.resourceItem.findUnique({
      where: { id: BigInt(params.id) },
      include: { category: true },
    })
    if (!item) {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 })
    }
    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 更新资源
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
  await recordOperation({ module: 'resources', action: 'update', target: pickTarget(body) })
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
      downloadCount,
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

    const item = await prisma.resourceItem.update({
      where: { id: BigInt(params.id) },
      data: {
        title: title || undefined,
        titleEn: titleEn !== undefined ? titleEn : undefined,
        titleJa: titleJa !== undefined ? titleJa : undefined,
        titleKo: titleKo !== undefined ? titleKo : undefined,
        titleFr: titleFr !== undefined ? titleFr : undefined,
        titleAr: titleAr !== undefined ? titleAr : undefined,
        slug: slug || undefined,
        categoryId: categoryId ? BigInt(categoryId) : undefined,
        description: description !== undefined ? description : undefined,
        descriptionEn: descriptionEn !== undefined ? descriptionEn : undefined,
        descriptionJa: descriptionJa !== undefined ? descriptionJa : undefined,
        descriptionKo: descriptionKo !== undefined ? descriptionKo : undefined,
        descriptionFr: descriptionFr !== undefined ? descriptionFr : undefined,
        descriptionAr: descriptionAr !== undefined ? descriptionAr : undefined,
        format: format || undefined,
        size: size !== undefined ? size : undefined,
        fileUrl: fileUrl !== undefined ? fileUrl : undefined,
        downloadCount: downloadCount !== undefined ? downloadCount : undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
        status: status || undefined,
        seoTitle: seoTitle !== undefined ? seoTitle : undefined,
        seoTitleEn: seoTitleEn !== undefined ? seoTitleEn : undefined,
        seoTitleJa: seoTitleJa !== undefined ? seoTitleJa : undefined,
        seoTitleKo: seoTitleKo !== undefined ? seoTitleKo : undefined,
        seoTitleFr: seoTitleFr !== undefined ? seoTitleFr : undefined,
        seoTitleAr: seoTitleAr !== undefined ? seoTitleAr : undefined,
        seoDescription: seoDescription !== undefined ? seoDescription : undefined,
        seoDescriptionEn: seoDescriptionEn !== undefined ? seoDescriptionEn : undefined,
        seoDescriptionJa: seoDescriptionJa !== undefined ? seoDescriptionJa : undefined,
        seoDescriptionKo: seoDescriptionKo !== undefined ? seoDescriptionKo : undefined,
        seoDescriptionFr: seoDescriptionFr !== undefined ? seoDescriptionFr : undefined,
        seoDescriptionAr: seoDescriptionAr !== undefined ? seoDescriptionAr : undefined,
        seoKeywords: seoKeywords !== undefined ? seoKeywords : undefined,
        seoKeywordsEn: seoKeywordsEn !== undefined ? seoKeywordsEn : undefined,
        seoKeywordsJa: seoKeywordsJa !== undefined ? seoKeywordsJa : undefined,
        seoKeywordsKo: seoKeywordsKo !== undefined ? seoKeywordsKo : undefined,
        seoKeywordsFr: seoKeywordsFr !== undefined ? seoKeywordsFr : undefined,
        seoKeywordsAr: seoKeywordsAr !== undefined ? seoKeywordsAr : undefined,
        geoRegion: geoRegion !== undefined ? geoRegion : undefined,
        geoCity: geoCity !== undefined ? geoCity : undefined,
      },
    })

    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 删除资源
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    await prisma.resourceItem.delete({
      where: { id: BigInt(params.id) },
    })
    await recordOperation({ module: 'resources', action: 'delete', target: String(params.id) })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
