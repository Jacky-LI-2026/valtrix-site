import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import RolesManager from '@/components/admin/RolesManager'

export const dynamic = 'force-dynamic'

export default async function RolesPage() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    }),
  ])

  return (
    <RolesManager
      initialRoles={serializeBigInt(roles) as any}
      permissions={serializeBigInt(permissions) as any}
    />
  )
}
