'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/app/login/actions';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" aria-disabled={pending} disabled={pending}>
      {pending ? 'Entrando...' : 'Entrar'}
    </Button>
  );
}

export default function LoginPage() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="mx-auto w-full max-w-sm">
        <form action={dispatch}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Gás Gasparzinho</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="admin@gasparzinho.com"
                autoComplete="username"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </div>
            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center">
                <p className="text-sm font-medium text-red-700">{errorMessage}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <LoginButton />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
