import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Financeiro previsto' };

export default function FinanceiroPrevistoPage() {
  return (
    <ModulePlaceholderPage
      title="Financeiro previsto"
      description="Lançamentos financeiros previstos (a pagar/a receber) aparecerão aqui quando o módulo Financeiro for implementado."
      breadcrumbs={[{ label: 'Financeiro' }, { label: 'Financeiro previsto' }]}
    />
  );
}
