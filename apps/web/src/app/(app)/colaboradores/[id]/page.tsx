import type { Metadata } from 'next';
import { CollaboratorDetailPage } from '@/features/team';

export const metadata: Metadata = { title: 'Colaborador' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollaboratorDetailPage collaboratorId={id} />;
}
