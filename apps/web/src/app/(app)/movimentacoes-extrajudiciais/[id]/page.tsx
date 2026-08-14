import type { Metadata } from 'next';
import { ExtrajudicialMovementDetailPage } from '@/features/extrajudicial-movements/components/extrajudicial-movement-detail-page';

export const metadata: Metadata = { title: 'Movimentação extrajudicial' };

export default async function ExtrajudicialMovementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExtrajudicialMovementDetailPage id={id} />;
}
