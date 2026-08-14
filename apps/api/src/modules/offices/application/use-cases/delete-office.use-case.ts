import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { DomainError, Result } from '../../../../shared/domain/result';

/**
 * Reafirma docs/api/05-offices.md §5.3 e
 * docs/database/10-soft-delete-retencao-lgpd.md §10.11 — encerramento é
 * soft delete + revogação imediata de todas as sessões de todos os membros,
 * exclusivo de OWNER (garantido pelo PermissionGuard na rota).
 */
@Injectable()
export class DeleteOfficeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async execute(escritorioId: string, confirmacaoNome: string): Promise<Result<void>> {
    const escritorio = await this.prisma.client.escritorio.findFirst({
      where: { id: escritorioId },
    });
    if (!escritorio) {
      return Result.fail(new DomainError('NOT_FOUND', 'Escritório não encontrado.'));
    }
    if (escritorio.nomeFantasia !== confirmacaoNome) {
      return Result.fail(
        new DomainError(
          'MALFORMED_REQUEST',
          'O nome de confirmação não corresponde ao nome do escritório.',
        ),
      );
    }

    const sessoesAfetadas = await this.prisma.client.$transaction(async (tx) => {
      await tx.escritorio.update({
        where: { id: escritorioId },
        data: { status: 'CANCELADO', excluidoEm: new Date() },
      });
      const sessoes = await tx.sessao.findMany({
        where: { escritorioAtivoId: escritorioId, revogadaEm: null },
        select: { id: true },
      });
      await tx.sessao.updateMany({
        where: { escritorioAtivoId: escritorioId, revogadaEm: null },
        data: { revogadaEm: new Date(), motivoRevogacao: 'ADMIN' },
      });
      return sessoes;
    });

    await Promise.all(
      sessoesAfetadas.map((s) => this.redisService.revokeSession(s.id, 60 * 60 * 24)),
    );

    return Result.ok(undefined);
  }
}
