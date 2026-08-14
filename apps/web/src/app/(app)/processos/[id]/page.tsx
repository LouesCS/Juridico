import type { Metadata } from 'next';
import { LegalCaseDetailPage } from '@/features/legal-cases';

export const metadata: Metadata = { title: 'Processo' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LegalCaseDetailPage caseId={id} />;
}
