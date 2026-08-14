import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Demonstrativo de resultados' };

export default function FinanceiroDrePage() {
  return (
    <ModulePlaceholderPage
      title="Demonstrativo de resultados"
      description="O DRE do escritório aparecerá aqui quando o módulo Financeiro for implementado."
      breadcrumbs={[{ label: 'Financeiro' }, { label: 'Demonstrativo de resultados' }]}
    />
  );
}
