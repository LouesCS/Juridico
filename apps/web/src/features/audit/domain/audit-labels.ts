const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Inclusão',
  UPDATE: 'Alteração',
  DELETE: 'Exclusão',
  ARCHIVE: 'Arquivamento',
  RESTORE: 'Restauração',
  CREATE_LEGAL_CASE: 'Inclusão de processo',
  UPDATE_LEGAL_CASE: 'Alteração de processo',
  DELETE_LEGAL_CASE: 'Exclusão de processo',
  ARCHIVE_LEGAL_CASE: 'Arquivamento de processo',
  RESTORE_LEGAL_CASE: 'Restauração de processo',
  ADD_CASE_TEAM_MEMBER: 'Inclusão na equipe',
  CHANGE_CASE_RESPONSIBLE: 'Alteração de responsável',
  REMOVE_CASE_TEAM_MEMBER: 'Remoção da equipe',
  ADD_CASE_PARTY: 'Inclusão de parte',
  UPDATE_CASE_PARTY: 'Alteração de parte',
  REMOVE_CASE_PARTY: 'Remoção de parte',
  CREATE_TASK: 'Inclusão de tarefa',
  UPDATE_TASK: 'Alteração de tarefa',
  DELETE_TASK: 'Exclusão de tarefa',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditResourceLabel(resourceType: string): string {
  return resourceType === 'PROCESSO' ? 'Processo' : resourceType.replaceAll('_', ' ');
}
