import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Anexos' };

export default function AnexosPage() {
  return (
    <ModulePlaceholderPage
      title="Anexos"
      description="Uma visão consolidada de todos os anexos avulsos (fora do módulo Documentos/Pastas) aparecerá aqui quando o módulo Anexos for implementado."
      breadcrumbs={[{ label: 'Outros' }, { label: 'Anexos' }]}
    />
  );
}
