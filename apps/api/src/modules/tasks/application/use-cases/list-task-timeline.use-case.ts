import { Injectable } from '@nestjs/common';
import { TipoEventoTimeline } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineItem } from '../../../timeline/domain/timeline-item';
import { ListTaskTimelineQuery } from '../../presentation/schemas/task.schemas';

const TIPOS_VALIDOS = new Set<string>(Object.values(TipoEventoTimeline));

/**
 * Reafirma docs/backend-implementation/23-task-engine.md §23.6 (Timeline).
 * Mais simples que `ListCaseTimelineUseCase` (Sprint 08) porque Tarefa não
 * tem uma projeção somente-leitura equivalente a `Prazo` para mesclar — só
 * lê `EventoTimeline` filtrado por `tarefaId`. Sem criação manual de evento
 * (`ANOTACAO`) para Tarefa nesta rodada — escopo intencionalmente restrito
 * a leitura, mesma decisão de Comentários (ver task-comments.use-cases.ts).
 */
@Injectable()
export class ListTaskTimelineUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    query: ListTaskTimelineQuery,
  ): Promise<Result<{ items: TimelineItem[]; nextCursor: string | null }>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      select: { id: true },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const cursorDate = query.cursor ? new Date(query.cursor) : null;
    const tiposFiltro = query.tipo
      ? query.tipo
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter((t): t is TipoEventoTimeline => TIPOS_VALIDOS.has(t))
      : null;

    const eventos = await this.prisma.client.eventoTimeline.findMany({
      where: {
        tarefaId,
        escritorioId,
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
