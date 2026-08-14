import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AuditService } from './audit.service';

type LogAuditoriaCreateArgs = { data: Record<string, unknown> };

describe('AuditService', () => {
  function buildService(createImpl?: () => Promise<unknown>) {
    const create = jest.fn<Promise<unknown>, [LogAuditoriaCreateArgs]>(
      createImpl ?? (() => Promise.resolve({})),
    );
    const prisma = {
      client: { logAuditoria: { create } },
    } as unknown as PrismaService;
    return { service: new AuditService(prisma), create };
  }

  function dataOf(create: jest.Mock<Promise<unknown>, [LogAuditoriaCreateArgs]>) {
    return create.mock.calls[0][0].data;
  }

  it('grava o log com os campos informados e sanitiza dados sensíveis', async () => {
    const { service, create } = buildService();

    await service.registrar({
      acao: 'LOGIN',
      recursoTipo: 'SESSAO',
      resultado: 'SUCESSO',
      correlationId: 'corr-1',
      atorId: 'user-1',
      escritorioId: 'office-1',
      dadosDepois: { email: 'a@b.com', senha: 'x' },
    });

    expect(create).toHaveBeenCalledTimes(1);
    const data = dataOf(create);
    expect(data.acao).toBe('LOGIN');
    expect(data.recursoTipo).toBe('SESSAO');
    expect(data.resultado).toBe('SUCESSO');
    expect(data.correlationId).toBe('corr-1');
    const dadosDepois = data.dadosDepois as { senha: string; email: string };
    expect(dadosDepois.senha).toBe('[redacted]');
    expect(dadosDepois.email).toBe('a@b.com');
  });

  it('preenche campos ausentes com valores neutros (null/objeto vazio)', async () => {
    const { service, create } = buildService();

    await service.registrar({
      acao: 'LOGOUT',
      recursoTipo: 'SESSAO',
      resultado: 'SUCESSO',
      correlationId: 'corr-2',
    });

    const data = dataOf(create);
    expect(data.escritorioId).toBeNull();
    expect(data.atorId).toBeNull();
    expect(data.atorTipo).toBe('USUARIO');
    expect(data.motivo).toBeNull();
    expect(data.metadados).toEqual({});
  });

  it('nunca lança quando a gravação falha — auditoria não pode derrubar a operação de negócio', async () => {
    const { service } = buildService(() => Promise.reject(new Error('conexão perdida')));

    await expect(
      service.registrar({
        acao: 'LOGIN',
        recursoTipo: 'SESSAO',
        resultado: 'FALHA',
        correlationId: 'corr-3',
      }),
    ).resolves.toBeUndefined();
  });

  it('consulta contexto paginado, tenant-scoped e sem expor metadata sensível', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'log-1',
        acao: 'UPDATE',
        resultado: 'SUCESSO',
        atorTipo: 'USUARIO',
        criadoEm: new Date(),
        motivo: null,
      },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const prisma = {
      client: {
        logAuditoria: { findMany, count },
        movimentoJudicialCapturado: {
          findFirst: jest.fn().mockResolvedValue({ id: 'movement-1' }),
        },
      },
    } as unknown as PrismaService;
    const service = new AuditService(prisma);
    const result = await service.listContext(
      {
        escritorioId: 'office-1',
        membroId: 'member-1',
        usuarioId: 'user-1',
        sessionId: 'session-1',
        roles: [],
        permissions: ['movement:read'],
      },
      { resourceType: 'MOVIMENTACAO_JUDICIAL', resourceId: 'movement-1', page: 2, limit: 10 },
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          escritorioId: 'office-1',
          recursoTipo: 'MOVIMENTACAO_JUDICIAL',
          recursoId: 'movement-1',
        }),
        skip: 10,
        take: 10,
        select: expect.not.objectContaining({
          metadados: true,
          dadosAntes: true,
          dadosDepois: true,
        }),
      }),
    );
    expect(result.total).toBe(1);
  });

  it('autoriza contexto de Processo somente no tenant e escopo reais', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const processoFindFirst = jest.fn().mockResolvedValue({ id: 'process-1' });
    const prisma = {
      client: {
        logAuditoria: { findMany, count },
        membro: { findFirst: jest.fn().mockResolvedValue({ equipeId: null }), findMany: jest.fn() },
        processo: { findFirst: processoFindFirst },
      },
    } as unknown as PrismaService;
    const service = new AuditService(prisma);

    await service.listContext(
      {
        escritorioId: 'office-1',
        membroId: 'member-1',
        permissions: ['case:read:all'],
      } as never,
      { resourceType: 'PROCESSO', resourceId: 'process-1', page: 1, limit: 10 },
    );

    expect(processoFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'process-1', escritorioId: 'office-1' }),
      }),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          escritorioId: 'office-1',
          recursoTipo: 'PROCESSO',
          recursoId: 'process-1',
        }),
      }),
    );
  });

  it('separa atividades antigas no banco e mantém paginação e tenant', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      client: {
        logAuditoria: { findMany, count },
        membro: { findFirst: jest.fn().mockResolvedValue({ equipeId: null }), findMany: jest.fn() },
        processo: { findFirst: jest.fn().mockResolvedValue({ id: 'process-1' }) },
      },
    } as unknown as PrismaService;
    const service = new AuditService(prisma);
    const result = await service.listContext(
      { escritorioId: 'office-1', membroId: 'member-1', permissions: ['case:read:all'] } as never,
      { resourceType: 'PROCESSO', resourceId: 'process-1', page: 2, limit: 5, period: 'ANTIGAS' },
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          escritorioId: 'office-1',
          criadoEm: { lt: expect.any(Date) },
        }),
        skip: 5,
        take: 5,
      }),
    );
    expect(result.period).toBe('ANTIGAS');
  });
});
