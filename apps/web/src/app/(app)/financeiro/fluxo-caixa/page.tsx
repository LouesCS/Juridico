import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Fluxo de caixa' };

export default function FinanceiroFluxoCaixaPage() {
  return (
    <ModulePlaceholderPage
      title="Fluxo de caixa"
      description="O fluxo de caixa consolidado do escritório aparecerá aqui quando o módulo Financeiro for implementado."
      breadcrumbs={[{ label: 'Financeiro' }, { label: 'Fluxo de caixa' }]}
    />
  );
}
