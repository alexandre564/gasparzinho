import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

const routePermissions = [
  { prefix: '/dashboard/cobranca', roles: ['ADMIN'] },
  { prefix: '/dashboard/financeiro', roles: ['ADMIN'] },
  { prefix: '/dashboard/relatorios', roles: ['ADMIN'] },
  { prefix: '/dashboard/equipe', roles: ['ADMIN'] },
  { prefix: '/dashboard/frota', roles: ['ADMIN'] },
  { prefix: '/dashboard/fechamento', roles: ['ADMIN'] },
  { prefix: '/dashboard/clientes', roles: ['ADMIN', 'VENDEDOR'] },
  { prefix: '/dashboard/vendas', roles: ['ADMIN', 'VENDEDOR'] },
  { prefix: '/dashboard/estoque', roles: ['ADMIN', 'VENDEDOR'] },
  { prefix: '/dashboard/recompra', roles: ['ADMIN', 'VENDEDOR'] },
  { prefix: '/dashboard/entregas', roles: ['ADMIN', 'ENTREGADOR'] },
  { prefix: '/dashboard/configuracoes', roles: ['ADMIN'] },
  { prefix: '/dashboard', roles: ['ADMIN', 'VENDEDOR', 'ENTREGADOR'] },
];

function canAccessPath(pathname: string, role?: string | null) {
  const normalizedRole = role?.toUpperCase();
  const permission = routePermissions.find((route) => pathname.startsWith(route.prefix));

  if (!permission) {
    return true;
  }

  return normalizedRole ? permission.roles.includes(normalizedRole) : false;
}

const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith('/dashboard');

      if (isDashboard) {
        if (!isLoggedIn) {
          return false;
        }

        if (!canAccessPath(nextUrl.pathname, auth?.user?.role)) {
          return NextResponse.redirect(new URL('/dashboard', nextUrl));
        }

        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;
