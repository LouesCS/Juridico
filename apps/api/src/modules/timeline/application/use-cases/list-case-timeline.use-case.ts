import { Injectable } from '@nestjs/common';
import { TipoEventoTimeline } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineItem } from '../../domain/timeline-item';
import { ListCaseTimelineQuery } from '../../presentation/schemas/timeline.schemas';

const TIPOS_VALIDOS = new Set<string>(Object.values(TipoEventoTimeline));

/**
 * Reafirma docs/api/11-timeline.md §11.1 — mescla `EventoTimeline` real com
 * a projeção de `Prazo` (tipo `PRAZO`), ordenado por `dataEvento` desc.
 * Paginação por cursor de data (ISO de `dataEvento` do último item da
 * página anterior) — mais simples que cursor por id porque a página é um
 * merge de duas tabelas com namespaces de id diferentes; limitação
 * conhecida e aceita: dois eventos com o exact mesmo timestamp na fronteira
 * da página podem, em tese, repetir/pular um item (ver
 * docs/backend-implementation/19-decisions.md).
 */
@Injectable()
export class ListCaseTimelineUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    query: ListCaseTimelineQuery,
  ): Promise<Result<{ items: TimelineItem[]; nextCursor: string | null }>> {
    const processo = await this.prisma.client.processo.findFirst({
      where: { id: processoId, escritorioId },
      select: { id: true },
    });
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const tiposFiltro = query.tipo
      ? query.tipo.split(',').map((t) => t.trim().toUpperCase())
      : null;
    const incluirPrazo = !tiposFiltro || tiposFiltro.includes('PRAZO');
    const tiposEvento = tiposFiltro
      ? tiposFiltro.filter((t): t is TipoEventoTimeline => t !== 'PRAZO' && TIPOS_VALIDOS.has(t))
      : null;
    const somenteEventoTimeline =
      tiposFiltro !== null && tiposEvento?.length === 0 && !incluirPrazo;

    const cursorDate = query.cursor ? new Date(query.cursor) : null;

    const eventos =
      somenteEventoTimeline && !tiposEvento?.length
        ? []
        : await this.prisma.client.eventoTimeline.findMany({
            where: {
              processoId,
              escritorioId,
              ...(tiposEvento ? { tipo: { in: tiposEvento } } : {}),
              ...(query.origem ? { origem: query.origem } : {}),
              ...(cursorDate ? { dataEvento: { lt: cursorDate } } : {}),
              ...(query.dataEventoGte || query.dataEventoLte
                ? {
                    dataEvento: {
                      ...(cursorDate ? { lt: cursorDate } : {}),
                      ...(query.dataEventoGte ? { gte: new Date(query.dataEventoGte) } : {}),
                      ...(query.dataEventoLte ? { lte: new Date(query.dataEventoLte) } : {}),
                    },
                  }
                : {}),
              ...(query.autorId ? { autorId: query.autorId } : {}),
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

    const prazos =
      !incluirPrazo || query.origem
        ? []
        : await this.prisma.client.prazo.findMany({
            where: {
              processoId,
              escritorioId,
              ...(cursorDate ? { dataVencimento: { lt: cursorDate } } : {}),
              ...(query.dataEventoGte || query.dataEventoLte
                ? {
                    dataVencimento: {
                      ...(cursorDate ? { lt: cursorDate } : {}),
                      ...(query.dataEventoGte ? { gte: new Date(query.dataEventoGte) } : {}),
                      ...(query.dataEventoLte ? { lte: new Date(query.dataEventoLte) } : {}),
                    },
                  }
                : {}),
              ...(query.autorId ? { responsavelId: query.autorId } : {}),
              ...(query.q ? { titulo: { contains: query.q, mode: 'insensitive' } } : {}),
            },
            orderBy: { dataVencimento: 'desc' },
            take: query.limit + 1,
          });

    const autorIds = [
      ...new Set([
        ...eventos.map((e) => e.autorId).filter((id): id is string => !!id),
        ...prazos.map((p) => p.responsavelId),
      ]),
    ];
    const autores = autorIds.length
      ? await this.prisma.client.membro.findMany({
          where: { id: { in: autorIds } },
          include: { usuario: true },
        })
      : [];
    const autorPorId = new Map(autores.map((a) => [a.id, a]));

    const itensEvento: TimelineItem[] = eventos.map((e) => ({
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
      editavel: e.origem === 'MANUAL',
    }));

    const itensPrazo: TimelineItem[] = prazos.map((p) => ({
      id: `prazo-${p.id}`,
      tipo: 'PRAZO',
      titulo: p.status === 'CONCLUIDO' ? `Prazo concluído: ${p.titulo}` : `Prazo: ${p.titulo}`,
      descricao: p.descricao,
      dataEvento: p.dataVencimento,
      origem: 'SISTEMA',
      autor: autorPorId.has(p.responsavelId)
        ? {
            id: p.responsavelId,
            nome:
              autorPorId.get(p.responsavelId)!.usuario?.nome ??
              autorPorId.get(p.responsavelId)!.nome,
          }
        : null,
      entidadeRelacionada: { tipo: 'prazo', id: p.id },
      fixado: false,
      editavel: false,
    }));

    const poolSize = itensEvento.length + itensPrazo.length;
    const merged = [...itensEvento, ...itensPrazo]
      .sort((a, b) => b.dataEvento.getTime() - a.dataEvento.getTime())
      .slice(0, query.limit);

    const hasMore = poolSize > merged.length;

    return Result.ok({
      items: merged,
      nextCursor:
        hasMore && merged.length > 0 ? merged[merged.length - 1].dataEvento.toISOString() : null,
    });
  }
}
