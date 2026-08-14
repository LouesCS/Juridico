import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';

/** Reafirma docs/backend-implementation/23-task-engine.md §23.3 (`TarefaDetalheDTO`). */
@Injectable()
export class GetTaskUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, tarefaId: string, membroId: string) {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      include: {
        checklist: { orderBy: { ordem: 'asc' } },
        responsaveisAuxiliares: true,
        vinculos: true,
        dependencias: {
          include: { dependeDe: { select: { id: true, titulo: true, concluidaEm: true } } },
        },
        bloqueando: {
          include: { tarefa: { select: { id: true, titulo: true, concluidaEm: true } } },
        },
        favoritos: { where: { membroId } },
      },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const [categoria, statusItem, prioridadeItem, responsavel, auxiliares] = await Promise.all([
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
      tarefa.responsaveisAuxiliares.length > 0
        ? this.prisma.client.membro.findMany({
            where: { id: { in: tarefa.responsaveisAuxiliares.map((r) => r.membroId) } },
            include: { usuario: true },
          })
        : [],
    ]);

    return Result.ok({
      id: tarefa.id,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      categoria: categoria ? { id: categoria.id, nome: categoria.nome, cor: categoria.cor } : null,
      status: statusItem ? { id: statusItem.id, valor: statusItem.valor } : null,
      prioridade: prioridadeItem ? { id: prioridadeItem.id, valor: prioridadeItem.valor } : null,
      responsavel: responsavel
        ? {
            id: responsavel.id,
            nome: responsavel.usuario?.nome,
            avatarUrl: responsavel.usuario?.avatarUrl,
          }
        : null,
      responsaveisAuxiliares: auxiliares.map((m) => ({
        id: m.id,
        nome: m.usuario?.nome,
        avatarUrl: m.usuario?.avatarUrl,
      })),
      equipeId: tarefa.equipeId,
      grupoColaboradoresId: tarefa.grupoColaboradoresId,
      dataInicio: tarefa.dataInicio,
      dataVencimento: tarefa.dataVencimento,
      concluidaEm: tarefa.concluidaEm,
      canceladaEm: tarefa.canceladaEm,
      motivoCancelamento: tarefa.motivoCancelamento,
      arquivadaEm: tarefa.arquivadaEm,
      recorrenciaId: tarefa.recorrenciaId,
      tarefaOrigemId: tarefa.tarefaOrigemId,
      checklist: tarefa.checklist.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        obrigatorio: c.obrigatorio,
        ordem: c.ordem,
        concluidoEm: c.concluidoEm,
      })),
      vinculos: tarefa.vinculos.map((v) => ({
        id: v.id,
        tipoRecurso: v.tipoRecurso,
        recursoId: v.recursoId,
      })),
      dependencias: tarefa.dependencias.map((d) => d.dependeDe),
      bloqueando: tarefa.bloqueando.map((b) => b.tarefa),
      favorita: tarefa.favoritos.length > 0,
      criadoPorId: tarefa.criadoPorId,
      criadoEm: tarefa.criadoEm,
      atualizadoEm: tarefa.atualizadoEm,
    });
  }
}
