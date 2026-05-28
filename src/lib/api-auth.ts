import { NextResponse } from 'next/server';

import { auth } from '@/auth';

export async function requireApiAccess(roles?: string[]) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  if (!roles?.length) {
    return null;
  }

  const userRole = session.user.role?.toUpperCase();
  const allowedRoles = roles.map((role) => role.toUpperCase());

  if (!userRole || !allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Acesso não permitido.' }, { status: 403 });
  }

  return null;
}
