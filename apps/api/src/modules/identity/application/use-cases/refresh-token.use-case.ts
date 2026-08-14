import { Inject, Injectable } from '@nestjs/common';
import { hashToken } from '../../../../shared/infrastructure/security/hash-token.util';
import { TokenService } from '../../../../shared/infrastructure/security/token.service';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { PermissionResolverService } from '../../../../shared/authorization/permission-resolver.service';
import { SESSAO_REPOSITORY, SessaoRepository } from '../../domain/repositories/sessao.repository';

export interface RefreshOutput {
  accessToken: string;
  refreshToken: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

/**
 * Reafirma docs/api/02-autenticacao.md §2.3 — rotação com detecção de
 * reuso. Refresh já usado reapresentado revoga toda a `familiaId` e emite
 * alerta de segurança (a emissão do alerta em si fica para o módulo
 * Notifications, fora do escopo desta rodada — pendência registrada).
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(SESSAO_REPOSITORY) private readonly sessaoRepository: SessaoRepository,
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async execute(refreshToken: string): Promise<Result<RefreshOutput>> {
    let claims;
    try {
      claims = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      return Result.fail(new DomainError('SESSION_REVOKED', 'Sessão inválida ou expirada.'));
    }

    const sessao = await this.sessaoRepository.buscarPorId(claims.sessionId);
    if (!sessao) {
      return Result.fail(new DomainError('SESSION_REVOKED', 'Sessão inválida ou expirada.'));
    }

    const tokenHashRecebido = hashToken(refreshToken);

    if (sessao.revogadaEm || sessao.refreshTokenHash !== tokenHashRecebido) {
      // Reuso detectado (token já rotacionado sendo reapresentado) — revoga
      // toda a família e força re-autenticação completa.
      await this.sessaoRepository.revogarFamilia(sessao.familiaId, 'REUSO_DETECTADO');
      await this.redisService.revokeSession(sessao.id, this.tokenService.accessTtlSeconds);
      return Result.fail(
        new DomainError('SESSION_REVOKED', 'Sessão revogada por segurança.', {
          motivo: 'REUSO_DETECTADO',
        }),
      );
    }

    if (sessao.expiraEm < new Date()) {
      return Result.fail(new DomainError('SESSION_REVOKED', 'Sessão expirada.'));
    }

    const membros = await this.prisma.listarMembrosAtivosDoUsuario(sessao.usuarioId);
    const membroAtivo = membros.find((m) => m.escritorioId === sessao.escritorioAtivoId);
    if (!membroAtivo) {
      return Result.fail(
        new DomainError('FORBIDDEN', 'Vínculo com o escritório não está mais ativo.'),
      );
    }

    // Cria a nova sessão ANTES de assinar os tokens — o `sessionId` embutido
    // em ambos precisa ser o da sessão nova, nunca o da sessão antiga que
    // está sendo rotacionada/revogada.
    const novaSessao = await this.sessaoRepository.criar({
      usuarioId: sessao.usuarioId,
      escritorioAtivoId: sessao.escritorioAtivoId,
      familiaId: sessao.familiaId,
      refreshTokenHash: '', // placeholder — atualizado abaixo após assinar o token com o id definitivo
      expiraEm: sessao.expiraEm,
    });

    const novoRefreshToken = this.tokenService.signRefreshToken(
      { sub: sessao.usuarioId, sessionId: novaSessao.id, familyId: sessao.familiaId },
      false,
    );
    await this.prisma.client.sessao.update({
      where: { id: novaSessao.id },
      data: { refreshTokenHash: hashToken(novoRefreshToken) },
    });

    await this.sessaoRepository.revogar(sessao.id, 'EXPIRACAO');

    // Reafirma o Permission Engine (Prompt 12) — antes, refresh só
    // reaplicava as permissões do papel, sem os overrides de
    // `PermissaoUsuario` que `LoginUseCase` já aplicava; uma permissão
    // revogada individualmente só "pegava" no próximo login completo.
    // Corrigido reaproveitando `PermissionResolverService`.
    const permissions = await this.permissionResolver.resolveEffectivePermissions(
      membroAtivo.id,
      membroAtivo.papelId,
    );

    const accessToken = this.tokenService.signAccessToken({
      sub: sessao.usuarioId,
      tenantId: sessao.escritorioAtivoId,
      membroId: membroAtivo.id,
      roles: [membroAtivo.papel.nome],
      permissions,
      sessionId: novaSessao.id,
    });

    return Result.ok({
      accessToken,
      refreshToken: novoRefreshToken,
      accessTtlSeconds: this.tokenService.accessTtlSeconds,
      refreshTtlSeconds: this.tokenService.refreshTtlSeconds(false),
    });
  }
}
