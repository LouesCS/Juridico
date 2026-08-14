'use client';

import { AiSettingsPage, ConfigurationRouteGuard } from '@/features/configuration';

export default function IaConfiguracoesPage() {
  return (
    <ConfigurationRouteGuard
      title="Inteligência Artificial"
      description="Parametrização de IA e consumo do escritório."
      requiredPermissions={['configuration:read']}
    >
      <AiSettingsPage />
    </ConfigurationRouteGuard>
  );
}
