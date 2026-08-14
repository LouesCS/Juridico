import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { TimelineRecorderService } from '../../timeline/application/timeline-recorder.service';
import { ListPublicationsQuery } from '../presentation/schemas/publication.schemas';

const newSince = () => new Date(Date.now() - 7 * 86_400_000);

@Injectable()
export class PublicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  private buildWhere(
    escritorioId: string,
    membroId: string,
    q: ListPublicationsQuery,
  ): Prisma.PublicacaoJudicialCapturadaWhereInput {
    const unread = { none: { membroId, lidaEm: { not: null } } };
    const read = { some: { membroId, lidaEm: { not: null } } };
    const state =
      q.somenteNaoLidas || q.somenteNovas || q.situacao === 'NOVA' || q.situacao === 'PENDENTE'
        ? unread
        : q.situacao === 'LIDA'
          ? read
          : undefined;
    return {
      escritorioId,
      processoId: q.processoId,
      OR: q.q
        ? [
            { numeroCnj: { contains: q.q.replace(/\D/g, '') } },
            { conteudo: { contains: q.q, mode: 'insensitive' } },
            { tribunal: { contains: q.q, mode: 'insensitive' } },
            { tipoComunicacao: { contains: q.q, mode: 'insensitive' } },
            { processo: { titulo: { contains: q.q, mode: 'insensitive' } } },
            { processo: { cliente: { nome: { contains: q.q, mode: 'insensitive' } } } },
          ]
        : undefined,
      numeroCnj: q.cnj ? { contains: q.cnj.replace(/\D/g, '') } : undefined,
      tribunal: q.tribunal ? { contains: q.tribunal, mode: 'insensitive' } : undefined,
      tipoComunicacao: q.tipo ? { contains: q.tipo, mode: 'insensitive' } : undefined,
      processo:
        q.processo || q.cliente || q.responsavelId
          ? {
              titulo: q.processo ? { contains: q.processo, mode: 'insensitive' } : undefined,
              cliente: q.cliente
                ? { nome: { contains: q.cliente, mode: 'insensitive' } }
                : undefined,
              responsavelPrincipalId: q.responsavelId,
            }
          : undefined,
      dataPublicacao:
        q.publicacaoDe || q.publicacaoAte
          ? {
              gte: q.publicacaoDe ? new Date(q.publicacaoDe) : undefined,
              lte: q.publicacaoAte ? new Date(q.publicacaoAte) : undefined,
            }
          : undefined,
      capturadoEm:
        q.somenteNovas || q.situacao === 'NOVA'
          ? { gte: newSince() }
          : q.situacao === 'PENDENTE'
            ? { lt: newSince() }
            : q.cadastroDe || q.cadastroAte
              ? {
                  gte: q.cadastroDe ? new Date(q.cadastroDe) : undefined,
                  lte: q.cadastroAte ? new Date(q.cadastroAte) : undefined,
                }
              : undefined,
      movimentoRelacionadoId: q.somenteComMovimentacao ? { not: null } : undefined,
      estados: state,
    };
  }

  async list(escritorioId: string, membroId: string, q: ListPublicationsQuery) {
    const where = this.buildWhere(escritorioId, membroId, q);
    const orderBy: Prisma.PublicacaoJudicialCapturadaOrderByWithRelationInput =
      q.sort === 'cliente'
        ? { processo: { cliente: { nome: 'asc' } } }
        : q.sort === '-ultimaMovimentacao'
          ? { movimentoRelacionado: { dataMovimento: 'desc' } }
          : q.sort === 'cnj'
            ? { numeroCnj: 'asc' }
            : q.sort === 'tribunal'
              ? { tribunal: 'asc' }
              : q.sort.startsWith('-')
                ? { [q.sort.slice(1)]: 'desc' }
                : { [q.sort]: 'asc' };
    const include = {
      processo: {
        select: {
          id: true,
          titulo: true,
          cliente: { select: { id: true, nome: true } },
          pastas: { select: { id: true, nome: true }, take: 1 },
          responsavelPrincipalId: true,
        },
      },
      movimentoRelacionado: {
        select: { id: true, dataMovimento: true, descricao: true, tipo: true },
      },
      estados: { where: { membroId }, take: 1 },
    } as const;
    const [items, total, all, last] = await Promise.all([
      this.prisma.client.publicacaoJudicialCapturada.findMany({
        where,
        include,
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.client.publicacaoJudicialCapturada.count({ where }),
      this.prisma.client.publicacaoJudicialCapturada.findMany({
        where: { escritorioId },
        select: { capturadoEm: true, estados: { where: { membroId }, select: { lidaEm: true } } },
      }),
      this.prisma.client.historicoSincronizacaoCaptura.findFirst({
        where: { escritorioId },
        orderBy: { criadoEm: 'desc' },
        select: { criadoEm: true },
      }),
    ]);
    return {
      items: items.map((i) => this.dto(i)),
      total,
      page: q.page,
      limit: q.limit,
      indicators: {
        total: all.length,
        novas: all.filter((i) => i.capturadoEm >= newSince() && !i.estados[0]?.lidaEm).length,
        lidas: all.filter((i) => !!i.estados[0]?.lidaEm).length,
        pendentes: all.filter((i) => !i.estados[0]?.lidaEm).length,
        ultimaSincronizacao: last?.criadoEm ?? null,
      },
    };
  }

  async get(escritorioId: string, membroId: string, id: string) {
    const item = await this.prisma.client.publicacaoJudicialCapturada.findFirst({
      where: { id, escritorioId },
      include: {
        processo: {
          select: {
            id: true,
            titulo: true,
            cliente: { select: { id: true, nome: true } },
            pastas: { select: { id: true, nome: true } },
            configuracoesCaptura: { select: { id: true, status: true }, take: 1 },
          },
        },
        movimentoRelacionado: true,
        estados: { where: { membroId }, take: 1 },
      },
    });
    if (!item) throw new NotFoundException('Publicação não encontrada.');
    return this.dto(item);
  }

  async markRead(escritorioId: string, membroId: string, id: string) {
    const p = await this.find(escritorioId, id);
    const state = await this.prisma.client.publicacaoEstadoUsuario.upsert({
      where: { publicacaoId_membroId: { publicacaoId: id, membroId } },
      create: { publicacaoId: id, membroId, lidaEm: new Date() },
      update: { lidaEm: new Date() },
    });
    await this.event(escritorioId, p, 'Publicação marcada como lida', membroId);
    return { lida: true, lidaEm: state.lidaEm };
  }
  async toggleFavorite(escritorioId: string, membroId: string, id: string) {
    const p = await this.find(escritorioId, id);
    const old = await this.prisma.client.publicacaoEstadoUsuario.findUnique({
      where: { publicacaoId_membroId: { publicacaoId: id, membroId } },
    });
    const favorita = !old?.favoritaEm;
    await this.prisma.client.publicacaoEstadoUsuario.upsert({
      where: { publicacaoId_membroId: { publicacaoId: id, membroId } },
      create: { publicacaoId: id, membroId, favoritaEm: favorita ? new Date() : null },
      update: { favoritaEm: favorita ? new Date() : null },
    });
    await this.event(
      escritorioId,
      p,
      favorita ? 'Publicação favoritada' : 'Publicação removida dos favoritos',
      membroId,
    );
    return { favorita };
  }
  async viewed(escritorioId: string, membroId: string, id: string) {
    const p = await this.find(escritorioId, id);
    await this.event(escritorioId, p, 'Publicação visualizada', membroId);
  }
  async remove(escritorioId: string, membroId: string, id: string) {
    const p = await this.find(escritorioId, id);
    await this.event(escritorioId, p, 'Publicação removida', membroId);
    await this.prisma.client.publicacaoJudicialCapturada.delete({ where: { id } });
  }

  async export(escritorioId: string, membroId: string, q: ListPublicationsQuery) {
    const items = await this.prisma.client.publicacaoJudicialCapturada.findMany({
      where: this.buildWhere(escritorioId, membroId, q),
      include: {
        processo: { select: { titulo: true, cliente: { select: { nome: true } } } },
        estados: { where: { membroId }, take: 1 },
      },
      take: 5000,
      orderBy: { dataPublicacao: 'desc' },
    });
    return {
      items: items.map((i) => ({
        dataPublicacao: i.dataPublicacao,
        capturadoEm: i.capturadoEm,
        cnj: i.numeroCnj,
        processo: i.processo?.titulo ?? '',
        cliente: i.processo?.cliente.nome ?? '',
        tribunal: i.tribunal ?? '',
        tipo: i.tipoComunicacao ?? '',
        resumo: (i.conteudo ?? '').slice(0, 240),
        situacao: i.estados[0]?.lidaEm ? 'LIDA' : 'PENDENTE',
      })),
      truncado: items.length === 5000,
      limite: 5000,
    };
  }

  private async find(escritorioId: string, id: string) {
    const p = await this.prisma.client.publicacaoJudicialCapturada.findFirst({
      where: { id, escritorioId },
      select: { id: true, processoId: true, numeroCnj: true },
    });
    if (!p) throw new NotFoundException('Publicação não encontrada.');
    return p;
  }
  private event(
    escritorioId: string,
    p: { id: string; processoId: string | null; numeroCnj: string },
    title: string,
    actor: string,
  ) {
    return p.processoId
      ? this.timeline.record({
          escritorioId,
          processoId: p.processoId,
          tipo: 'PERSONALIZADO',
          titulo: title,
          autorId: actor,
          entidadeRelacionadaTipo: 'PUBLICACAO',
          entidadeRelacionadaId: p.id,
          metadados: { numeroCnj: p.numeroCnj },
        })
      : Promise.resolve();
  }
  private dto<
    T extends {
      estados: Array<{ lidaEm: Date | null; favoritaEm: Date | null }>;
      capturadoEm: Date;
    },
  >(item: T) {
    const { estados, ...rest } = item;
    return {
      ...rest,
      lida: !!estados[0]?.lidaEm,
      favorita: !!estados[0]?.favoritaEm,
      situacao: estados[0]?.lidaEm ? 'LIDA' : item.capturadoEm >= newSince() ? 'NOVA' : 'PENDENTE',
    };
  }
}
