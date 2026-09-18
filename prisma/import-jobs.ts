import { PrismaClient } from '../lib/generated/prisma'
import { jobs } from '../lib/careers'

const prisma = new PrismaClient()

async function main() {
  console.log(`开始导入 ${jobs.length} 个招聘职位...`)

  let created = 0
  let updated = 0
  for (const job of jobs) {
    const existing = await prisma.job.findUnique({ where: { slug: job.slug } })
    const data = {
      title: job.title,
      titleEn: job.titleEn,
      department: job.department,
      departmentEn: job.departmentEn,
      location: job.location,
      locationEn: job.locationEn,
      type: job.type,
      typeEn: job.typeEn,
      salary: job.salary,
      salaryEn: job.salaryEn,
      experience: job.experience,
      experienceEn: job.experienceEn,
      education: job.education,
      educationEn: job.educationEn,
      tags: job.tags,
      tagsEn: job.tagsEn,
      description: job.description,
      descriptionEn: job.descriptionEn,
      responsibilities: job.responsibilities,
      responsibilitiesEn: job.responsibilitiesEn,
      requirements: job.requirements,
      requirementsEn: job.requirementsEn,
      benefits: job.benefits,
      benefitsEn: job.benefitsEn,
      sortOrder: jobs.indexOf(job),
    }

    if (existing) {
      await prisma.job.update({ where: { slug: job.slug }, data })
      updated++
    } else {
      await prisma.job.create({ data: { ...data, slug: job.slug } })
      created++
    }
    console.log(`  职位: ${job.title}`)
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
