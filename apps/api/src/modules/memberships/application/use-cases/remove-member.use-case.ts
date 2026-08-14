import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { assertNotLastActiveOwner } from '../guards/last-owner.guard';

/**
 * Reafirma docs/database/12-eventos-fluxos-regras.md §12.3.11 — desativação
 * (soft), nunca exclusão física; revoga todas as sessões do membro.
 *
 * PENDÊNCIA REGISTRADA (docs/backend-implementation/00-status.md): a
 * checagem "todos os processos onde é responsável têm novo responsável
 * antes de concluir" depende do módulo LegalCases, não implementado nesta
 * rodada — quando existir, este use case deve consultá-lo antes de
 * desativar. Por ora, a proteção do último OWNER (que não depende de
 * LegalCases) já está implementada e é a regra mais crítica de segurança
 * deste módulo.
 */
@Injectable()
export class RemoveMemberUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async execute(
    escritorioId: string,
    atorMembroId: string,
    alvoMembroId: string,
  ): Promise<Result<void>> {
    const alvo = await this.prisma.client.membro.findFirst({
      where: { id: alvoMembroId, escritorioId },
      include: { papel: true },
    });
    if (!alvo) {
      return Result.fail(new DomainError('NOT_FOUND', 'Membro não encontrado.'));
    }

    const erroUltimoOwner = await assertNotLastActiveOwner(
      this.prisma,
      escritorioId,
      alvoMembroId,
      alvo.papel.nome,
    );
    if (erroUltimoOwner) return Result.fail(erroUltimoOwner);

    const sessoesAfetadas = await this.prisma.client.$transaction(async (tx) => {
      await tx.membro.update({
        where: { id: alvoMembroId },
        data: { status: 'INATIVO', desativadoEm: new Date(), desativadoPorId: atorMembroId },
      });
      const membroCompleto = await tx.membro.findFirst({ where: { id: alvoMembroId } });
      // Módulo Colaboradores: `usuarioId` pode ser `null` (colaborador
      // desativado que nunca teve conta de acesso) — nada a revogar nesse
      // caso, reafirma a mesma checagem já feita em
      // `SuspendMemberUseCase`.
      if (!membroCompleto!.usuarioId) return [];
      return tx.sessao.findMany({
        where: {
          usuarioId: membroCompleto!.usuarioId,
          escritorioAtivoId: escritorioId,
          revogadaEm: null,
        },
        select: { id: true },
      });
    });

    for (const sessao of sessoesAfetadas) {
      await this.redisService.revokeSession(sessao.id, 60 * 60 * 24);
    }

    return Result.ok(undefined);
  }
}
