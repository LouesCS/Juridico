import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { TimelineRecorderService } from '../../timeline/application/timeline-recorder.service';
import { ListJudicialMovementsQuery } from '../presentation/schemas/judicial-movement.schemas';

const newSince = () => new Date(Date.now() - 7 * 86_400_000);
const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

@Injectable()
export class JudicialMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  private where(escritorioId: string, membroId: string, q: ListJudicialMovementsQuery) {
    return {
      escritorioId,
      id: undefined as Prisma.MovimentoJudicialCapturadoWhereInput['id'],
      OR: q.q
        ? [
            { numeroCnj: { contains: q.q.replace(/\D/g, '') } },
            { descricao: { contains: q.q, mode: 'insensitive' as const } },
            { tribunal: { contains: q.q, mode: 'insensitive' as const } },
            { tipo: { contains: q.q, mode: 'insensitive' as const } },
            { processo: { titulo: { contains: q.q, mode: 'insensitive' as const } } },
            { processo: { cliente: { nome: { contains: q.q, mode: 'insensitive' as const } } } },
          ]
        : undefined,
      numeroCnj: q.cnj ? { contains: q.cnj.replace(/\D/g, '') } : undefined,
      tribunal: q.tribunal ? { contains: q.tribunal, mode: 'insensitive' as const } : undefined,
      tipo: q.tipo ? { contains: q.tipo, mode: 'insensitive' as const } : undefined,
      provider: q.origem,
      processoId:
        q.processoId ??
        (q.vinculoProcesso === 'SEM'
          ? null
          : q.vinculoProcesso === 'COM'
            ? { not: null }
            : undefined),
      processo:
        q.processo ||
        q.cliente ||
        q.pasta ||
        q.responsavelId ||
        q.pastaJuridicaId ||
        q.clientePastaId ||
        q.encarregadoPastaId ||
        q.parteContrariaPastaId
          ? {
              titulo: q.processo
                ? { contains: q.processo, mode: 'insensitive' as const }
                : undefined,
              cliente: q.cliente
                ? { nome: { contains: q.cliente, mode: 'insensitive' as const } }
                : undefined,
              pastasJuridicas:
                q.pasta ||
                q.pastaJuridicaId ||
                q.clientePastaId ||
                q.encarregadoPastaId ||
                q.parteContrariaPastaId
                  ? {
                      some: {
                        pastaJuridica: {
                          id: q.pastaJuridicaId,
                          nome: q.pasta
                            ? { contains: q.pasta, mode: 'insensitive' as const }
                            : undefined,
                          encarregadoId: q.encarregadoPastaId,
                          vinculosClientes: q.clientePastaId
                            ? { some: { clienteId: q.clientePastaId } }
                            : q.parteContrariaPastaId
                              ? {
                                  some: {
                                    clienteId: q.parteContrariaPastaId,
                                    tipo: 'PARTE_CONTRARIA',
                                  },
                                }
                              : undefined,
                        },
                      },
                    }
                  : undefined,
              responsavelPrincipalId: q.responsavelId,
            }
          : undefined,
      dataMovimento:
        q.movimentoDe || q.movimentoAte
          ? {
              gte: q.movimentoDe ? new Date(q.movimentoDe) : undefined,
              lte: q.movimentoAte ? new Date(q.movimentoAte) : undefined,
            }
          : undefined,
      capturadoEm: q.somenteNovas
        ? { gte: newSince() }
        : q.capturaDe || q.capturaAte
          ? {
              gte: q.capturaDe ? new Date(q.capturaDe) : undefined,
              lte: q.capturaAte ? new Date(q.capturaAte) : undefined,
            }
          : undefined,
      publicacoes: q.somenteComPublicacao ? { some: {} } : undefined,
      estados: q.somenteFavoritas ? { some: { membroId, favoritaEm: { not: null } } } : undefined,
      AND: q.leitura
        ? [
            {
              estados:
                q.leitura === 'LIDA'
                  ? { some: { membroId, lidaEm: { not: null } } }
                  : { none: { membroId, lidaEm: { not: null } } },
            },
          ]
        : undefined,
    } satisfies Prisma.MovimentoJudicialCapturadoWhereInput;
  }

  async list(escritorioId: string, membroId: string, q: ListJudicialMovementsQuery) {
    const where = this.where(escritorioId, membroId, q);
    if (q.tarefas) {
      const links = await this.prisma.client.tarefaVinculo.findMany({
        where: {
          tipoRecurso: 'MOVIMENTACAO_JUDICIAL',
          tarefa: { escritorioId, excluidoEm: null },
        },
        select: { recursoId: true },
      });
      const ids = links.map((link) => link.recursoId);
      where.id = q.tarefas === 'COM' ? { in: ids } : { notIn: ids };
    }
    if (q.timeline) {
      const events = await this.prisma.client.eventoTimeline.findMany({
        where: {
          escritorioId,
          excluidoEm: null,
          entidadeRelacionadaTipo: 'MOVIMENTACAO_JUDICIAL',
        },
        select: { entidadeRelacionadaId: true },
      });
      const ids = events.flatMap((event) => event.entidadeRelacionadaId ?? []);
      where.id = q.timeline === 'COM' ? { in: ids } : { notIn: ids };
    }
    const orderBy: Prisma.MovimentoJudicialCapturadoOrderByWithRelationInput =
      q.sort === 'cliente'
        ? { processo: { cliente: { nome: 'asc' } } }
        : q.sort === 'cnj'
          ? { numeroCnj: 'asc' }
          : q.sort === 'tribunal'
            ? { tribunal: 'asc' }
            : q.sort === '-ultimaSincronizacao'
              ? { capturadoEm: 'desc' }
              : q.sort.startsWith('-')
                ? { [q.sort.slice(1)]: 'desc' }
                : { [q.sort]: 'asc' };
    const include = this.include(membroId, true);
    const [items, total, all, last] = await Promise.all([
      this.prisma.client.movimentoJudicialCapturado.findMany({
        where,
        include,
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.client.movimentoJudicialCapturado.count({ where }),
      this.prisma.client.movimentoJudicialCapturado.findMany({
        where: { escritorioId },
        select: { capturadoEm: true, dataMovimento: true },
      }),
      this.prisma.client.historicoSincronizacaoCaptura.findFirst({
        where: { escritorioId },
        orderBy: { criadoEm: 'desc' },
        select: { criadoEm: true },
      }),
    ]);
    const today = startOfToday();
    const itemIds = items.map((item) => item.id);
    const [taskLinks, timelineEvents] = itemIds.length
      ? await Promise.all([
          this.prisma.client.tarefaVinculo.findMany({
            where: {
              tipoRecurso: 'MOVIMENTACAO_JUDICIAL',
              recursoId: { in: itemIds },
              tarefa: { escritorioId, excluidoEm: null },
            },
            select: { recursoId: true, tarefa: { select: { id: true, titulo: true } } },
          }),
          this.prisma.client.eventoTimeline.findMany({
            where: {
              escritorioId,
              excluidoEm: null,
              entidadeRelacionadaTipo: 'MOVIMENTACAO_JUDICIAL',
              entidadeRelacionadaId: { in: itemIds },
            },
            select: { entidadeRelacionadaId: true },
          }),
        ])
      : [[], []];
    return {
      items: items.map((item) => ({
        ...this.dto(item),
        tarefas: taskLinks.filter((link) => link.recursoId === item.id).map((link) => link.tarefa),
        naTimeline: timelineEvents.some((event) => event.entidadeRelacionadaId === item.id),
      })),
      total,
      page: q.page,
      limit: q.limit,
      indicators: {
        total: all.length,
        novas: all.filter((item) => item.capturadoEm >= newSince()).length,
        hoje: all.filter((item) => item.dataMovimento >= today).length,
        semana: all.filter((item) => item.dataMovimento >= newSince()).length,
        ultimaSincronizacao: last?.criadoEm ?? null,
      },
    };
  }

  async get(escritorioId: string, membroId: string, id: string) {
    const item = await this.prisma.client.movimentoJudicialCapturado.findFirst({
      where: { id, escritorioId },
      include: this.include(membroId, false),
    });
    if (!item) throw new NotFoundException('Movimentação judicial não encontrada.');
    const [taskLinks, timelineEvent] = await Promise.all([
      this.prisma.client.tarefaVinculo.findMany({
        where: {
          tipoRecurso: 'MOVIMENTACAO_JUDICIAL',
          recursoId: id,
          tarefa: { escritorioId, excluidoEm: null },
        },
        select: { tarefa: { select: { id: true, titulo: true } } },
      }),
      item.processo?.pastasJuridicas.length === 1
        ? this.prisma.client.eventoTimeline.findFirst({
            where: {
              escritorioId,
              excluidoEm: null,
              pastaJuridicaId: item.processo.pastasJuridicas[0].pastaJuridica.id,
              entidadeRelacionadaTipo: 'MOVIMENTACAO_JUDICIAL',
              entidadeRelacionadaId: id,
            },
            select: { id: true },
          })
        : null,
    ]);
    return {
      ...this.dto(item),
      tarefas: taskLinks.map((link) => link.tarefa),
      naTimeline: !!timelineEvent,
    };
  }

  async viewed(escritorioId: string, membroId: string, id: string) {
    const movement = await this.find(escritorioId, id);
    await this.event(escritorioId, movement, 'Movimentação judicial visualizada', membroId);
  }

  async toggleFavorite(escritorioId: string, membroId: string, id: string) {
    const movement = await this.find(escritorioId, id);
    const current = await this.prisma.client.movimentoEstadoUsuario.findUnique({
      where: { movimentoId_membroId: { movimentoId: id, membroId } },
    });
    const favorita = !current?.favoritaEm;
    await this.prisma.client.movimentoEstadoUsuario.upsert({
      where: { movimentoId_membroId: { movimentoId: id, membroId } },
      create: { movimentoId: id, membroId, favoritaEm: favorita ? new Date() : null },
      update: { favoritaEm: favorita ? new Date() : null },
    });
    await this.event(
      escritorioId,
      movement,
      favorita ? 'Movimentação judicial favoritada' : 'Movimentação removida dos favoritos',
      membroId,
    );
    return { favorita };
  }

  async toggleRead(escritorioId: string, membroId: string, id: string) {
    const movement = await this.find(escritorioId, id);
    const current = await this.prisma.client.movimentoEstadoUsuario.findUnique({
      where: { movimentoId_membroId: { movimentoId: id, membroId } },
    });
    const lida = !current?.lidaEm;
    await this.prisma.client.movimentoEstadoUsuario.upsert({
      where: { movimentoId_membroId: { movimentoId: id, membroId } },
      create: { movimentoId: id, membroId, lidaEm: lida ? new Date() : null },
      update: { lidaEm: lida ? new Date() : null },
    });
    await this.event(
      escritorioId,
      movement,
      lida ? 'Movimentação judicial lida' : 'Movimentação judicial não lida',
      membroId,
    );
    return { lida };
  }

  async publishToFolderTimeline(escritorioId: string, membroId: string, id: string) {
    const movement = await this.find(escritorioId, id);
    const folders = movement.processo?.pastasJuridicas ?? [];
    if (folders.length !== 1)
      throw new NotFoundException('A movimentação não possui uma Pasta Jurídica inequívoca.');
    const pastaJuridicaId = folders[0].pastaJuridicaId;
    const existing = await this.prisma.client.eventoTimeline.findFirst({
      where: {
        escritorioId,
        excluidoEm: null,
        pastaJuridicaId,
        entidadeRelacionadaTipo: 'MOVIMENTACAO_JUDICIAL',
        entidadeRelacionadaId: id,
      },
      select: { id: true },
    });
    if (existing) return { lancada: true, duplicada: true };
    await this.timeline.record({
      escritorioId,
      pastaJuridicaId,
      tipo: 'PERSONALIZADO',
      titulo: 'Movimentação judicial',
      descricao: movement.descricao.slice(0, 500),
      autorId: membroId,
      entidadeRelacionadaTipo: 'MOVIMENTACAO_JUDICIAL',
      entidadeRelacionadaId: id,
    });
    return { lancada: true, duplicada: false };
  }

  async linkProcess(escritorioId: string, membroId: string, id: string, processoId: string) {
    const movement = await this.find(escritorioId, id);
    const process = await this.prisma.client.processo.findFirst({
      where: { id: processoId, escritorioId },
      select: { id: true },
    });
    if (!process) throw new NotFoundException('Processo não encontrado.');
    await this.prisma.client.movimentoJudicialCapturado.update({
      where: { id },
      data: { processoId },
    });
    await this.event(
      escritorioId,
      { ...movement, processoId },
      'Processo vinculado à movimentação judicial',
      membroId,
    );
    return this.get(escritorioId, membroId, id);
  }

  async export(escritorioId: string, membroId: string, q: ListJudicialMovementsQuery) {
    const items = await this.prisma.client.movimentoJudicialCapturado.findMany({
      where: this.where(escritorioId, membroId, q),
      include: this.include(membroId, true),
      orderBy: { dataMovimento: 'desc' },
      take: 5000,
    });
    return {
      items: items.map((item) => {
        const movement = this.dto(item);
        return {
          dataMovimento: movement.dataMovimento,
          capturadoEm: movement.capturadoEm,
          cnj: movement.numeroCnj,
          processo: movement.processo?.titulo ?? '',
          cliente: movement.processo?.cliente.nome ?? '',
          pasta: movement.pastaJuridica?.nome ?? '',
          tribunal: movement.tribunal ?? '',
          tipo: movement.tipo,
          descricao: movement.descricao,
          fonte: movement.provider,
        };
      }),
      truncado: items.length === 5000,
      limite: 5000,
    };
  }

  private include(membroId: string, compact: boolean) {
    return {
      processo: {
        select: {
          id: true,
          titulo: true,
          cliente: { select: { id: true, nome: true } },
          pastasJuridicas: {
            select: { pastaJuridica: { select: { id: true, nome: true } } },
            ...(compact ? { take: 2 } : {}),
          },
          configuracoesCaptura: { select: { id: true, status: true }, take: 1 },
        },
      },
      publicacoes: {
        select: { id: true, dataPublicacao: true, tipoComunicacao: true, conteudo: true },
        orderBy: { dataPublicacao: 'desc' as const },
        ...(compact ? { take: 1 } : {}),
      },
      estados: { where: { membroId }, take: 1 },
    };
  }

  private async find(escritorioId: string, id: string) {
    const movement = await this.prisma.client.movimentoJudicialCapturado.findFirst({
      where: { id, escritorioId },
      select: {
        id: true,
        processoId: true,
        numeroCnj: true,
        descricao: true,
        processo: { select: { pastasJuridicas: { select: { pastaJuridicaId: true }, take: 2 } } },
      },
    });
    if (!movement) throw new NotFoundException('Movimentação judicial não encontrada.');
    return movement;
  }

  private event(
    escritorioId: string,
    movement: { id: string; processoId: string | null; numeroCnj: string },
    title: string,
    memberId: string,
  ) {
    return movement.processoId
      ? this.timeline.record({
          escritorioId,
          processoId: movement.processoId,
          tipo: 'PERSONALIZADO',
          titulo: title,
          autorId: memberId,
          entidadeRelacionadaTipo: 'MOVIMENTACAO_JUDICIAL',
          entidadeRelacionadaId: movement.id,
          metadados: { numeroCnj: movement.numeroCnj },
        })
      : Promise.resolve();
  }

  private dto<
    T extends {
      estados: Array<{ favoritaEm: Date | null; lidaEm: Date | null }>;
      capturadoEm: Date;
      processo?: null | { pastasJuridicas: Array<{ pastaJuridica: { id: string; nome: string } }> };
    },
  >(item: T) {
    const { estados, ...movement } = item;
    return {
      ...movement,
      favorita: !!estados[0]?.favoritaEm,
      lida: !!estados[0]?.lidaEm,
      pastaJuridica:
        item.processo?.pastasJuridicas.length === 1
          ? item.processo.pastasJuridicas[0].pastaJuridica
          : null,
      origem: 'CAPTURA_JUDICIAL' as const,
      situacao: item.capturadoEm >= newSince() ? ('NOVA' as const) : ('REGISTRADA' as const),
    };
  }
}
