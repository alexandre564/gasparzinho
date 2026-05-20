import NextAuth from 'next-auth';
import authConfig from './src/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

const roleRestrictions: Record<string, string[]> = {
  VENDEDOR: [
    '/dashboard/equipe',
    '/dashboard/financeiro',
    '/dashboard/relatorios',
    '/dashboard/entregas',
    '/dashboard/fechamento',
  ],
  ENTREGADOR: [
    '/dashboard',
    '/dashboard/clientes',
    '/dashboard/vendas',
    '/dashboard/estoque',
    '/dashboard/recompra',
    '/dashboard/equipe',
    '/dashboard/financeiro',
    '/dashboard/relatorios',
    '/dashboard/fechamento',
  ],
};

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role?.toUpperCase();

  if (!isLoggedIn && nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isLoggedIn && nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (isLoggedIn && userRole && roleRestrictions[userRole]) {
    const isRestricted = roleRestrictions[userRole].some((route) =>
      matchesRoute(nextUrl.pathname, route)
    );

    if (isRestricted) {
      const destination = userRole === 'ENTREGADOR' ? '/dashboard/entregas' : '/dashboard';
      return NextResponse.redirect(new URL(destination, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
