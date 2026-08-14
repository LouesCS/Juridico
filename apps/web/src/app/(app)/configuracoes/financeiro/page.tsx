'use client';

import { ConfigurationRouteGuard, FinancialSettingsPage } from '@/features/configuration';

export default function FinanceiroConfiguracoesPage() {
  return (
    <ConfigurationRouteGuard
      title="Financeiro"
      description="Parametrização financeira do escritório (catálogo pronto para o futuro módulo Financeiro)."
      requiredPermissions={['financeiro:read']}
    >
      <FinancialSettingsPage />
    </ConfigurationRouteGuard>
  );
}
