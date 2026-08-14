import type { Metadata } from 'next';
import { TaskCalendarPage } from '@/features/tasks';

export const metadata: Metadata = { title: 'Calendário de Tarefas' };

export default function Page() {
  return <TaskCalendarPage />;
}
