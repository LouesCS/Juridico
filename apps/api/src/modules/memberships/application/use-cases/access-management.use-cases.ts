import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { GrantAccessDto } from '../../presentation/schemas/membership.schemas';
import { assertNotLastActiveOwner } from '../guards/last-owner.guard';
import { InviteMemberUseCase } from './invite-member.use-case';
import { revokeSessionsInRedis } from './session-revocation.util';

/**
 * Concede acesso ao sistema para um colaborador cadastrado sem conta
 * (`usuarioId === null`) — reaproveita `InviteMemberUseCase` (mesmo
 * token/hash/e-mail, mesmo revogar-convite-pendente-antes-de-criar-novo)
 * passando `membroId`, exatamente como `CreateCollaboratorUseCase` faz
 * quando `comAcesso: true`.
 */
@Injectable()
export class GrantAccessUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inviteMemberUseCase: InviteMemberUseCase,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    atorMembroId: string,
    alvoMembroId: string,
    input: GrantAccessDto,
  ): Promise<Result<void>> {
    const membro = await this.prisma.client.membro.findFirst({
      where: { id: alvoMembroId, escritorioId },
    });
    if (!membro) {
      return Result.fail(new DomainError('NOT_FOUND', 'Colaborador não encontrado.'));
    }
    if (membro.usuarioId) {
      return Result.fail(
        new DomainError('ALREADY_HAS_ACCESS', 'Este colaborador já possui acesso ao sistema.'),
      );
    }

    const papel = await this.prisma.client.papel.findFirst({
      where: { id: input.papelId, OR: [{ ehSistema: true }, { escritorioId }] },
    });
    if (!papel) {
      return Result.fail(new DomainError('NOT_FOUND', 'Papel inválido para este escritório.'));
    }

    const email = input.email ?? membro.email;
    if (input.email && input.email !== membro.email) {
      await this.prisma.client.membro.update({
        where: { id: alvoMembroId },
        data: { email: input.email },
      });
    }

    // Revoga o convite PENDENTE anterior (se houver) e cria/envia o novo —
    // `InviteMemberUseCase` já faz isto por `email` (mesmo padrão do fluxo
    // tradicional) e também grava `CONVITE_ENVIADO` na Timeline por receber
    // `membroId`.
    await this.inviteMemberUseCase.execute(
      escritorioId,
      atorMembroId,
      { email, papelId: input.papelId },
      alvoMembroId,
    );

    await this.timeline.record({
      escritorioId,
      membroId: alvoMembroId,
      tipo: 'ACESSO_CONCEDIDO',
      titulo: `Acesso ao sistema concedido a ${membro.nome}`,
      autorId: atorMembroId,
    });

    return Result.ok(undefined);
  }
}

/**
 * Remove o acesso de um colaborador que já o possui — mecanismo idêntico ao
 * de `BlockMemberUseCase` no nível do banco (`Usuario.status = BLOQUEADO`),
 * mas uma ação de PRODUTO distinta (permissão própria
 * `member:manage-access` x `member:block`, tipo de Timeline próprio
 * `ACESSO_REMOVIDO` x `COLABORADOR_BLOQUEADO`) — implementada como use case
 * separado por instrução explícita, não um alias de `BlockMemberUseCase`.
 * NUNCA zera `Membro.usuarioId` — `Usuario` é uma identidade global que pode
 * ter vínculos em OUTROS escritórios.
 */
@Injectable()
export class RevokeAccessUseCase {
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
      tipo: 'ACESSO_REMOVIDO',
      titulo: `Acesso ao sistema removido de ${alvo.nome}`,
      autorId: atorMembroId,
    });

    return Result.ok(undefined);
  }
}

/**
 * "Revogar sessões" avulso (ação administrativa rápida) — diferente das
 * demais ações deste arquivo, ESTA marca `Sessao.revogadaEm` no Postgres
 * além do denylist do Redis (pedido explícito do prompt para este use
 * case). Only escopo deste escritório (`escritorioAtivoId`) — nunca revoga
 * sessões do mesmo usuário em OUTROS escritórios.
 */
@Injectable()
export class RevokeAllSessionsUseCase {
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
    });
    if (!alvo) {
      return Result.fail(new DomainError('NOT_FOUND', 'Colaborador não encontrado.'));
    }
    if (!alvo.usuarioId) {
      return Result.fail(
        new DomainError('NO_ACCESS', 'Este colaborador não possui conta de acesso ao sistema.'),
      );
    }

    const usuarioId = alvo.usuarioId;
    const sessoes = await this.prisma.client.sessao.findMany({
      where: { usuarioId, escritorioAtivoId: escritorioId, revogadaEm: null },
      select: { id: true },
    });

    if (sessoes.length) {
      await revokeSessionsInRedis(
        this.redisService,
        sessoes.map((s) => s.id),
      );
      await this.prisma.client.sessao.updateMany({
        where: { id: { in: sessoes.map((s) => s.id) } },
        data: { revogadaEm: new Date(), motivoRevogacao: 'ADMIN' },
      });
    }

    await this.timeline.record({
      escritorioId,
      membroId: alvoMembroId,
      tipo: 'SESSOES_REVOGADAS',
      titulo: `Sessões de ${alvo.nome} foram revogadas`,
      autorId: atorMembroId,
    });

    return Result.ok(undefined);
  }
}
