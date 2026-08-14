import type { Metadata } from 'next';
import { JudicialMovementsPage } from '@/features/judicial-movements';

export const metadata: Metadata = { title: 'Movimentações judiciais' };

export default function MovimentacoesJudiciaisPage() {
  return <JudicialMovementsPage />;
}
