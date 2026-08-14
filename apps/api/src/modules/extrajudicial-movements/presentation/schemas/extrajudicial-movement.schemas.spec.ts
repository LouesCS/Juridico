import { createExtrajudicialMovementSchema } from './extrajudicial-movement.schemas';
describe('extrajudicial movement schema', () => {
  const base = {
    dataMovimentacao: new Date().toISOString(),
    responsavelId: '11111111-1111-4111-8111-111111111111',
    tipo: 'Contato',
    origem: 'Manual',
    status: 'Pendente',
    descricao: 'Contato realizado',
  };
  it('impede movimentação solta', () =>
    expect(() => createExtrajudicialMovementSchema.parse(base)).toThrow(
      'Informe Cliente ou Processo.',
    ));
  it('aceita Cliente sem Processo', () =>
    expect(
      createExtrajudicialMovementSchema.parse({
        ...base,
        clienteId: '22222222-2222-4222-8222-222222222222',
      }).clienteId,
    ).toBeTruthy());
  it('aceita Processo sem Cliente para derivação no domínio', () =>
    expect(
      createExtrajudicialMovementSchema.parse({
        ...base,
        processoId: '33333333-3333-4333-8333-333333333333',
      }).processoId,
    ).toBeTruthy());
});
