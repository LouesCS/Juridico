import type { Metadata } from 'next';
import { ExtrajudicialMovementsPage } from '@/features/extrajudicial-movements';

export const metadata: Metadata = { title: 'Movimentações extrajudiciais' };

export default function MovimentacoesExtrajudiciaisPage() {
  return <ExtrajudicialMovementsPage />;
}
