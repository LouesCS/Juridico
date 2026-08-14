import type { Metadata } from 'next';
import { TaskKanbanPage } from '@/features/tasks';

export const metadata: Metadata = { title: 'Kanban de Tarefas' };

export default function Page() {
  return <TaskKanbanPage />;
}
