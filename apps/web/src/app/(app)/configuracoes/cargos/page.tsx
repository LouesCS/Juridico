'use client';

import { CargosPage, ConfigurationRouteGuard } from '@/features/configuration';

export default function Page() {
  return (
    <ConfigurationRouteGuard
      title="Cargos"
      description="Cargos de colaboradores (ex.: Advogado, Estagiário, Analista Administrativo)."
      requiredPermissions={['configuration:read']}
    >
      <CargosPage />
    </ConfigurationRouteGuard>
  );
}
