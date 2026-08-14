import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { EnvConfig } from '../../../config/env.schema';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const redisClientProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvConfig, true>) => {
    return new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  },
};

/**
 * Namespace de chave sempre prefixado por tenant onde aplicável — reafirma
 * docs/backend/08-cache.md §8.1.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  get client(): Redis {
    return this.redis;
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    const value = await this.redis.get(`session:denylist:${sessionId}`);
    return value !== null;
  }

  async revokeSession(sessionId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`session:denylist:${sessionId}`, '1', 'EX', ttlSeconds);
  }
}
