export const TASK_KANBAN_STATUSES = ['A Fazer', 'Fazendo', 'Concluídos', 'Cancelados'] as const;

export type TaskKanbanStatus = (typeof TASK_KANBAN_STATUSES)[number];

function comparable(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function toTaskKanbanStatus(value: string): TaskKanbanStatus | null {
  const normalized = comparable(value);
  if (['a fazer', 'pendente', 'backlog'].includes(normalized)) return 'A Fazer';
  if (['fazendo', 'em andamento', 'executando', 'em revisao'].includes(normalized))
    return 'Fazendo';
  if (['concluidos', 'concluido', 'concluida', 'finalizado', 'finalizada'].includes(normalized))
    return 'Concluídos';
  if (['cancelados', 'cancelado', 'cancelada'].includes(normalized)) return 'Cancelados';
  return null;
}
