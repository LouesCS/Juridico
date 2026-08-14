export const REQUEST_STATUS_OPTIONS = [
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
] as const;

const labels: Record<string, string> = Object.fromEntries(
  REQUEST_STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

export function requestStatusLabel(value: string) {
  return labels[value] ?? value;
}
