import type { Metadata } from 'next';
import { LegalCasesPage } from '@/features/legal-cases';

export const metadata: Metadata = { title: 'Processos judiciais' };

export default function ProcessosJudiciaisPage() {
  return <LegalCasesPage tipo="JUDICIAL" />;
}
