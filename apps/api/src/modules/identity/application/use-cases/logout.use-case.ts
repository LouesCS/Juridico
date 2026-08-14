import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { TokenService } from '../../../../shared/infrastructure/security/token.service';
import { SESSAO_REPOSITORY, SessaoRepository } from '../../domain/repositories/sessao.repository';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSAO_REPOSITORY) private readonly sessaoRepository: SessaoRepository,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
  ) {}

  async execute(sessionId: string): Promise<void> {
    await this.sessaoRepository.revogar(sessionId, 'LOGOUT');
    await this.redisService.revokeSession(sessionId, this.tokenService.accessTtlSeconds);
  }
}
