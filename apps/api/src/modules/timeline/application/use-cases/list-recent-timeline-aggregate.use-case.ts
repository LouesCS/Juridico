import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
} from '../../../legal-cases/application/case-scope';

/**
 * Reafirma Sprint 08 — sustenta os widgets "Últimas atividades" e "Timeline
 * resumida" do Dashboard sem exigir N chamadas (uma por processo). Mesmo
 * racional de `list-deadlines-aggregate.use-case.ts`: agrega através dos
 * processos visíveis ao usuário (escopo `assigned/team/all` + segredo de
 * justiça), nunca pós-processado. Reaproveita os helpers puros de
 * `case-scope.ts` (sem acoplar via DI — são funções, não providers).
 */
@Injectable()
export class ListRecentTimelineAggregateUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, user: AuthUser, limit: number) {
    const scope = resolveCaseReadScope(user.permissions);
    if (!scope) return [];

    const membro = await this.prisma.client.membro.findFirst({
      where: { id: user.membroId },
      select: { equipeId: true },
    });
    const teamMemberIds = membro?.equipeId
      ? (
          await this.prisma.client.membro.findMany({
            where: { equipeId: membro.equipeId, escritorioId },
            select: { id: true },
          })
        ).map((m) => m.id)
      : [];

    const processoWhere = {
      ...buildCaseScopeWhere(scope, { membroId: user.membroId, teamMemberIds }),
      ...applyConfidentialityFilter(user.permissions),
    };

    const processosVisiveis = await this.prisma.client.processo.findMany({
      where: { escritorioId, ...processoWhere },
      select: { id: true },
    });
    const processoIds = processosVisiveis.map((p) => p.id);
    if (processoIds.length === 0) return [];

    const eventos = await this.prisma.client.eventoTimeline.findMany({
      where: { escritorioId, processoId: { in: processoIds } },
      orderBy: { dataEvento: 'desc' },
      take: limit,
      include: { processo: { select: { id: true, titulo: true } } },
    });

    const autorIds = [...new Set(eventos.map((e) => e.autorId).filter((id): id is string => !!id))];
    const autores = autorIds.length
      ? await this.prisma.client.membro.findMany({
          where: { id: { in: autorIds } },
          include: { usuario: true },
        })
      : [];
    const autorPorId = new Map(autores.map((a) => [a.id, a]));

    return eventos.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      titulo: e.titulo,
      dataEvento: e.dataEvento,
      // `where.processoId: { in: processoIds }` garante que só vêm eventos
      // com processo associado — `processoId` virou nullable no schema no
      // Prompt 14 (Task Engine) para acomodar eventos de Tarefa.
      processo: { id: e.processo!.id, titulo: e.processo!.titulo },
      autor:
        e.autorId && autorPorId.has(e.autorId)
          ? { nome: autorPorId.get(e.autorId)!.usuario?.nome }
          : null,
    }));
  }
}
