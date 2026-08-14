import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Modelos de documentos' };

export default function ModelosDocumentosPage() {
  return (
    <ModulePlaceholderPage
      title="Modelos de documentos"
      description="Modelos reutilizáveis para geração de documentos (petições, contratos) aparecerão aqui quando o módulo Modelos de Documentos for implementado."
      breadcrumbs={[{ label: 'Outros' }, { label: 'Modelos de documentos' }]}
    />
  );
}
