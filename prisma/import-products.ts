import { PrismaClient } from '../lib/generated/prisma'
import { productTabs } from '../lib/products'

const prisma = new PrismaClient()

async function main() {
  console.log('📦 开始导入产品数据...')

  for (const tab of productTabs) {
    // 1. Upsert Tab
    const dbTab = await prisma.productTab.upsert({
      where: { slug: tab.id },
      update: { name: tab.name, nameEn: tab.nameEn },
      create: { slug: tab.id, name: tab.name, nameEn: tab.nameEn },
    })
    console.log(`  Tab: ${tab.name} (${tab.id})`)

    for (const cat of tab.categories) {
      // 2. Upsert Category
      const dbCat = await prisma.productCategory.upsert({
        where: { tabId_slug: { tabId: dbTab.id, slug: cat.id } },
        update: { name: cat.name, nameEn: cat.nameEn },
        create: {
          tabId: dbTab.id,
          slug: cat.id,
          name: cat.name,
          nameEn: cat.nameEn,
        },
      })

      for (const model of cat.models) {
        // 3. Upsert Product
        const product = await prisma.product.upsert({
          where: { slug: model.id },
          update: {
            tabId: dbTab.id,
            categoryId: dbCat.id,
            model: model.model,
            name: model.name,
            nameEn: model.nameEn,
            subtitle: model.description,
            summary: model.description,
            description: model.detailContent || model.description,
            features: model.features || [],
            images: model.images || [model.image],
            coverImage: model.image,
            frames360: model.frames360
              ? {
                  template: model.frames360.path,
                  totalFrames: model.frames360.count,
                  startIndex: model.frames360.startIndex || 1,
                }
              : undefined,
            manualUrl: model.manualUrl || undefined,
            specs: model.specs ? JSON.parse(JSON.stringify(model.specs)) : [],
            status: 'published',
          },
          create: {
            tabId: dbTab.id,
            categoryId: dbCat.id,
            slug: model.id,
            model: model.model,
            name: model.name,
            nameEn: model.nameEn,
            subtitle: model.description,
            summary: model.description,
            description: model.detailContent || model.description,
            features: model.features || [],
            images: model.images || [model.image],
            coverImage: model.image,
            frames360: model.frames360
              ? {
                  template: model.frames360.path,
                  totalFrames: model.frames360.count,
                  startIndex: model.frames360.startIndex || 1,
                }
              : undefined,
            manualUrl: model.manualUrl || undefined,
            specs: model.specs ? JSON.parse(JSON.stringify(model.specs)) : [],
            status: 'published',
          },
        })

        // 4. 重建 ProductSpecs（先删后建，保证同步）
        await prisma.productSpec.deleteMany({ where: { productId: product.id } })
        if (model.specs && model.specs.length > 0) {
          await prisma.productSpec.createMany({
            data: model.specs.map((spec, idx) => ({
              productId: product.id,
              groupName: undefined,
              label: spec.label,
              value: spec.value,
              unit: undefined,
              sortOrder: idx,
            })),
          })
        }

        console.log(`    产品: ${model.model} (${model.id}) - ${model.specs?.length || 0} 规格`)
      }
    }
  }

  // 统计
  const count = await prisma.product.count()
  const specCount = await prisma.productSpec.count()
  console.log(`\n✅ 导入完成！产品总数: ${count}，规格总数: ${specCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
