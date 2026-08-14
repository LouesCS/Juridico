import type { LegalCaseStatus } from '../api/legal-cases.api';

export const LEGAL_CASE_STATUS_OPTIONS: Array<{ value: LegalCaseStatus; label: string }> = [
  { value: 'ATIVO', label: 'Em andamento' },
  { value: 'SUSPENSO', label: 'Suspenso' },
  { value: 'ARQUIVADO', label: 'Arquivado' },
  { value: 'ENCERRADO', label: 'Encerrado' },
];

export function legalCaseStatusLabel(value: LegalCaseStatus) {
  return LEGAL_CASE_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
