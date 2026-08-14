import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail para receber um link de redefinição.
        </p>
      </div>
      <ForgotPasswordForm />
    </>
  );
}
