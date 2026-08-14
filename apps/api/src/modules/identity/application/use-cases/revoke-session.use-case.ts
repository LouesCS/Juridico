import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { TokenService } from '../../../../shared/infrastructure/security/token.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { SESSAO_REPOSITORY, SessaoRepository } from '../../domain/repositories/sessao.repository';

/**
 * Ownership estrito — reafirma docs/api/04-identity.md §4.11: usuário só
 * revoga a própria sessão, nunca a de outro (isso é `member:remove`, em
 * Memberships).
 */
@Injectable()
export class RevokeSessionUseCase {
  constructor(
    @Inject(SESSAO_REPOSITORY) private readonly sessaoRepository: SessaoRepository,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
  ) {}

  async execute(usuarioId: string, sessaoId: string): Promise<Result<void>> {
    const sessao = await this.sessaoRepository.buscarPorId(sessaoId);
    if (!sessao || sessao.usuarioId !== usuarioId) {
      return Result.fail(new DomainError('NOT_FOUND', 'Sessão não encontrada.'));
    }

    await this.sessaoRepository.revogar(sessaoId, 'ADMIN');
    await this.redisService.revokeSession(sessaoId, this.tokenService.accessTtlSeconds);
    return Result.ok(undefined);
  }

  async executeAllExceptCurrent(usuarioId: string, sessaoAtualId: string): Promise<void> {
    await this.sessaoRepository.revogarTodasDoUsuario(usuarioId, sessaoAtualId, 'ADMIN');
  }
}
