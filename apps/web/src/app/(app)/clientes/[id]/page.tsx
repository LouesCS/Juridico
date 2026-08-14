import type { Metadata } from 'next';
import { ClientDetailPage } from '@/features/clients';

export const metadata: Metadata = { title: 'Cliente' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientDetailPage clientId={id} />;
}
