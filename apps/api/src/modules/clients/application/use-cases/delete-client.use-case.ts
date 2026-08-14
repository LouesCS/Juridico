import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';

/** Reafirma docs/api/08-clients.md §8.5 — `RESTRICT` físico contra `Processo`. */
@Injectable()
export class DeleteClientUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, clienteId: string): Promise<Result<void>> {
    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, escritorioId },
      select: { id: true },
    });
    if (!cliente) {
      return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));
    }

    const processosAtivos = await this.prisma.client.processo.count({
      where: { clienteId },
    });
    if (processosAtivos > 0) {
      return Result.fail(
        new DomainError(
          'HAS_ACTIVE_LEGAL_CASES',
          'Este cliente possui processos vinculados e não pode ser excluído.',
        ),
      );
    }

    await this.prisma.client.cliente.update({
      where: { id: clienteId },
      data: { excluidoEm: new Date() },
    });

    return Result.ok(undefined);
  }
}
