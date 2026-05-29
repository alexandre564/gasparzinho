import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';
import { canAccessPath } from '@/lib/permissions';

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
