import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { TimelineRecorderService } from '../../timeline/application/timeline-recorder.service';
import {
  MovementBody,
  MovementEdit,
  MovementList,
} from '../presentation/schemas/extrajudicial-movement.schemas';
const TYPES = [
  'Notificação',
  'Acordo',
  'Cobrança',
  'Negociação',
  'Contato',
  'Reunião',
  'Diligência',
  'Protocolo',
  'Outro',
];
const ORIGINS = ['Manual', 'Importação', 'Integração', 'Sistema'];
const STATUSES = ['Pendente', 'Em andamento', 'Concluída', 'Cancelada'];
@Injectable()
export class ExtrajudicialMovementsService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineRecorderService,
  ) {}
  private include(memberId: string) {
    return {
      cliente: { select: { id: true, nome: true } },
      processo: { select: { id: true, titulo: true, numeroCnj: true } },
      pasta: { select: { id: true, nome: true } },
      pastaJuridica: {
        select: { id: true, nome: true, confidencial: true, encarregadoId: true },
      },
      responsavel: { select: { id: true, nome: true } },
      estados: { where: { membroId: memberId }, take: 1 },
    } as const;
  }
  private async where(
    officeId: string,
    memberId: string,
    q: MovementList,
  ): Promise<Prisma.MovimentacaoExtrajudicialWhereInput> {
    const and: Prisma.MovimentacaoExtrajudicialWhereInput[] = [];
    if (q.tarefas) {
      const links = await this.prisma.client.tarefaVinculo.findMany({
        where: {
          tipoRecurso: 'MOVIMENTACAO_EXTRAJUDICIAL',
          tarefa: { escritorioId: officeId, excluidoEm: null },
        },
        select: { recursoId: true },
      });
      and.push({
        id:
          q.tarefas === 'COM'
            ? { in: links.map((v) => v.recursoId) }
            : { notIn: links.map((v) => v.recursoId) },
      });
    }
    if (q.timeline) {
      const events = await this.prisma.client.eventoTimeline.findMany({
        where: {
          escritorioId: officeId,
          excluidoEm: null,
          entidadeRelacionadaTipo: 'MOVIMENTACAO_EXTRAJUDICIAL',
          entidadeRelacionadaId: { not: null },
        },
        select: { entidadeRelacionadaId: true },
      });
      const ids = events.flatMap((event) =>
        event.entidadeRelacionadaId ? [event.entidadeRelacionadaId] : [],
      );
      and.push({ id: q.timeline === 'COM' ? { in: ids } : { notIn: ids } });
    }
    return {
      escritorioId: officeId,
      excluidoEm: null,
      AND: and.length ? and : undefined,
      OR: q.q
        ? [
            { descricao: { contains: q.q, mode: 'insensitive' } },
            { observacoes: { contains: q.q, mode: 'insensitive' } },
            { cliente: { nome: { contains: q.q, mode: 'insensitive' } } },
            { processo: { titulo: { contains: q.q, mode: 'insensitive' } } },
            { responsavel: { nome: { contains: q.q, mode: 'insensitive' } } },
          ]
        : undefined,
      cliente: q.cliente ? { nome: { contains: q.cliente, mode: 'insensitive' } } : undefined,
      processo: q.processo ? { titulo: { contains: q.processo, mode: 'insensitive' } } : undefined,
      processoId: q.processoId,
      pasta: q.pasta ? { nome: { contains: q.pasta, mode: 'insensitive' } } : undefined,
      pastaJuridicaId: q.pastaJuridicaId,
      pastaJuridica:
        q.clientePastaId || q.encarregadoPastaId || q.parteContrariaPastaId
          ? {
              encarregadoId: q.encarregadoPastaId,
              AND: [
                ...(q.clientePastaId
                  ? [
                      {
                        OR: [
                          { clientePrincipalId: q.clientePastaId },
                          {
                            vinculosClientes: {
                              some: { clienteId: q.clientePastaId, tipo: 'CLIENTE' as const },
                            },
                          },
                        ],
                      },
                    ]
                  : []),
                ...(q.parteContrariaPastaId
                  ? [
                      {
                        OR: [
                          { parteContrariaPrincipalId: q.parteContrariaPastaId },
                          {
                            vinculosClientes: {
                              some: {
                                clienteId: q.parteContrariaPastaId,
                                tipo: 'PARTE_CONTRARIA' as const,
                              },
                            },
                          },
                        ],
                      },
                    ]
                  : []),
              ],
            }
          : undefined,
      tipo: q.tipo ? { contains: q.tipo, mode: 'insensitive' } : undefined,
      origem: q.origem ? { contains: q.origem, mode: 'insensitive' } : undefined,
      status: q.concluidas
        ? { equals: 'Concluída', mode: 'insensitive' }
        : q.pendentes
          ? { in: ['Pendente', 'Em andamento'] }
          : q.status
            ? { contains: q.status, mode: 'insensitive' }
            : undefined,
      responsavelId: q.responsavelId,
      dataMovimentacao:
        q.dataDe || q.dataAte
          ? {
              gte: q.dataDe ? new Date(q.dataDe) : undefined,
              lte: q.dataAte ? new Date(q.dataAte) : undefined,
            }
          : undefined,
      criadoEm:
        q.criadoDe || q.criadoAte
          ? {
              gte: q.criadoDe ? new Date(q.criadoDe) : undefined,
              lte: q.criadoAte ? new Date(q.criadoAte) : undefined,
            }
          : undefined,
      estados: q.favoritas
        ? { some: { membroId: memberId, favoritaEm: { not: null } } }
        : q.leitura === 'LIDA'
          ? { some: { membroId: memberId, lidaEm: { not: null } } }
          : q.leitura === 'NAO_LIDA'
            ? { none: { membroId: memberId, lidaEm: { not: null } } }
            : undefined,
    };
  }
  async catalogs(officeId: string) {
    const sets = await this.prisma.client.conjuntoValores.findMany({
      where: {
        escritorioId: officeId,
        ativo: true,
        nome: {
          in: [
            'Tipos de movimentação extrajudicial',
            'Origens de movimentação extrajudicial',
            'Status de movimentação extrajudicial',
          ],
        },
      },
      include: { itens: { where: { ativo: true }, orderBy: { ordem: 'asc' } } },
    });
    const values = (name: string, fallback: string[]) =>
      sets.find((s) => s.nome === name)?.itens.map((i) => i.valor) ?? fallback;
    return {
      tipos: values('Tipos de movimentação extrajudicial', TYPES),
      origens: values('Origens de movimentação extrajudicial', ORIGINS),
      status: values('Status de movimentação extrajudicial', STATUSES),
      camposExtras: await this.prisma.client.campoExtra.findMany({
        where: {
          escritorioId: officeId,
          entidade: 'MOVIMENTACAO_EXTRAJUDICIAL',
          ativo: true,
          excluidoEm: null,
        },
        orderBy: { ordem: 'asc' },
      }),
    };
  }
  async list(officeId: string, memberId: string, q: MovementList) {
    const where = await this.where(officeId, memberId, q);
    const orderBy: Prisma.MovimentacaoExtrajudicialOrderByWithRelationInput =
      q.sort === 'cliente'
        ? { cliente: { nome: 'asc' } }
        : q.sort === 'processo'
          ? { processo: { titulo: 'asc' } }
          : q.sort === 'responsavel'
            ? { responsavel: { nome: 'asc' } }
            : q.sort.startsWith('-')
              ? { [q.sort.slice(1)]: 'desc' }
              : { [q.sort]: 'asc' };
    const [items, total, all] = await Promise.all([
      this.prisma.client.movimentacaoExtrajudicial.findMany({
        where,
        include: this.include(memberId),
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.client.movimentacaoExtrajudicial.count({ where }),
      this.prisma.client.movimentacaoExtrajudicial.findMany({
        where: { escritorioId: officeId, excluidoEm: null },
        select: {
          dataMovimentacao: true,
          status: true,
          estados: { where: { membroId: memberId }, select: { favoritaEm: true } },
        },
      }),
    ]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(Date.now() - 7 * 86400000);
    const links = items.length
      ? await this.prisma.client.tarefaVinculo.findMany({
          where: {
            tipoRecurso: 'MOVIMENTACAO_EXTRAJUDICIAL',
            recursoId: { in: items.map((item) => item.id) },
            tarefa: { escritorioId: officeId, excluidoEm: null },
          },
          select: { recursoId: true, tarefa: { select: { id: true, titulo: true } } },
        })
      : [];
    const tasksByMovement = new Map<string, Array<{ id: string; titulo: string }>>();
    for (const link of links)
      tasksByMovement.set(link.recursoId, [
        ...(tasksByMovement.get(link.recursoId) ?? []),
        link.tarefa,
      ]);
    return {
      items: items.map((i) => this.dto(i, tasksByMovement.get(i.id) ?? [])),
      total,
      page: q.page,
      limit: q.limit,
      indicators: {
        total: all.length,
        hoje: all.filter((i) => i.dataMovimentacao >= today).length,
        semana: all.filter((i) => i.dataMovimentacao >= week).length,
        pendentes: all.filter((i) => ['Pendente', 'Em andamento'].includes(i.status)).length,
        favoritas: all.filter((i) => i.estados[0]?.favoritaEm).length,
      },
    };
  }
  async get(officeId: string, memberId: string, id: string) {
    const item = await this.prisma.client.movimentacaoExtrajudicial.findFirst({
      where: { id, escritorioId: officeId, excluidoEm: null },
      include: this.include(memberId),
    });
    if (!item) throw new NotFoundException('Movimentação extrajudicial não encontrada.');
    const documents = await this.prisma.client.documento.findMany({
      where: {
        escritorioId: officeId,
        excluidoEm: null,
        OR: [
          { clienteId: item.clienteId },
          ...(item.processoId ? [{ processoId: item.processoId }] : []),
          ...(item.pastaId ? [{ pastaId: item.pastaId }] : []),
        ],
      },
      select: { id: true, nome: true, extensao: true, criadoEm: true },
    });
    const taskLinks = await this.prisma.client.tarefaVinculo.findMany({
      where: {
        tipoRecurso: 'MOVIMENTACAO_EXTRAJUDICIAL',
        recursoId: id,
        tarefa: { escritorioId: officeId, excluidoEm: null },
      },
      select: { tarefa: { select: { id: true, titulo: true } } },
    });
    const timelineEvent = item.pastaJuridicaId
      ? await this.prisma.client.eventoTimeline.findFirst({
          where: {
            escritorioId: officeId,
            excluidoEm: null,
            pastaJuridicaId: item.pastaJuridicaId,
            entidadeRelacionadaTipo: 'MOVIMENTACAO_EXTRAJUDICIAL',
            entidadeRelacionadaId: id,
          },
          select: { id: true },
        })
      : null;
    return {
      ...this.dto(
        item,
        taskLinks.map((link) => link.tarefa),
      ),
      naTimeline: !!timelineEvent,
      anexos: documents,
    };
  }
  async create(officeId: string, actorId: string, data: MovementBody) {
    const normalized = await this.validate(officeId, data);
    const item = await this.prisma.client.movimentacaoExtrajudicial.create({
      data: {
        ...normalized,
        escritorioId: officeId,
        criadoPorId: actorId,
        dataMovimentacao: new Date(data.dataMovimentacao),
        camposExtrasValores: (data.camposExtrasValores ?? {}) as Prisma.InputJsonValue,
      },
      include: this.include(actorId),
    });
    await this.event(officeId, item, 'Movimentação extrajudicial criada', actorId);
    return this.dto(item);
  }
  async update(officeId: string, actorId: string, id: string, data: MovementEdit) {
    await this.find(officeId, id);
    const item = await this.prisma.client.movimentacaoExtrajudicial.update({
      where: { id },
      data: {
        dataMovimentacao: data.dataMovimentacao ? new Date(data.dataMovimentacao) : undefined,
        descricao: data.descricao,
      },
      include: this.include(actorId),
    });
    await this.event(officeId, item, 'Movimentação extrajudicial editada', actorId);
    return this.dto(item);
  }
  async remove(officeId: string, actorId: string, id: string) {
    const item = await this.find(officeId, id);
    await this.prisma.client.movimentacaoExtrajudicial.update({
      where: { id },
      data: { excluidoEm: new Date() },
    });
    await this.event(officeId, item, 'Movimentação extrajudicial removida', actorId);
  }
  async publishToFolderTimeline(officeId: string, actorId: string, id: string) {
    const item = await this.find(officeId, id);
    if (!item.pastaJuridicaId)
      throw new BadRequestException('A movimentação não possui Pasta Jurídica.');
    const existing = await this.prisma.client.eventoTimeline.findFirst({
      where: {
        escritorioId: officeId,
        excluidoEm: null,
        pastaJuridicaId: item.pastaJuridicaId,
        entidadeRelacionadaTipo: 'MOVIMENTACAO_EXTRAJUDICIAL',
        entidadeRelacionadaId: id,
      },
      select: { id: true },
    });
    if (existing) return { lancada: true, duplicada: true };
    await this.timeline.record({
      escritorioId: officeId,
      pastaJuridicaId: item.pastaJuridicaId,
      tipo: 'PERSONALIZADO',
      titulo: 'Movimentação extrajudicial',
      descricao: item.descricao.slice(0, 500),
      autorId: actorId,
      entidadeRelacionadaTipo: 'MOVIMENTACAO_EXTRAJUDICIAL',
      entidadeRelacionadaId: id,
    });
    return { lancada: true, duplicada: false };
  }
  async favorite(officeId: string, memberId: string, id: string) {
    const item = await this.find(officeId, id);
    const old = await this.prisma.client.movimentacaoExtrajudicialEstadoUsuario.findUnique({
      where: { movimentacaoId_membroId: { movimentacaoId: id, membroId: memberId } },
    });
    const favorita = !old?.favoritaEm;
    await this.prisma.client.movimentacaoExtrajudicialEstadoUsuario.upsert({
      where: { movimentacaoId_membroId: { movimentacaoId: id, membroId: memberId } },
      create: { movimentacaoId: id, membroId: memberId, favoritaEm: favorita ? new Date() : null },
      update: { favoritaEm: favorita ? new Date() : null },
    });
    await this.event(
      officeId,
      item,
      favorita ? 'Movimentação extrajudicial favoritada' : 'Movimentação removida dos favoritos',
      memberId,
    );
    return { favorita };
  }
  async toggleRead(officeId: string, memberId: string, id: string) {
    await this.find(officeId, id);
    const old = await this.prisma.client.movimentacaoExtrajudicialEstadoUsuario.findUnique({
      where: { movimentacaoId_membroId: { movimentacaoId: id, membroId: memberId } },
    });
    const lida = !old?.lidaEm;
    await this.prisma.client.movimentacaoExtrajudicialEstadoUsuario.upsert({
      where: { movimentacaoId_membroId: { movimentacaoId: id, membroId: memberId } },
      create: { movimentacaoId: id, membroId: memberId, lidaEm: lida ? new Date() : null },
      update: { lidaEm: lida ? new Date() : null },
    });
    return { lida };
  }
  async export(officeId: string, memberId: string, q: MovementList) {
    const where = await this.where(officeId, memberId, q);
    const rows = await this.prisma.client.movimentacaoExtrajudicial.findMany({
      where,
      include: this.include(memberId),
      take: 5000,
      orderBy: { dataMovimentacao: 'desc' },
    });
    return {
      items: rows.map((i) => ({
        data: i.dataMovimentacao,
        cliente: i.cliente.nome,
        processo: i.processo?.titulo ?? '',
        pasta: i.pasta?.nome ?? '',
        tipo: i.tipo,
        responsavel: i.responsavel.nome,
        origem: i.origem,
        status: i.status,
        descricao: i.descricao,
      })),
      truncado: rows.length === 5000,
      limite: 5000,
    };
  }
  private async find(officeId: string, id: string) {
    const item = await this.prisma.client.movimentacaoExtrajudicial.findFirst({
      where: { id, escritorioId: officeId, excluidoEm: null },
    });
    if (!item) throw new NotFoundException('Movimentação extrajudicial não encontrada.');
    return item;
  }
  private async validate(officeId: string, data: MovementBody) {
    let clientId = data.clienteId;
    if (data.processoId) {
      const p = await this.prisma.client.processo.findFirst({
        where: { id: data.processoId, escritorioId: officeId, tipo: 'EXTRAJUDICIAL' },
        select: { clienteId: true },
      });
      if (!p) throw new BadRequestException('Processo Extrajudicial inválido.');
      if (clientId && clientId !== p.clienteId)
        throw new BadRequestException('Cliente não pertence ao Processo.');
      clientId = p.clienteId;
    }
    if (!clientId) throw new BadRequestException('Informe Cliente ou Processo.');
    if (
      !(await this.prisma.client.cliente.findFirst({
        where: { id: clientId, escritorioId: officeId },
        select: { id: true },
      }))
    )
      throw new BadRequestException('Cliente inválido.');
    if (
      data.pastaId &&
      !(await this.prisma.client.pasta.findFirst({
        where: { id: data.pastaId, processoId: data.processoId ?? undefined },
        select: { id: true },
      }))
    )
      throw new BadRequestException('Pasta inválida.');
    if (
      data.pastaJuridicaId &&
      !(await this.prisma.client.pastaJuridica.findFirst({
        where: { id: data.pastaJuridicaId, escritorioId: officeId, excluidoEm: null },
        select: { id: true },
      }))
    )
      throw new BadRequestException('Pasta Jurídica inválida.');
    const fields = await this.prisma.client.campoExtra.findMany({
      where: {
        escritorioId: officeId,
        entidade: 'MOVIMENTACAO_EXTRAJUDICIAL',
        ativo: true,
        excluidoEm: null,
      },
    });
    for (const field of fields.filter((f) => f.obrigatorio))
      if (!data.camposExtrasValores?.[field.id]?.trim())
        throw new BadRequestException(`${field.nome} é obrigatório.`);
    return { ...data, clienteId: clientId };
  }
  private event(
    officeId: string,
    item: { id: string; processoId: string | null },
    title: string,
    actorId: string,
  ) {
    return item.processoId
      ? this.timeline.record({
          escritorioId: officeId,
          processoId: item.processoId,
          tipo: 'PERSONALIZADO',
          titulo: title,
          autorId: actorId,
          entidadeRelacionadaTipo: 'MOVIMENTACAO_EXTRAJUDICIAL',
          entidadeRelacionadaId: item.id,
        })
      : Promise.resolve();
  }
  private dto<T extends { estados: Array<{ favoritaEm: Date | null; lidaEm: Date | null }> }>(
    item: T,
    tarefas: Array<{ id: string; titulo: string }> = [],
  ) {
    const { estados, ...rest } = item;
    return { ...rest, favorita: !!estados[0]?.favoritaEm, lida: !!estados[0]?.lidaEm, tarefas };
  }
}
