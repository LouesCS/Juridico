import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Relatórios básicos' };

export default function RelatoriosBasicosPage() {
  return (
    <ModulePlaceholderPage
      title="Relatórios básicos"
      description="Relatórios prontos (produtividade, carteira de clientes, prazos) aparecerão aqui quando o módulo Relatórios for implementado."
      breadcrumbs={[{ label: 'Relatórios' }, { label: 'Relatórios básicos' }]}
    />
  );
}
