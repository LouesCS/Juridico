import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { TASK_KANBAN_STATUSES, toTaskKanbanStatus } from './task-status';
import type { TaskKanbanStatus } from './task-status';

const STATUS_VALUE_SET_NOME = 'Status de Tarefa';
const PRIORIDADE_VALUE_SET_NOME = 'Prioridade de Tarefa';

/**
 * "Status" e "Prioridade" de Tarefa NUNCA são enum fixo (Prompt 14) — são
 * itens de `ConjuntoValores`/`ConjuntoValorItem`, o mesmo mecanismo do
 * Configuration Engine (Prompt 13), auto-provisionados na primeira vez que
 * o escritório usa o Task Engine. Depois de criado, o conjunto é
 * administrável pela tela já existente `/configuracoes/conjuntos-valores`
 * — nenhuma UI nova para gerenciar isso.
 */
@Injectable()
export class TaskValueSetsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureStatusValueSet(escritorioId: string) {
    const conjunto = await this.ensureValueSet(escritorioId, STATUS_VALUE_SET_NOME, [
      ...TASK_KANBAN_STATUSES,
    ]);
    const canonicalItems = new Map<string, (typeof conjunto.itens)[number]>();

    for (const item of conjunto.itens) {
      const macro = toTaskKanbanStatus(item.valor);
      if (macro && !canonicalItems.has(macro)) canonicalItems.set(macro, item);
    }

    // Escritórios antigos são consolidados sem excluir itens: tarefas passam a
    // apontar para o item canônico e os aliases ficam inativos para auditoria.
    for (const [ordem, valor] of TASK_KANBAN_STATUSES.entries()) {
      let canonical = canonicalItems.get(valor);
      if (!canonical) {
        canonical = await this.prisma.client.conjuntoValorItem.create({
          data: { conjuntoId: conjunto.id, valor, ordem, ativo: true },
        });
        canonicalItems.set(valor, canonical);
      } else if (canonical.valor !== valor || canonical.ordem !== ordem || !canonical.ativo) {
        canonical = await this.prisma.client.conjuntoValorItem.update({
          where: { id: canonical.id },
          data: { valor, ordem, ativo: true },
        });
        canonicalItems.set(valor, canonical);
      }

      const aliases = conjunto.itens.filter(
        (item) => item.id !== canonical!.id && toTaskKanbanStatus(item.valor) === valor,
      );
      for (const alias of aliases) {
        await this.prisma.client.tarefa.updateMany({
          where: { escritorioId, statusId: alias.id },
          data: { statusId: canonical.id },
        });
        await this.prisma.client.conjuntoValorItem.update({
          where: { id: alias.id },
          data: { ativo: false },
        });
      }
    }

    return {
      ...conjunto,
      itens: TASK_KANBAN_STATUSES.map((status) => canonicalItems.get(status)!),
    };
  }

  async ensurePrioridadeValueSet(escritorioId: string) {
    return this.ensureValueSet(escritorioId, PRIORIDADE_VALUE_SET_NOME, [
      'Baixa',
      'Média',
      'Alta',
      'Crítica',
    ]);
  }

  async getKanbanStatusId(escritorioId: string, status: TaskKanbanStatus) {
    const conjunto = await this.ensureStatusValueSet(escritorioId);
    return conjunto.itens.find((item) => item.valor === status)!.id;
  }

  private async ensureValueSet(escritorioId: string, nome: string, defaults: string[]) {
    const existente = await this.prisma.client.conjuntoValores.findFirst({
      where: { escritorioId, nome },
      include: { itens: { orderBy: { ordem: 'asc' } } },
    });
    if (existente) return existente;

    return this.prisma.client.conjuntoValores.create({
      data: {
        escritorioId,
        nome,
        descricao: 'Criado automaticamente pelo Task Engine.',
        itens: { create: defaults.map((valor, ordem) => ({ valor, ordem })) },
      },
      include: { itens: { orderBy: { ordem: 'asc' } } },
    });
  }
}
