'use client';

import { ConfigurationRouteGuard, ExtraFieldsPage } from '@/features/configuration';

export default function CamposExtrasPage() {
  return (
    <ConfigurationRouteGuard
      title="Campos Extras"
      description="Campos personalizados para Clientes, Processos, Documentos e Tarefas."
      requiredPermissions={['configuration:read']}
    >
      <ExtraFieldsPage />
    </ConfigurationRouteGuard>
  );
}
