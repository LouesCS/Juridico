import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Auditoria' };

export default function AuditoriaPage() {
  return (
    <ModulePlaceholderPage
      title="Auditoria"
      description="A trilha de auditoria já é registrada no backend (docs/backend-implementation) — a tela de consulta consolidada aparecerá aqui quando o módulo de consulta de Auditoria for implementado no frontend."
      breadcrumbs={[{ label: 'Outros' }, { label: 'Auditoria' }]}
    />
  );
}
