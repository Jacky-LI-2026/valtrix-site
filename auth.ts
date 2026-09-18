import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { username: String(credentials.username) },
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        })

        if (!user) return null
        if (user.status !== 'active') return null

        const isValid = await bcrypt.compare(String(credentials.password), user.passwordHash)
        if (!isValid) return null

        // 更新最后登录时间
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        const roles = user.userRoles.map((ur) => ur.role.name)
        const permissions = user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        )

        return {
          id: String(user.id),
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          roles,
          permissions,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  callbacks: {
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl
      // 登录页、初始化页和 API 路由公开
      if (pathname.startsWith('/admin/login')) return true
      if (pathname.startsWith('/admin/setup')) return true
      if (pathname.startsWith('/api/auth')) return true
      if (pathname.startsWith('/api/admin/setup')) return true
      // 其他 /admin 路径需要登录
      if (pathname.startsWith('/admin')) return !!auth
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.displayName = (user as any).displayName
        token.roles = (user as any).roles
        token.permissions = (user as any).permissions
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).username = token.username
        ;(session.user as any).displayName = token.displayName
        ;(session.user as any).roles = token.roles
        ;(session.user as any).permissions = token.permissions
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
})
