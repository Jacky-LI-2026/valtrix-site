import { PrismaClient } from '../lib/generated/prisma'
import { news } from '../lib/news'

const prisma = new PrismaClient()

async function main() {
  console.log(`开始导入 ${news.length} 条新闻...`)

  // 收集所有分类
  const categories = new Map<string, { name: string; nameEn: string; slug: string }>()
  for (const item of news) {
    const slug = item.category.toLowerCase().replace(/\s+/g, '-')
    if (!categories.has(item.category)) {
      categories.set(item.category, {
        name: item.category,
        nameEn: item.categoryEn,
        slug,
      })
    }
  }

  // 导入分类
  const categoryMap = new Map<string, bigint>()
  for (const [name, cat] of Array.from(categories.entries())) {
    const existing = await prisma.newsCategory.findUnique({ where: { slug: cat.slug } })
    if (existing) {
      categoryMap.set(name, existing.id)
      console.log(`  分类已存在: ${name}`)
    } else {
      const created = await prisma.newsCategory.create({
        data: {
          name: cat.name,
          nameEn: cat.nameEn,
          slug: cat.slug,
          sortOrder: Array.from(categories.keys()).indexOf(name),
        },
      })
      categoryMap.set(name, created.id)
      console.log(`  分类已创建: ${name}`)
    }
  }

  // 导入新闻
  let created = 0
  let updated = 0
  for (const item of news) {
    const categoryId = categoryMap.get(item.category)
    const existing = await prisma.news.findUnique({ where: { slug: item.slug } })

    const data = {
      title: item.title,
      titleEn: item.titleEn,
      slug: item.slug,
      summary: item.excerpt,
      content: item.content.join('\n\n'),
      categoryId,
      isFeatured: item.featured,
      status: 'published' as const,
      publishedAt: new Date(item.date),
      author: '左文科技',
    }

    if (existing) {
      await prisma.news.update({ where: { slug: item.slug }, data })
      updated++
    } else {
      await prisma.news.create({ data })
      created++
    }
    console.log(`  新闻: ${item.title.substring(0, 30)}...`)
  }

  console.log(`\n导入完成: 新增 ${created} 条, 更新 ${updated} 条`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
