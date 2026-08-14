/**
 * Cálculo puro da próxima ocorrência de uma tarefa recorrente — sem
 * fila/BullMQ (não existe neste projeto ainda, ver
 * docs/backend-implementation/23-task-engine.md §23.6): a próxima
 * instância é gerada de forma síncrona quando a instância atual é
 * concluída (`CompleteTaskUseCase`), não por um cron.
 */
export type FrequenciaRecorrencia =
  'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL' | 'DIAS_UTEIS' | 'DIAS_ESPECIFICOS';

export interface RecorrenciaRule {
  frequencia: FrequenciaRecorrencia;
  intervalo: number;
  diasSemana: number[];
  respeitarDiasUteis: boolean;
  dataFim: Date | null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isHoliday(date: Date, holidayDates: Set<string>): boolean {
  return holidayDates.has(date.toISOString().slice(0, 10));
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Avança `date` até o próximo dia útil (não sábado/domingo/feriado), incluindo ela mesma se já for útil. */
function nextBusinessDay(date: Date, holidayDates: Set<string>): Date {
  let cursor = date;
  while (isWeekend(cursor) || isHoliday(cursor, holidayDates)) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/**
 * Calcula a data da próxima ocorrência a partir da data de vencimento
 * atual. `holidayDates` é o conjunto de datas (YYYY-MM-DD) de `Feriado`
 * (Configuration Engine, Prompt 13) do escritório — reaproveitado, nunca
 * um catálogo de feriados próprio. Retorna `null` quando a regra já
 * passou de `dataFim`.
 */
export function computeNextOccurrence(
  dataAtual: Date,
  rule: RecorrenciaRule,
  holidayDates: Set<string> = new Set(),
): Date | null {
  let next: Date;

  switch (rule.frequencia) {
    case 'DIARIA':
      next = addDays(dataAtual, rule.intervalo);
      break;
    case 'SEMANAL':
      next = addDays(dataAtual, 7 * rule.intervalo);
      break;
    case 'MENSAL': {
      next = new Date(dataAtual);
      next.setUTCMonth(next.getUTCMonth() + rule.intervalo);
      break;
    }
    case 'ANUAL': {
      next = new Date(dataAtual);
      next.setUTCFullYear(next.getUTCFullYear() + rule.intervalo);
      break;
    }
    case 'DIAS_UTEIS': {
      next = addDays(dataAtual, 1);
      next = nextBusinessDay(next, holidayDates);
      break;
    }
    case 'DIAS_ESPECIFICOS': {
      if (rule.diasSemana.length === 0) return null;
      const diasOrdenados = [...rule.diasSemana].sort((a, b) => a - b);
      next = addDays(dataAtual, 1);
      // Avança até bater com um dos dias da semana configurados (máximo 7 tentativas).
      for (let i = 0; i < 7; i++) {
        if (diasOrdenados.includes(next.getUTCDay())) break;
        next = addDays(next, 1);
      }
      break;
    }
    default:
      return null;
  }

  if (rule.respeitarDiasUteis && rule.frequencia !== 'DIAS_UTEIS') {
    next = nextBusinessDay(next, holidayDates);
  }

  if (rule.dataFim && next > rule.dataFim) return null;
  return next;
}
