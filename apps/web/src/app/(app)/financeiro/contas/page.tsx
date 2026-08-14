import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Contas' };

export default function FinanceiroContasPage() {
  return (
    <ModulePlaceholderPage
      title="Contas"
      description="O plano de contas do escritório aparecerá aqui quando o módulo Financeiro for implementado."
      breadcrumbs={[{ label: 'Financeiro' }, { label: 'Contas' }]}
    />
  );
}
