import { describe, expect, it } from 'vitest';
import { REQUEST_STATUS_OPTIONS, requestStatusLabel } from './request-status';

describe('labels de situação de Pedidos', () => {
  it.each([
    ['EM_ANDAMENTO', 'Em andamento'],
    ['FINALIZADO', 'Finalizado'],
    ['CANCELADO', 'Cancelado'],
  ])('%s é apresentado como %s sem alterar o value', (value, label) => {
    expect(requestStatusLabel(value)).toBe(label);
    expect(REQUEST_STATUS_OPTIONS.find((option) => option.label === label)?.value).toBe(value);
  });
});
