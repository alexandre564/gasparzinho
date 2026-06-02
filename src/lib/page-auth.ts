import { redirect } from 'next/navigation';

import { auth } from '@/auth';

export async function requirePageAccess(roles?: string[], fallbackPath = '/dashboard') {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!roles?.length) {
    return session;
  }

  const userRole = session.user.role?.toUpperCase();
  const allowedRoles = roles.map((role) => role.toUpperCase());

  if (!userRole || !allowedRoles.includes(userRole)) {
    redirect(fallbackPath);
  }

  return session;
}
