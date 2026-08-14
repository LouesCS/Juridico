import type { Metadata } from 'next';
import { LegalCasesPage } from '@/features/legal-cases';

export const metadata: Metadata = { title: 'Processos extrajudiciais' };

export default function ProcessosExtrajudiciaisPage() {
  return <LegalCasesPage tipo="EXTRAJUDICIAL" />;
}
