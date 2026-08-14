import { Injectable } from '@nestjs/common';
import { TaskValueSetsService } from '../task-value-sets.service';

/**
 * Expõe os Conjuntos de Valores auto-provisionados de Status/Prioridade
 * (Configuration Engine, Prompt 13) para o frontend montar colunas do
 * Kanban e opções de formulário — nunca uma lista fixa.
 */
@Injectable()
export class GetTaskConfigUseCase {
  constructor(private readonly valueSets: TaskValueSetsService) {}

  async execute(escritorioId: string) {
    const [status, prioridade] = await Promise.all([
      this.valueSets.ensureStatusValueSet(escritorioId),
      this.valueSets.ensurePrioridadeValueSet(escritorioId),
    ]);

    return {
      status: status.itens.map((i) => ({ id: i.id, valor: i.valor, ordem: i.ordem })),
      prioridade: prioridade.itens.map((i) => ({ id: i.id, valor: i.valor, ordem: i.ordem })),
    };
  }
}
