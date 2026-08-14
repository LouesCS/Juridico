import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Criar conta' };

export default function RegisterPage() {
  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre seu primeiro escritório para começar.
        </p>
      </div>
      <RegisterForm />
    </>
  );
}
