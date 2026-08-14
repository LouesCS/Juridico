import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Relatórios de Tarefas' };

export default function Page() {
  return (
    <ModulePlaceholderPage
      title="Relatórios de Tarefas"
      description="Relatórios de produtividade, SLA de conclusão e carga de trabalho por equipe aparecerão aqui em uma próxima rodada."
      breadcrumbs={[{ label: 'Tarefas', href: '/tarefas/minhas' }, { label: 'Relatórios' }]}
    />
  );
}
