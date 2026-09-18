import { PrismaClient } from '../lib/generated/prisma'
const p = new PrismaClient()
p.product.findFirst({ select: { id: true, model: true, slug: true } }).then(r => {
  console.log(JSON.stringify({ ...r, id: r?.id.toString() }))
  p.$disconnect()
})
