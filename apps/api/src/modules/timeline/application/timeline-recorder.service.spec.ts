import { TimelineRecorderService } from './timeline-recorder.service';

describe('TimelineRecorderService', () => {
  const prisma = { client: { eventoTimeline: { create: jest.fn() } } };

  function buildService() {
    return new TimelineRecorderService(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('grava o evento com origem SISTEMA por padrão', async () => {
    await buildService().record({
      escritorioId: 'escritorio-1',
      processoId: 'processo-1',
      tipo: 'CRIACAO_PROCESSO',
      titulo: 'Processo criado',
    });

    expect(prisma.client.eventoTimeline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        escritorioId: 'escritorio-1',
        processoId: 'processo-1',
        tipo: 'CRIACAO_PROCESSO',
        titulo: 'Processo criado',
        origem: 'SISTEMA',
        metadados: {},
      }),
    });
  });

  it('aceita origem/metadados/entidade relacionada explícitos', async () => {
    await buildService().record({
      escritorioId: 'escritorio-1',
      processoId: 'processo-1',
      tipo: 'EQUIPE_ALTERADA',
      titulo: 'Membro adicionado à equipe',
      origem: 'MANUAL',
      autorId: 'membro-1',
      entidadeRelacionadaTipo: 'membro',
      entidadeRelacionadaId: 'membro-2',
      metadados: { acao: 'ADICIONADO' },
    });

    expect(prisma.client.eventoTimeline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        origem: 'MANUAL',
        autorId: 'membro-1',
        entidadeRelacionadaTipo: 'membro',
        entidadeRelacionadaId: 'membro-2',
        metadados: { acao: 'ADICIONADO' },
      }),
    });
  });

  it('nunca lança exceção quando a gravação falha (caminho secundário, best-effort)', async () => {
    prisma.client.eventoTimeline.create.mockRejectedValue(new Error('conexão perdida'));

    await expect(
      buildService().record({
        escritorioId: 'escritorio-1',
        processoId: 'processo-1',
        tipo: 'ARQUIVAMENTO',
        titulo: 'Processo arquivado',
      }),
    ).resolves.toBeUndefined();
  });
});
