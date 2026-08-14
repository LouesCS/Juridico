/**
 * Utilitários de data puros (sem dependência externa — não instalar
 * date-fns/dayjs só para isto, mesma decisão de não adicionar
 * `@radix-ui/react-switch` no Prompt 7). Cobrem só o necessário para os
 * filtros rápidos de Prazos e a navegação do Calendário.
 */

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function endOfWeek(date: Date): Date {
  return endOfDay(addDays(startOfWeek(date), 6));
}

export function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Dias restantes até `date` (negativo se já venceu), ignorando hora. */
export function daysUntil(date: Date, reference = new Date()): number {
  const diff = startOfDay(date).getTime() - startOfDay(reference).getTime();
  return Math.round(diff / 86_400_000);
}
