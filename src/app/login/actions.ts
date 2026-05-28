'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { isRedirectError } from 'next/dist/client/components/redirect';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return 'Informe email e senha.';
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return 'Informe email e senha.';
  }

  try {
    await signIn('credentials', {
      email: normalizedEmail,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      console.error('Login AuthError:', error.type, error.cause);

      if (error.type === 'CredentialsSignin' || error.type === 'CallbackRouteError') {
        return 'Email ou senha invalidos.';
      }

      return 'Não foi possível entrar agora. Tente novamente.';
    }

    console.error('Login error:', error);
    return 'Não foi possível entrar agora. Tente novamente.';
  }
}
