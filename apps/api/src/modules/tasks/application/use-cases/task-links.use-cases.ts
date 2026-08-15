import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { AddTaskLinkDto } from '../../presentation/schemas/task.schemas';

/**
 * "Vínculos" (Prompt 14) — `Cliente`/`Processo`/`Documento` são validados
 * de verdade (módulos reais); `Contrato`/`Serviço`/`Financeiro`/
 * `Publicação`/`Pedido`/`Registro de Trabalho` ficam catálogo-pronto (o
 * vínculo é aceito, mas não há módulo de negócio para validar a
 * existência do recurso ainda — mesmo tratamento de `financeiro:*` no
 * Prompt 12).
 */
export const RECURSOS_VALIDAVEIS: Record<
  string,
  (prisma: PrismaService, escritorioId: string, id: string) => Promise<boolean>
> = {
  CLIENTE: async (prisma, escritorioId, id) =>
    !!(await prisma.client.cliente.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    })),
  PROCESSO: async (prisma, escritorioId, id) =>
    !!(await prisma.client.processo.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    })),
  DOCUMENTO: async (prisma, escritorioId, id) =>
    !!(await prisma.client.documento.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    })),
  PASTA_JURIDICA: async (prisma, escritorioId, id) =>
    !!(await prisma.client.pastaJuridica.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    })),
  PUBLICACAO: async (prisma, escritorioId, id) =>
    !!(await prisma.client.publicacaoJudicialCapturada.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    })),
  MOVIMENTACAO_EXTRAJUDICIAL: async (prisma, escritorioId, id) =>
    !!(await prisma.client.movimentacaoExtrajudicial.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    })),
  MOVIMENTACAO_JUDICIAL: async (prisma, escritorioId, id) =>
    !!(await prisma.client.movimentoJudicialCapturado.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    })),
};

@Injectable()
export class AddTaskLinkUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    dto: AddTaskLinkDto,
  ): Promise<Result<{ id: string }>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      select: { id: true },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const validar = RECURSOS_VALIDAVEIS[dto.tipoRecurso];
    if (validar) {
      const existe = await validar(this.prisma, escritorioId, dto.recursoId);
      if (!existe)
        return Result.fail(new DomainError('NOT_FOUND', 'Recurso vinculado não encontrado.'));
    }

    const vinculo = await this.prisma.client.tarefaVinculo.create({
      data: { tarefaId, tipoRecurso: dto.tipoRecurso, recursoId: dto.recursoId },
      select: { id: true },
    });
    return Result.ok(vinculo);
  }
}

@Injectable()
export class RemoveTaskLinkUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, tarefaId: string, vinculoId: string): Promise<Result<void>> {
    const vinculo = await this.prisma.client.tarefaVinculo.findFirst({
      where: { id: vinculoId, tarefaId, tarefa: { escritorioId } },
      select: { id: true },
    });
    if (!vinculo) return Result.fail(new DomainError('NOT_FOUND', 'Vínculo não encontrado.'));

    await this.prisma.client.tarefaVinculo.delete({ where: { id: vinculoId } });
    return Result.ok(undefined);
  }
}
