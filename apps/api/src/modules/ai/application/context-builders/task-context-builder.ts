import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  buildTaskScopeWhere,
  resolveTaskReadScope,
  TaskScopeActor,
} from '../../../tasks/application/task-scope';
import { AiContextResult, FonteIaDraft } from '../../domain/ai-types';
import { hashContent } from '../context-hash';

async function resolveActor(
  prisma: PrismaService,
  escritorioId: string,
  membroId: string,
): Promise<TaskScopeActor> {
  const membro = await prisma.client.membro.findFirst({
    where: { id: membroId },
    select: { equipeId: true },
  });
  const teamMemberIds = membro?.equipeId
    ? (
        await prisma.client.membro.findMany({
          where: { equipeId: membro.equipeId, escritorioId },
          select: { id: true },
        })
      ).map((m) => m.id)
    : [];
  return { membroId, teamMemberIds, equipeId: membro?.equipeId ?? null };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Reafirma docs/backend-implementation/23-task-engine.md §23.8 (IA de
 * Tarefa) — monta o contexto (campos + listas + fontes) para os 5 templates
 * `tarefa-*`. Reaproveita `task-scope.ts` (mesmos helpers de Tasks/Busca) —
 * nenhuma regra de escopo duplicada. Nunca inclui campo que o solicitante
 * não teria permissão de ver (mesma garantia de `CaseContextBuilder`/
 * `ClientContextBuilder`).
 */
@Injectable()
export class TaskContextBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(
    escritorioId: string,
    tarefaId: string,
    user: AuthUser,
  ): Promise<Result<AiContextResult>> {
    const scope = resolveTaskReadScope(user.permissions);
    if (!scope) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const actor = await resolveActor(this.prisma, escritorioId, user.membroId);

    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId, ...buildTaskScopeWhere(scope, actor) },
      include: { checklist: true, dependencias: { include: { dependeDe: true } } },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const [categoria, statusItem, prioridadeItem, responsavel, eventos] = await Promise.all([
      tarefa.categoriaId
        ? this.prisma.client.categoriaTarefa.findFirst({ where: { id: tarefa.categoriaId } })
        : null,
      tarefa.statusId
        ? this.prisma.client.conjuntoValorItem.findFirst({ where: { id: tarefa.statusId } })
        : null,
      tarefa.prioridadeId
        ? this.prisma.client.conjuntoValorItem.findFirst({ where: { id: tarefa.prioridadeId } })
        : null,
      tarefa.responsavelPrincipalId
        ? this.prisma.client.membro.findFirst({
            where: { id: tarefa.responsavelPrincipalId },
            include: { usuario: true },
          })
        : null,
      this.prisma.client.eventoTimeline.findMany({
        where: { tarefaId },
        orderBy: { dataEvento: 'desc' },
        take: 10,
      }),
    ]);

    const checklistPendente = tarefa.checklist.filter((c) => !c.concluidoEm);
    const dependenciasPendentes = tarefa.dependencias.filter((d) => !d.dependeDe.concluidaEm);

    const fontes: FonteIaDraft[] = [
      {
        sourceType: 'TAREFA',
        tarefaId: tarefa.id,
        trechoOuReferencia: `Metadados da tarefa — ${tarefa.titulo}`,
        hashFonte: hashContent({ titulo: tarefa.titulo, atualizadoEm: tarefa.atualizadoEm }),
      },
      ...eventos.map((e): FonteIaDraft => ({
        sourceType: 'EVENTO_TIMELINE',
        eventoTimelineId: e.id,
        trechoOuReferencia: e.titulo,
        hashFonte: hashContent({
          titulo: e.titulo,
          descricao: e.descricao,
          dataEvento: e.dataEvento,
        }),
      })),
    ];

    return Result.ok({
      promptContext: {
        campos: {
          Título: tarefa.titulo,
          Descrição: tarefa.descricao,
          Status: statusItem?.valor ?? null,
          Prioridade: prioridadeItem?.valor ?? null,
          Categoria: categoria?.nome ?? null,
          Responsável: responsavel?.usuario?.nome ?? null,
          'Data de vencimento': tarefa.dataVencimento ? formatDate(tarefa.dataVencimento) : null,
          Concluída: tarefa.concluidaEm ? 'Sim' : 'Não',
        },
        listas: {
          'Checklist pendente': checklistPendente.map(
            (c) => `${c.titulo}${c.obrigatorio ? ' (obrigatório)' : ''}`,
          ),
          'Dependências pendentes': dependenciasPendentes.map((d) => d.dependeDe.titulo),
          'Últimos eventos da timeline': eventos.map(
            (e) =>
              `${formatDate(e.dataEvento)} — ${e.titulo}${e.descricao ? `: ${e.descricao}` : ''}`,
          ),
        },
      },
      fontes,
    });
  }
}
