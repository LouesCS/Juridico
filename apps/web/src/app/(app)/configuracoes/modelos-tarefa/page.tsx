'use client';

import { ConfigurationRouteGuard, TaskTemplatesPage } from '@/features/configuration';

export default function ModelosTarefaPage() {
  return (
    <ConfigurationRouteGuard
      title="Modelos de Tarefa"
      description="Modelos com prazo, prioridade e checklist padrão para tarefas recorrentes."
      requiredPermissions={['configuration:read']}
    >
      <TaskTemplatesPage />
    </ConfigurationRouteGuard>
  );
}
