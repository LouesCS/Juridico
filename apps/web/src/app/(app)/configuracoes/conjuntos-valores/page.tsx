'use client';

import { ConfigurationRouteGuard, ValueSetsPage } from '@/features/configuration';

export default function ConjuntosValoresPage() {
  return (
    <ConfigurationRouteGuard
      title="Conjuntos de Valores"
      description="Listas de opções reutilizáveis em campos de seleção."
      requiredPermissions={['configuration:read']}
    >
      <ValueSetsPage />
    </ConfigurationRouteGuard>
  );
}
