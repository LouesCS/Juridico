import type { Metadata } from 'next';
import { DocumentDetailPage } from '@/features/documents';

export const metadata: Metadata = { title: 'Documento' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentDetailPage documentId={id} />;
}
