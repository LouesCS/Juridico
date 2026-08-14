import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';
import { env } from '@/config/env';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Entrar no Quilombo Dev</h1>
      </div>
      {env.NEXT_PUBLIC_API_MOCKING === 'enabled' && (
        <div className="rounded-md border border-dashed border-border bg-muted/50 p-3 text-center text-sm">
          <p className="font-medium">Modo demonstração</p>
          <p className="text-muted-foreground">
            E-mail: <span className="font-mono">demo@quilombodev.com</span> · Senha:{' '}
            <span className="font-mono">Demo@123</span>
          </p>
        </div>
      )}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
