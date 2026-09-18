import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '20')
  const featured = searchParams.get('featured')
  const slug = searchParams.get('slug')
  const preview = searchParams.get('preview') === '1' || searchParams.get('preview') === 'true'

  try {
    // 站点作用域（全局共享 + 本站内容）
    const ctx = await getTenantContext(request.headers)
    const siteWhere = buildSiteWhere(ctx.siteId)
    // 定时发布懒执行：到期的 scheduled 草稿自动转为已发布（全行业通用，无需外部 cron）
    try {
      const now = new Date()
      await prisma.news.updateMany({
        where: { status: 'scheduled', scheduledAt: { lte: now } },
        data: { status: 'published', publishedAt: now },
      })
    } catch (e) {
      // 忽略，不影响读取
    }
    // 按slug查询单条新闻
    if (slug) {
      const news = await prisma.news.findUnique({
        where: { slug },
        include: { category: true },
      })
      // 后台预览（?preview=1）允许查看草稿/定时/下架状态，供后台「预览」按钮使用
      if (!news) {
        return cachedJson({ error: '新闻不存在' }, 'dynamic', 404)
      }
      if (news.status !== 'published' && !preview) {
        return cachedJson({ error: '新闻不存在' }, 'dynamic', 404)
      }
      return cachedJson(serializeBigInt(news), 'dynamic')
    }

    const where: any = { AND: [{ status: 'published' }, siteWhere] }
    let matchedCategory: any = null
    if (category) {
      // 依次按 分类slug / 中文名 / 英文名 精确匹配，再按 连字符-空格 归一化匹配
      // （支持 /news/Company-News、/news/Company News、/news/公司新闻 等路径）
      const norm = (s: string | null) => (s || '').toLowerCase().replace(/[\s-]+/g, '')
      const cat =
        (await prisma.newsCategory.findUnique({ where: { slug: category } })) ||
        (await prisma.newsCategory.findFirst({ where: { name: category } })) ||
        (await prisma.newsCategory.findFirst({ where: { nameEn: category } }))
      if (!cat) {
        const allCats = await prisma.newsCategory.findMany()
        matchedCategory = allCats.find(
          (c) => norm(c.slug) === norm(category) || norm(c.name) === norm(category) || norm(c.nameEn) === norm(category)
        ) || null
        if (matchedCategory) where.categoryId = matchedCategory.id
      } else {
        where.categoryId = cat.id
        matchedCategory = cat
      }
      if (!matchedCategory) {
        return cachedJson({ error: '分类不存在' }, 'dynamic', 404)
      }
    }
    if (featured === 'true') where.isFeatured = true

    const news = await prisma.news.findMany({
      where,
      orderBy: [{ isTop: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
      include: { category: true },
    })

    // 按分类查询时返回 分类信息 + 新闻列表（供分类浏览页渲染标题）
    if (matchedCategory) {
      return cachedJson(serializeBigInt({ category: matchedCategory, items: news }), 'dynamic')
    }

    return cachedJson(serializeBigInt(news), 'dynamic')
  } catch (error) {
    console.error('获取新闻失败:', error)
    return cachedJson({ error: '获取失败' }, 'dynamic', 500)
  }
}
