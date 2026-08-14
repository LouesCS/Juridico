'use client';

import { ConfigurationRouteGuard, CollaboratorGroupsPage } from '@/features/configuration';

export default function GruposColaboradoresPage() {
  return (
    <ConfigurationRouteGuard
      title="Grupos de Colaboradores"
      description="Agrupe colaboradores para facilitar atribuições futuras."
      requiredPermissions={['configuration:read']}
    >
      <CollaboratorGroupsPage />
    </ConfigurationRouteGuard>
  );
}
