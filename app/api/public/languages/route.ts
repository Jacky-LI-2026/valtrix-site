import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { cachedJson } from "@/lib/api-cache";

// 语种列表必须实时返回（后台启用/禁用语种后前台立即生效），禁止静态化/缓存旧数据
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 检查是否有语种表数据
    const count = await prisma.language.count()
    
    // 如果没有语种，初始化默认语种（中/英）
    if (count === 0) {
      const defaultLanguages = [
        { code: 'zh', name: '中文', nameEn: 'Chinese', flag: '🇨🇳', isDefault: true, isActive: true, sortOrder: 1 },
        { code: 'en', name: '英文', nameEn: 'English', flag: '🇺🇸', isDefault: false, isActive: true, sortOrder: 2 },
      ]
      await prisma.language.createMany({ data: defaultLanguages })
    }
    
    // 只返回已启用的语种
    const languages = await prisma.language.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    })
    
    return cachedJson(serializeBigInt(languages), 'static-long')
  } catch (error: any) {
    // 如果表不存在或出错，返回默认语种
    const fallback = [
      { code: 'zh', name: '中文', nameEn: 'Chinese', flag: '🇨🇳', isDefault: true, isActive: true, sortOrder: 1 },
      { code: 'en', name: '英文', nameEn: 'English', flag: '🇺🇸', isDefault: false, isActive: true, sortOrder: 2 },
    ]
    return cachedJson(fallback, 'static-long')
  }
}
