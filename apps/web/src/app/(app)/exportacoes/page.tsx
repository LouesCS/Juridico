import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Exportações de consultas' };

export default function ExportacoesPage() {
  return (
    <ModulePlaceholderPage
      title="Exportações de consultas"
      description="O histórico de exportações (CSV/PDF) das listagens do sistema aparecerá aqui quando o módulo Exportações for implementado."
      breadcrumbs={[{ label: 'Outros' }, { label: 'Exportações de consultas' }]}
    />
  );
}
