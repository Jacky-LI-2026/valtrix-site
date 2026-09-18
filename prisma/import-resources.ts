import { PrismaClient } from '../lib/generated/prisma'
import { resourceCategories } from '../lib/resources'

const prisma = new PrismaClient()

async function main() {
  console.log(`开始导入 ${resourceCategories.length} 个资源分类...`)

  let totalItems = 0
  for (const cat of resourceCategories) {
    // 导入或更新分类
    const existingCat = await prisma.resourceCategory.findUnique({ where: { type: cat.type } })
    let categoryId: bigint
    if (existingCat) {
      await prisma.resourceCategory.update({
        where: { id: existingCat.id },
        data: {
          title: cat.title,
          titleEn: cat.titleEn,
          description: cat.description,
          descriptionEn: cat.descriptionEn,
          icon: cat.icon,
        },
      })
      categoryId = existingCat.id
      console.log(`  分类已更新: ${cat.title}`)
    } else {
      const created = await prisma.resourceCategory.create({
        data: {
          type: cat.type,
          title: cat.title,
          titleEn: cat.titleEn,
          description: cat.description,
          descriptionEn: cat.descriptionEn,
          icon: cat.icon,
          sortOrder: resourceCategories.indexOf(cat),
        },
      })
      categoryId = created.id
      console.log(`  分类已创建: ${cat.title}`)
    }

    // 导入资源条目
    for (const item of cat.items) {
      const existingItem = await prisma.resourceItem.findUnique({ where: { slug: item.slug } })
      // downloadUrl为"#"表示无链接，存为null或空字符串
      const fileUrl = item.downloadUrl === '#' ? '' : item.downloadUrl

      if (existingItem) {
        await prisma.resourceItem.update({
          where: { slug: item.slug },
          data: {
            title: item.title,
            titleEn: item.titleEn,
            description: item.description,
            descriptionEn: item.descriptionEn,
            format: item.format,
            size: item.size,
            fileUrl,
            categoryId,
          },
        })
      } else {
        await prisma.resourceItem.create({
          data: {
            categoryId,
            slug: item.slug,
            title: item.title,
            titleEn: item.titleEn,
            description: item.description,
            descriptionEn: item.descriptionEn,
            format: item.format,
            size: item.size,
            fileUrl,
            status: 'published',
            publishedAt: new Date(item.date),
          },
        })
      }
      totalItems++
    }
    console.log(`    ${cat.items.length} 个资源条目`)
  }

  console.log(`\n导入完成: ${resourceCategories.length} 个分类, ${totalItems} 个资源条目`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
