import type { Metadata } from 'next';
import { TaskListPage } from '@/features/tasks';

export const metadata: Metadata = { title: 'Minhas Tarefas' };

export default function Page() {
  return <TaskListPage scope="meus" title="Minhas Tarefas" />;
}
