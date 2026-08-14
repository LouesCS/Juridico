import type { Metadata } from 'next';
import { TaskListPage } from '@/features/tasks';

export const metadata: Metadata = { title: 'Tarefas da Equipe' };

export default function Page() {
  return <TaskListPage scope="equipe" title="Tarefas da Equipe" />;
}
