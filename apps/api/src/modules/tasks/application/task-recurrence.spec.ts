import { computeNextOccurrence } from './task-recurrence';

describe('computeNextOccurrence', () => {
  const base = new Date('2026-08-04T00:00:00.000Z'); // terça-feira

  it('DIARIA soma o intervalo em dias', () => {
    const next = computeNextOccurrence(base, {
      frequencia: 'DIARIA',
      intervalo: 3,
      diasSemana: [],
      respeitarDiasUteis: false,
      dataFim: null,
    });
    expect(next?.toISOString().slice(0, 10)).toBe('2026-08-07');
  });

  it('SEMANAL soma 7 dias por intervalo', () => {
    const next = computeNextOccurrence(base, {
      frequencia: 'SEMANAL',
      intervalo: 2,
      diasSemana: [],
      respeitarDiasUteis: false,
      dataFim: null,
    });
    expect(next?.toISOString().slice(0, 10)).toBe('2026-08-18');
  });

  it('MENSAL soma meses preservando o dia', () => {
    const next = computeNextOccurrence(base, {
      frequencia: 'MENSAL',
      intervalo: 1,
      diasSemana: [],
      respeitarDiasUteis: false,
      dataFim: null,
    });
    expect(next?.toISOString().slice(0, 10)).toBe('2026-09-04');
  });

  it('ANUAL soma anos', () => {
    const next = computeNextOccurrence(base, {
      frequencia: 'ANUAL',
      intervalo: 1,
      diasSemana: [],
      respeitarDiasUteis: false,
      dataFim: null,
    });
    expect(next?.toISOString().slice(0, 10)).toBe('2027-08-04');
  });

  it('DIAS_UTEIS pula fim de semana', () => {
    const sexta = new Date('2026-08-07T00:00:00.000Z'); // sexta-feira
    const next = computeNextOccurrence(sexta, {
      frequencia: 'DIAS_UTEIS',
      intervalo: 1,
      diasSemana: [],
      respeitarDiasUteis: false,
      dataFim: null,
    });
    expect(next?.toISOString().slice(0, 10)).toBe('2026-08-10'); // segunda
  });

  it('DIAS_UTEIS pula feriado do escritório', () => {
    const quinta = new Date('2026-08-06T00:00:00.000Z');
    const next = computeNextOccurrence(
      quinta,
      {
        frequencia: 'DIAS_UTEIS',
        intervalo: 1,
        diasSemana: [],
        respeitarDiasUteis: false,
        dataFim: null,
      },
      new Set(['2026-08-07']),
    );
    expect(next?.toISOString().slice(0, 10)).toBe('2026-08-10'); // sexta é feriado, pula fim de semana também
  });

  it('DIAS_ESPECIFICOS avança até o próximo dia da semana configurado', () => {
    // base é terça (dia 2); configurado para quinta (dia 4) e segunda (dia 1)
    const next = computeNextOccurrence(base, {
      frequencia: 'DIAS_ESPECIFICOS',
      intervalo: 1,
      diasSemana: [1, 4],
      respeitarDiasUteis: false,
      dataFim: null,
    });
    expect(next?.toISOString().slice(0, 10)).toBe('2026-08-06'); // quinta
  });

  it('DIAS_ESPECIFICOS sem dias configurados retorna null', () => {
    const next = computeNextOccurrence(base, {
      frequencia: 'DIAS_ESPECIFICOS',
      intervalo: 1,
      diasSemana: [],
      respeitarDiasUteis: false,
      dataFim: null,
    });
    expect(next).toBeNull();
  });

  it('respeitarDiasUteis empurra uma ocorrência que caiu em fim de semana', () => {
    const quinta = new Date('2026-08-06T00:00:00.000Z');
    const next = computeNextOccurrence(quinta, {
      frequencia: 'DIARIA',
      intervalo: 2, // cairia no sábado
      diasSemana: [],
      respeitarDiasUteis: true,
      dataFim: null,
    });
    expect(next?.toISOString().slice(0, 10)).toBe('2026-08-10'); // segunda
  });

  it('retorna null quando a próxima ocorrência passaria de dataFim', () => {
    const next = computeNextOccurrence(base, {
      frequencia: 'DIARIA',
      intervalo: 5,
      diasSemana: [],
      respeitarDiasUteis: false,
      dataFim: new Date('2026-08-05T00:00:00.000Z'),
    });
    expect(next).toBeNull();
  });
});
