import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Registros de trabalho' };

export default function RegistrosTrabalhoPage() {
  return (
    <ModulePlaceholderPage
      title="Registros de trabalho"
      description="Apontamentos de horas trabalhadas por serviço, processo e responsável aparecerão aqui quando o módulo Registros de Trabalho for implementado."
      breadcrumbs={[{ label: 'Gestão do tempo' }, { label: 'Registros de trabalho' }]}
    />
  );
}
