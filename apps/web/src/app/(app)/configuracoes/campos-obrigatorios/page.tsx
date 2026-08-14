'use client';

import { ConfigurationRouteGuard, RequiredFieldsPage } from '@/features/configuration';

export default function CamposObrigatoriosPage() {
  return (
    <ConfigurationRouteGuard
      title="Campos Obrigatórios"
      description="Defina quais campos de cada entidade são obrigatórios."
      requiredPermissions={['configuration:read']}
    >
      <RequiredFieldsPage />
    </ConfigurationRouteGuard>
  );
}
