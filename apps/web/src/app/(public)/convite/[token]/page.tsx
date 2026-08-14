import type { Metadata } from 'next';
import { AcceptInvitationForm } from '@/features/team';

export const metadata: Metadata = { title: 'Aceitar convite' };

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Você foi convidado</h1>
      </div>
      <AcceptInvitationForm token={token} />
    </>
  );
}
