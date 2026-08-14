import type { Metadata } from 'next';
import { TaskDetailPage } from '@/features/tasks';

export const metadata: Metadata = { title: 'Tarefa' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TaskDetailPage taskId={id} />;
}
