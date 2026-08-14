import type { Metadata } from 'next';
import { LegalCasesPage } from '@/features/legal-cases';

export const metadata: Metadata = { title: 'Processos' };

export default function Page() {
  return <LegalCasesPage />;
}
