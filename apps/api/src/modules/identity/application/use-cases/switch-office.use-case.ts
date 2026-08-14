import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { hashToken } from '../../../../shared/infrastructure/security/hash-token.util';
import { TokenService } from '../../../../shared/infrastructure/security/token.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { PermissionResolverService } from '../../../../shared/authorization/permission-resolver.service';
import { SESSAO_REPOSITORY, SessaoRepository } from '../../domain/repositories/sessao.repository';
import { RefreshOutput } from './refresh-token.use-case';

/**
 * Reafirma docs/api/04-identity.md §4.7 — o token anterior é invalidado
 * (não apenas substituído), reafirma
 * docs/database/01-estrategia-multitenancy.md §1.9.
 */
@Injectable()
export class SwitchOfficeUseCase {
  constructor(
    @Inject(SESSAO_REPOSITORY) private readonly sessaoRepository: SessaoRepository,
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async execute(
    usuarioId: string,
    sessaoAtualId: string,
    escritorioId: string,
  ): Promise<Result<RefreshOutput>> {
    const membros = await this.prisma.listarMembrosAtivosDoUsuario(usuarioId);
    const membroAlvo = membros.find((m) => m.escritorioId === escritorioId);
    if (!membroAlvo) {
      return Result.fail(new DomainError('FORBIDDEN', 'Você não pertence a este escritório.'));
    }

    const sessaoAtual = await this.sessaoRepository.buscarPorId(sessaoAtualId);
    const familiaId = sessaoAtual?.familiaId ?? randomUUID();

    const novaSessao = await this.sessaoRepository.criar({
      usuarioId,
      escritorioAtivoId: escritorioId,
      familiaId,
      refreshTokenHash: '',
      expiraEm: new Date(Date.now() + this.tokenService.refreshTtlSeconds(false) * 1000),
    });

    const refreshToken = this.tokenService.signRefreshToken(
      { sub: usuarioId, sessionId: novaSessao.id, familyId: familiaId },
      false,
    );
    await this.prisma.client.sessao.update({
      where: { id: novaSessao.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    await this.sessaoRepository.revogar(sessaoAtualId, 'LOGOUT');

    // Mesmo bug corrigido em `RefreshTokenUseCase` — reaproveita
    // `PermissionResolverService` (Permission Engine, Prompt 12) em vez de
    // reaplicar só as permissões do papel, sem overrides.
    const permissions = await this.permissionResolver.resolveEffectivePermissions(
      membroAlvo.id,
      membroAlvo.papelId,
    );

    const accessToken = this.tokenService.signAccessToken({
      sub: usuarioId,
      tenantId: escritorioId,
      membroId: membroAlvo.id,
      roles: [membroAlvo.papel.nome],
      permissions,
      sessionId: novaSessao.id,
    });

    return Result.ok({
      accessToken,
      refreshToken,
      accessTtlSeconds: this.tokenService.accessTtlSeconds,
      refreshTtlSeconds: this.tokenService.refreshTtlSeconds(false),
    });
  }
}
