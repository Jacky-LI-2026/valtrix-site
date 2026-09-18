import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { auth } from '@/auth'
import UsersManager from '@/components/admin/UsersManager'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const [users, roles, session] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    }),
    prisma.role.findMany({
      orderBy: { id: 'asc' },
    }),
    auth(),
  ])

  const currentUserId = session?.user && (session.user as any)?.id ? String((session.user as any).id) : ''

  return (
    <UsersManager
      initialUsers={serializeBigInt(users) as any}
      roles={serializeBigInt(roles) as any}
      currentUserId={currentUserId}
    />
  )
}
