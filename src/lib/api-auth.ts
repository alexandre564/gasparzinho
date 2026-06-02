import { NextResponse } from 'next/server';

import { auth } from '@/auth';

export async function requireApiAccess(roles?: string[]) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
  }

  if (!roles?.length) {
    return null;
  }

  const userRole = session.user.role?.toUpperCase();
  const allowedRoles = roles.map((role) => role.toUpperCase());

  if (!userRole || !allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Acesso nao permitido.' }, { status: 403 });
  }

  return null;
}

export async function requireActionAccess(roles?: string[]) {
  const session = await auth();

  if (!session?.user) {
    return { success: false as const, message: 'Faca login novamente para continuar.' };
  }

  if (!roles?.length) {
    return null;
  }

  const userRole = session.user.role?.toUpperCase();
  const allowedRoles = roles.map((role) => role.toUpperCase());

  if (!userRole || !allowedRoles.includes(userRole)) {
    return { success: false as const, message: 'Seu perfil nao tem permissao para esta acao.' };
  }

  return null;
}
