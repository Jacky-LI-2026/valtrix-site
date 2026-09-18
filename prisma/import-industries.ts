import { PrismaClient } from '../lib/generated/prisma'
import { industries } from '../lib/industries'

const prisma = new PrismaClient()

async function main() {
  console.log(`开始导入 ${industries.length} 个行业应用...`)

  let created = 0
  let updated = 0
  for (const item of industries) {
    const existing = await prisma.industry.findUnique({ where: { slug: item.slug } })
    const data = {
      name: item.name,
      nameEn: item.nameEn,
      tagline: item.tagline,
      taglineEn: item.taglineEn,
      description: item.description,
      descriptionEn: item.descriptionEn,
      challenges: item.challenges,
      challengesEn: item.challengesEn,
      solutions: item.solutions,
      products: item.products,
      productsEn: item.productsEn,
      cases: item.cases,
      sortOrder: industries.indexOf(item),
    }

    if (existing) {
      await prisma.industry.update({ where: { slug: item.slug }, data })
      updated++
    } else {
      await prisma.industry.create({ data: { ...data, slug: item.slug } })
      created++
    }
    console.log(`  行业: ${item.name}`)
  }

  console.log(`\n导入完成: 新增 ${created} 个, 更新 ${updated} 个`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
