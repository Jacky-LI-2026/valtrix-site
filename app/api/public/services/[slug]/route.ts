import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { cachedJson } from "@/lib/api-cache";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const service = await prisma.service.findFirst({
      where: {
        slug: params.slug,
        status: 'published',
      },
    })

    if (!service) {
      return cachedJson({ error: '服务不存在' }, 'content', 404)
    }

    return cachedJson(serializeBigInt(service), 'content')
  } catch (error: any) {
    return cachedJson({ error: error.message }, 'content', 500)
  }
}
