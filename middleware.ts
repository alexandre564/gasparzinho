import { auth } from './auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mapeamento de papéis e rotas restritas
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

export async function middleware(req: NextRequest) {
  const session = await auth();
  const { nextUrl } = req;

  const isLoggedIn = !!session;
  const userRole = session?.user?.role?.toUpperCase();

  // Redireciona para /login se não estiver logado e tentando acessar /dashboard
  if (!isLoggedIn && nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redireciona para /dashboard se estiver logado e tentando acessar /login
  if (isLoggedIn && nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Aplica restrições de rota baseadas no papel do usuário
  if (isLoggedIn && userRole && roleRestrictions[userRole]) {
    const isRestricted = roleRestrictions[userRole].some(path => nextUrl.pathname.startsWith(path));
    if (isRestricted) {
      // O usuário ENTREGADOR é um caso especial, redirecionado para sua única página permitida.
      if (userRole === 'ENTREGADOR') {
        return NextResponse.redirect(new URL('/dashboard/entregas', req.url));
      }
      // Outros papéis são redirecionados para a página principal do dashboard.
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // O matcher garante que o middleware seja executado apenas nas rotas especificadas.
  matcher: ['/dashboard/:path*', '/login'],
};
