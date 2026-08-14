import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { assertNotLastActiveOwner } from '../guards/last-owner.guard';
import { revokeSessionsInRedis } from './session-revocation.util';

/**
 * Bloquear/desbloquear o ACESSO de um colaborador (`Usuario.status`), não o
 * cadastro do colaborador em si (`Membro.status`, ver
 * `suspend-member.use-cases.ts`). Só se aplica a quem já tem
 * `usuarioId` — reafirma a distinção "Sem acesso" (nunca teve conta) x
 * "Bloqueado" (tem conta, acesso suspenso) do módulo Colaboradores.
 */
@Injectable()
export class BlockMemberUseCase {
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
    if (!alvo.usuarioId) {
      return Result.fail(
        new DomainError('NO_ACCESS', 'Este colaborador não possui conta de acesso ao sistema.'),
      );
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
      await tx.usuario.update({ where: { id: usuarioId }, data: { status: 'BLOQUEADO' } });
      return tx.sessao.findMany({
        where: { usuarioId, escritorioAtivoId: escritorioId, revogadaEm: null },
        select: { id: true },
      });
    });
    await revokeSessionsInRedis(
      this.redisService,
      sessoes.map((s) => s.id),
    );

    await this.timeline.record({
      escritorioId,
      membroId: alvoMembroId,
      tipo: 'COLABORADOR_BLOQUEADO',
      titulo: `Acesso de ${alvo.nome} foi bloqueado`,
      autorId: atorMembroId,
    });

    return Result.ok(undefined);
  }
}

@Injectable()
export class UnblockMemberUseCase {
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
    if (!alvo.usuarioId) {
      return Result.fail(
        new DomainError('NO_ACCESS', 'Este colaborador não possui conta de acesso ao sistema.'),
      );
    }

    await this.prisma.client.usuario.update({
      where: { id: alvo.usuarioId },
      data: { status: 'ATIVO' },
    });

    await this.timeline.record({
      escritorioId,
      membroId: alvoMembroId,
      tipo: 'COLABORADOR_DESBLOQUEADO',
      titulo: `Acesso de ${alvo.nome} foi desbloqueado`,
      autorId: atorMembroId,
    });

    return Result.ok(undefined);
  }
}
