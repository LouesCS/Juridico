import type { Metadata } from 'next';
import { ModulePlaceholderPage } from '@/components/feedback/module-placeholder-page';

export const metadata: Metadata = { title: 'Financeiro realizado' };

export default function FinanceiroRealizadoPage() {
  return (
    <ModulePlaceholderPage
      title="Financeiro realizado"
      description="Lançamentos financeiros já realizados aparecerão aqui quando o módulo Financeiro for implementado."
      breadcrumbs={[{ label: 'Financeiro' }, { label: 'Financeiro realizado' }]}
    />
  );
}
