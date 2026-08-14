import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Contratos' };

export default function ContratosPage() {
  return (
    <ModulePlaceholderPage
      title="Contratos"
      description="Contratos vinculados a clientes, processos e garantias aparecerão aqui quando o módulo Contratos for implementado."
      breadcrumbs={[{ label: 'Jurídico' }, { label: 'Contratos' }]}
    />
  );
}
