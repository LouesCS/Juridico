import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Redefinir senha' };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Redefinir senha</h1>
      </div>
      <ResetPasswordForm token={token} />
    </>
  );
}
