'use client';

import { ConfigurationRouteGuard, TaskCategoriesPage } from '@/features/configuration';

export default function CategoriasTarefasPage() {
  return (
    <ConfigurationRouteGuard
      title="Categorias de Tarefas"
      description="Organize tarefas e modelos de tarefa por categoria e cor."
      requiredPermissions={['configuration:read']}
    >
      <TaskCategoriesPage />
    </ConfigurationRouteGuard>
  );
}
