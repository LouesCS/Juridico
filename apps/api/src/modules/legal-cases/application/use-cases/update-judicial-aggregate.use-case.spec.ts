import { UpdateJudicialAggregateUseCase } from './update-judicial-aggregate.use-case';
import type { UpdateJudicialAggregateDto } from '../../presentation/schemas/legal-case.schemas';

describe('UpdateJudicialAggregateUseCase', () => {
  const tx = {
    processo: { findFirst: jest.fn(), updateMany: jest.fn() },
    parteProcesso: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    cliente: { findMany: jest.fn() },
  };
  const prisma = {
    client: { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) },
  };
  const useCase = new UpdateJudicialAggregateUseCase(prisma as never);
  // CNJ válido (dígito verificador correto) — mesmo número usado nos
  // fixtures de `domain/cnj.spec.ts`.
  const numeroCnj = '1234567-19.2024.8.26.0001';
  const dto: UpdateJudicialAggregateDto = {
    processo: {
      numeroCnj,
      tribunal: 'TJSP',
      comarca: 'São Paulo',
      vara: '1ª Vara Cível',
      tipoAcao: 'Cobrança',
      area: 'Cível',
      poloCliente: 'ATIVO',
      instancia: 'PRIMEIRA',
      dataDistribuicao: '2026-01-01',
      dataEncerramento: null,
      status: 'ATIVO',
      observacoes: null,
      numeroBeneficio: null,
      roNumeroBeneficio: null,
    },
    partes: [
      { id: '11111111-1111-4111-8111-111111111111', tipo: 'AUTOR', principal: true },
      { id: '22222222-2222-4222-8222-222222222222', tipo: 'REU', principal: true },
    ],
  };
  beforeEach(() => {
    jest.clearAllMocks();
    // `tx.processo.findFirst` é usado para duas consultas distintas dentro
    // do use case (carregar processo+versão, depois checar CNJ duplicado)
    // — distingue pelo shape do `where` em vez de um valor fixo, senão a
    // segunda chamada herdaria a resposta da primeira.
    tx.processo.findFirst.mockImplementation((args: { where: Record<string, unknown> }) =>
      Promise.resolve('numeroCnj' in args.where ? null : { id: 'p1', versao: 2 }),
    );
    tx.parteProcesso.findMany.mockResolvedValue([
      { id: '11111111-1111-4111-8111-111111111111' },
      { id: '22222222-2222-4222-8222-222222222222' },
    ]);
    tx.cliente.findMany.mockResolvedValue([]);
    tx.processo.updateMany.mockResolvedValue({ count: 1 });
  });
  it('sincroniza Processo e Partes na mesma transação e troca principais sem colisão', async () => {
    const result = await useCase.execute('office-1', 'p1', 2, dto);
    expect(result.ok).toBe(true);
    expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.parteProcesso.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { principal: false } }),
    );
    expect(tx.processo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ versao: 2 }),
        data: expect.objectContaining({ roNumeroBeneficio: null, tipoAcao: 'Cobrança' }),
      }),
    );
  });
  it('rejeita CNJ com dígito verificador inválido antes de iniciar transação', async () => {
    const invalid: UpdateJudicialAggregateDto = structuredClone(dto);
    invalid.processo.numeroCnj = '0000000-00.0000.0.00.0000';
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_CHECK_DIGIT');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });
  it('rejeita versão obsoleta', async () => {
    tx.processo.findFirst.mockResolvedValue({ id: 'p1', versao: 3 });
    const result = await useCase.execute('office-1', 'p1', 2, dto);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('STALE_VERSION');
  });
  it('rejeita participante de outro tenant ou excluído', async () => {
    tx.parteProcesso.findMany.mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111' }]);
    const result = await useCase.execute('office-1', 'p1', 2, dto);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_PARTY');
  });
  it('rejeita ausência de Autor principal antes de iniciar transação', async () => {
    const invalid: UpdateJudicialAggregateDto = structuredClone(dto);
    invalid.partes[0].principal = false;
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MAIN_CLAIMANT_REQUIRED');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });
  it('rejeita ausência de Réu principal', async () => {
    const invalid: UpdateJudicialAggregateDto = structuredClone(dto);
    invalid.partes[1].principal = false;
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MAIN_RESPONDENT_REQUIRED');
  });
  it('rejeita dois Advogados principais dos autores', async () => {
    const invalid: UpdateJudicialAggregateDto = structuredClone(dto);
    invalid.partes.push(
      { id: '33333333-3333-4333-8333-333333333333', tipo: 'ADVOGADO_AUTOR', principal: true },
      { id: '44444444-4444-4444-8444-444444444444', tipo: 'ADVOGADO_AUTOR', principal: true },
    );
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MAIN_CLAIMANT_LAWYER_CONFLICT');
  });
  it('rejeita dois Advogados principais dos réus', async () => {
    const invalid: UpdateJudicialAggregateDto = structuredClone(dto);
    invalid.partes.push(
      { id: '33333333-3333-4333-8333-333333333333', tipo: 'ADVOGADO_REU', principal: true },
      { id: '44444444-4444-4444-8444-444444444444', tipo: 'ADVOGADO_REU', principal: true },
    );
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MAIN_RESPONDENT_LAWYER_CONFLICT');
  });
  it('aceita Processo sem nenhum Advogado principal definido (campo opcional)', async () => {
    const withLawyer: UpdateJudicialAggregateDto = structuredClone(dto);
    withLawyer.partes.push({
      id: '33333333-3333-4333-8333-333333333333',
      tipo: 'ADVOGADO_AUTOR',
      principal: false,
    });
    tx.parteProcesso.findMany.mockResolvedValue([
      { id: '11111111-1111-4111-8111-111111111111' },
      { id: '22222222-2222-4222-8222-222222222222' },
      { id: '33333333-3333-4333-8333-333333333333' },
    ]);
    const result = await useCase.execute('office-1', 'p1', 2, withLawyer);
    expect(result.ok).toBe(true);
  });
  it('rejeita principal em papel diferente de Autor/Réu/Advogados', async () => {
    const invalid: UpdateJudicialAggregateDto = structuredClone(dto);
    invalid.partes.push({
      id: '55555555-5555-4555-8555-555555555555',
      tipo: 'TESTEMUNHA',
      principal: true,
    });
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_MAIN_PARTY');
  });
  it('rejeita a mesma pessoa repetida com o mesmo papel', async () => {
    const invalid: UpdateJudicialAggregateDto = structuredClone(dto);
    invalid.partes.push({ clienteId: 'client-3', tipo: 'ADVOGADO_REU', principal: false });
    invalid.partes.push({ clienteId: 'client-3', tipo: 'ADVOGADO_REU', principal: false });
    tx.cliente.findMany.mockResolvedValue([
      { id: 'client-3', nome: 'Advogado', tipo: 'PESSOA_FISICA', cpf: '123', cnpj: null },
    ]);
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_PARTY');
  });
  it('rejeita data de conclusão anterior à data de entrada', async () => {
    const invalid: UpdateJudicialAggregateDto = structuredClone(dto);
    invalid.processo.dataEncerramento = '2025-01-01';
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_DATE_RANGE');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });
  it('propaga falha intermediária para que o Prisma faça rollback integral', async () => {
    (prisma.client.$transaction as jest.Mock).mockRejectedValueOnce(
      new Error('falha durante sincronização'),
    );
    await expect(useCase.execute('office-1', 'p1', 2, dto)).rejects.toThrow(
      'falha durante sincronização',
    );
  });
});
