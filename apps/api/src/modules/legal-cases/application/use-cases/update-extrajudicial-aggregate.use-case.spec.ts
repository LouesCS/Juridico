import { UpdateExtrajudicialAggregateUseCase } from './update-extrajudicial-aggregate.use-case';
import type { UpdateExtrajudicialAggregateDto } from '../../presentation/schemas/legal-case.schemas';

describe('UpdateExtrajudicialAggregateUseCase', () => {
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
  const useCase = new UpdateExtrajudicialAggregateUseCase(prisma as never);
  const dto: UpdateExtrajudicialAggregateDto = {
    processo: {
      numeroInterno: 'EXT-1',
      instituicao: 'INSS',
      dataDistribuicao: '2026-01-01',
      dataEncerramento: null,
      status: 'ATIVO',
      observacoes: null,
      numeroBeneficio: null,
    },
    partes: [
      { id: '11111111-1111-4111-8111-111111111111', tipo: 'AUTOR', principal: true },
      { id: '22222222-2222-4222-8222-222222222222', tipo: 'REU', principal: true },
    ],
  };
  beforeEach(() => {
    jest.clearAllMocks();
    tx.processo.findFirst.mockResolvedValue({ id: 'p1', versao: 2 });
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
      expect.objectContaining({ where: expect.objectContaining({ versao: 2 }) }),
    );
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
  it('rejeita ausência de principal obrigatório antes de iniciar transação', async () => {
    const invalid: UpdateExtrajudicialAggregateDto = structuredClone(dto);
    invalid.partes[0].principal = false;
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
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
  it('rejeita ausência de Requerido principal antes de iniciar transação', async () => {
    const invalid: UpdateExtrajudicialAggregateDto = structuredClone(dto);
    invalid.partes[1].principal = false;
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MAIN_RESPONDENT_REQUIRED');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });
  it('rejeita dois Requerentes principais', async () => {
    const invalid: UpdateExtrajudicialAggregateDto = structuredClone(dto);
    invalid.partes.push({
      id: '33333333-3333-4333-8333-333333333333',
      tipo: 'AUTOR',
      principal: true,
    });
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MAIN_CLAIMANT_REQUIRED');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });
  it('rejeita dois Requeridos principais', async () => {
    const invalid: UpdateExtrajudicialAggregateDto = structuredClone(dto);
    invalid.partes.push({
      id: '44444444-4444-4444-8444-444444444444',
      tipo: 'REU',
      principal: true,
    });
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MAIN_RESPONDENT_REQUIRED');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });
  it('rejeita principal em papel diferente de Requerente/Requerido', async () => {
    const invalid: UpdateExtrajudicialAggregateDto = structuredClone(dto);
    invalid.partes.push({
      id: '55555555-5555-4555-8555-555555555555',
      tipo: 'TESTEMUNHA',
      principal: true,
    });
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_MAIN_PARTY');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });
  it('rejeita a mesma pessoa repetida com o mesmo papel', async () => {
    const invalid: UpdateExtrajudicialAggregateDto = structuredClone(dto);
    invalid.partes.push({ clienteId: 'client-3', tipo: 'REU', principal: false });
    invalid.partes.push({ clienteId: 'client-3', tipo: 'REU', principal: false });
    tx.parteProcesso.findMany.mockResolvedValue([
      { id: '11111111-1111-4111-8111-111111111111' },
      { id: '22222222-2222-4222-8222-222222222222' },
    ]);
    tx.cliente.findMany.mockResolvedValue([
      { id: 'client-3', nome: 'Terceiro', tipo: 'PESSOA_FISICA', cpf: '123', cnpj: null },
    ]);
    const result = await useCase.execute('office-1', 'p1', 2, invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_PARTY');
  });
});
