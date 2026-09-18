import { PrismaClient } from '@/lib/generated/prisma'

// 全局单例：避免 Next.js 热重载/多模块各自实例化导致连接池浪费
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * 连接池优化说明（写入 docs/performance-optimization.md）：
 *
 * 1. 单例复用：所有模块统一 import { prisma } from '@/lib/prisma'，
 *    不要 new PrismaClient()（旧代码在部分 API 中直接 new，已统一改为单例）。
 *
 * 2. 连接数控制：在 DATABASE_URL 追加参数即可限制 Prisma 连接池大小
 *    postgresql://user:pass@host:5432/db?schema=public&connection_limit=10
 *    - 本地开发默认即可；生产按机器内存/DB max_connections 设置 5~15。
 *
 * 3. 生产高并发场景：建议引入 PgBouncer 作为中间连接池
 *    - 连接串指向 PgBouncer：postgresql://user:pass@pgbouncer:6432/db?pgbouncer=true
 *    - PgBouncer 配置 pool_mode=transaction，可支撑上千连接而不打爆 PostgreSQL。
 *
 * 4. 迁移脚本注意：prisma migrate/push 不走 PgBouncer（用直连 DATABASE_URL 或 DIRECT_URL）。
 */
