import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Garantias' };

export default function GarantiasPage() {
  return (
    <ModulePlaceholderPage
      title="Garantias"
      description="Garantias contratuais (fianças, cauções, seguros) vinculadas a contratos e processos aparecerão aqui quando o módulo Garantias for implementado."
      breadcrumbs={[{ label: 'Jurídico' }, { label: 'Garantias' }]}
    />
  );
}
