import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Relatórios avançados' };

export default function RelatoriosAvancadosPage() {
  return (
    <ModulePlaceholderPage
      title="Relatórios avançados"
      description="Relatórios customizáveis com filtros e cruzamento de dados aparecerão aqui quando o módulo Relatórios for implementado."
      breadcrumbs={[{ label: 'Relatórios' }, { label: 'Relatórios avançados' }]}
    />
  );
}
