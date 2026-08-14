import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Serviços' };

export default function ServicosPage() {
  return (
    <ModulePlaceholderPage
      title="Serviços"
      description="Serviços prestados a clientes, com horas e faturamento vinculados, aparecerão aqui quando o módulo Serviços for implementado."
      breadcrumbs={[{ label: 'Gestão do tempo' }, { label: 'Serviços' }]}
    />
  );
}
