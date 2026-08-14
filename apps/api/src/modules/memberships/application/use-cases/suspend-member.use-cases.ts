import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { assertNotLastActiveOwner } from '../guards/last-owner.guard';
import { revokeSessionsInRedis } from './session-revocation.util';

/**
 * Suspender/reativar o CADASTRO do colaborador (`Membro.status`), distinto
 * de bloquear o ACESSO (`Usuario.status`, `block-member.use-cases.ts`) —
 * `Membro.status = SUSPENSO` já existia no schema mas nunca era usado por
 * nenhum use case até este módulo. Aplica-se independentemente de o
 * colaborador ter ou não conta de acesso (diferente de bloquear, que exige
 * `usuarioId`); quando existe conta, a suspensão também revoga as sessões
 * ativas dela neste escritório (mesma técnica de `BlockMemberUseCase`).
 */
@Injectable()
export class SuspendMemberUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly timeline: TimelineRecorderService,
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
      return Result.fail(new DomainError('NOT_FOUND', 'Colaborador não encontrado.'));
    }

    const erroUltimoOwner = await assertNotLastActiveOwner(
      this.prisma,
      escritorioId,
      alvoMembroId,
      alvo.papel.nome,
    );
    if (erroUltimoOwner) return Result.fail(erroUltimoOwner);

    const usuarioId = alvo.usuarioId;
    const sessoes = await this.prisma.client.$transaction(async (tx) => {
      await tx.membro.update({ where: { id: alvoMembroId }, data: { status: 'SUSPENSO' } });
      if (!usuarioId) return [];
      return tx.sessao.findMany({
        where: { usuarioId, escritorioAtivoId: escritorioId, revogadaEm: null },
        select: { id: true },
      });
    });
    if (sessoes.length) {
      await revokeSessionsInRedis(
        this.redisService,
        sessoes.map((s) => s.id),
      );
    }

    await this.timeline.record({
      escritorioId,
      membroId: alvoMembroId,
      tipo: 'COLABORADOR_SUSPENSO',
      titulo: `Colaborador ${alvo.nome} foi suspenso`,
      autorId: atorMembroId,
    });

    return Result.ok(undefined);
  }
}

@Injectable()
export class UnsuspendMemberUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    atorMembroId: string,
    alvoMembroId: string,
  ): Promise<Result<void>> {
    const alvo = await this.prisma.client.membro.findFirst({
      where: { id: alvoMembroId, escritorioId },
    });
    if (!alvo) {
      return Result.fail(new DomainError('NOT_FOUND', 'Colaborador não encontrado.'));
    }
    if (alvo.status !== 'SUSPENSO') {
      return Result.fail(new DomainError('NOT_SUSPENDED', 'Este colaborador não está suspenso.'));
    }

    await this.prisma.client.membro.update({
      where: { id: alvoMembroId },
      data: { status: 'ATIVO' },
    });

    await this.timeline.record({
      escritorioId,
      membroId: alvoMembroId,
      tipo: 'COLABORADOR_REATIVADO',
      titulo: `Colaborador ${alvo.nome} foi reativado`,
      autorId: atorMembroId,
    });

    return Result.ok(undefined);
  }
}
