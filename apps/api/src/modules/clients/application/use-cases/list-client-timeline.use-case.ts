import { Injectable } from '@nestjs/common';
import { TipoEventoTimeline } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineItem } from '../../../timeline/domain/timeline-item';
import { ListClientTimelineQuery } from '../../presentation/schemas/client.schemas';

const TIPOS_VALIDOS = new Set<string>(Object.values(TipoEventoTimeline));

/**
 * `Cliente` não ganhou um `EventoTimeline.clienteId` próprio nesta Sprint
 * (exigiria alterar o Timeline Engine, congelado — ver `update-client.use-
 * case.ts`) — em vez disso, lê os eventos já gravados com
 * `entidadeRelacionadaTipo: 'cliente'`/`entidadeRelacionadaId: clienteId`
 * (fan-out por Processo vinculado) e agrega numa única lista, ordenada por
 * data, exatamente como se fosse uma Timeline própria do cliente. Mesmo
 * efeito visual de `ListTaskTimelineUseCase` (Prompt 14), técnica
 * diferente por causa da restrição desta Sprint.
 */
@Injectable()
export class ListClientTimelineUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    clienteId: string,
    query: ListClientTimelineQuery,
  ): Promise<Result<{ items: TimelineItem[]; nextCursor: string | null }>> {
    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, escritorioId },
      select: { id: true },
    });
    if (!cliente) return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));

    const cursorDate = query.cursor ? new Date(query.cursor) : null;
    const tiposFiltro = query.tipo
      ? query.tipo
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter((t): t is TipoEventoTimeline => TIPOS_VALIDOS.has(t))
      : null;

    const eventos = await this.prisma.client.eventoTimeline.findMany({
      where: {
        escritorioId,
        entidadeRelacionadaTipo: 'cliente',
        entidadeRelacionadaId: clienteId,
        ...(tiposFiltro ? { tipo: { in: tiposFiltro } } : {}),
        ...(cursorDate ? { dataEvento: { lt: cursorDate } } : {}),
        ...(query.q
          ? {
              OR: [
                { titulo: { contains: query.q, mode: 'insensitive' } },
                { descricao: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { dataEvento: 'desc' },
      take: query.limit + 1,
    });

    const hasMore = eventos.length > query.limit;
    const pagina = hasMore ? eventos.slice(0, query.limit) : eventos;

    const autorIds = [...new Set(pagina.map((e) => e.autorId).filter((id): id is string => !!id))];
    const autores = autorIds.length
      ? await this.prisma.client.membro.findMany({
          where: { id: { in: autorIds } },
          include: { usuario: true },
        })
      : [];
    const autorPorId = new Map(autores.map((a) => [a.id, a]));

    return Result.ok({
      items: pagina.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        titulo: e.titulo,
        descricao: e.descricao,
        dataEvento: e.dataEvento,
        origem: e.origem,
        autor:
          e.autorId && autorPorId.has(e.autorId)
            ? {
                id: e.autorId,
                nome: autorPorId.get(e.autorId)!.usuario?.nome ?? autorPorId.get(e.autorId)!.nome,
              }
            : null,
        entidadeRelacionada:
          e.entidadeRelacionadaTipo && e.entidadeRelacionadaId
            ? { tipo: e.entidadeRelacionadaTipo, id: e.entidadeRelacionadaId }
            : null,
        fixado: e.fixado,
        editavel: false,
      })),
      nextCursor:
        hasMore && pagina.length > 0 ? pagina[pagina.length - 1].dataEvento.toISOString() : null,
    });
  }
}
