import type { Metadata } from 'next';
import { JudicialCapturePage } from '@/features/judicial-capture';

export const metadata: Metadata = { title: 'Configurações de captura' };

export default function ConfiguracoesCapturaPage() {
  return <JudicialCapturePage />;
}
