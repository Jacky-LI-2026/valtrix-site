import { PrismaClient } from '../lib/generated/prisma'
import { aboutSections } from '../lib/about'

const prisma = new PrismaClient()

async function main() {
  console.log(`开始导入 ${aboutSections.length} 个关于我们板块...`)

  let created = 0
  let updated = 0
  for (const section of aboutSections) {
    const existing = await prisma.aboutSection.findUnique({ where: { slug: section.slug } })
    const data = {
      title: section.title,
      titleEn: section.titleEn,
      subtitle: section.subtitle,
      subtitleEn: section.subtitleEn,
      content: section.content,
      highlights: section.highlights,
      timeline: section.timeline,
      certifications: section.certifications,
      sortOrder: aboutSections.indexOf(section),
    }

    if (existing) {
      await prisma.aboutSection.update({ where: { slug: section.slug }, data })
      updated++
    } else {
      await prisma.aboutSection.create({ data: { ...data, slug: section.slug } })
      created++
    }
    console.log(`  板块: ${section.title}`)
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
