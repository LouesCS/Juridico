import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RedisService } from '../../shared/infrastructure/cache/redis.service';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

/**
 * Reafirma docs/backend/10-observabilidade.md §10.4 — não expõe dado
 * sensível, apenas disponibilidade das dependências.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  async ready() {
    const checks: Record<string, 'ok' | 'down'> = { database: 'down', redis: 'down' };

    try {
      await this.prisma.bootstrapClientSemFiltroDeTenant.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      /* mantém 'down' */
    }

    try {
      await this.redisService.client.ping();
      checks.redis = 'ok';
    } catch {
      /* mantém 'down' */
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    if (!healthy) throw new ServiceUnavailableException(checks);
    return { status: 'ok', checks };
  }
}
