import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../config/env.schema';
import { FakeCleanAntivirusAdapter } from './adapters/fake-clean-antivirus.adapter';
import { LocalStorageAdapter } from './adapters/local.adapter';
import { S3StorageAdapter } from './adapters/s3.adapter';
import { ANTIVIRUS_PORT } from './antivirus.port';
import { LocalStorageController } from './local-storage.controller';
import { STORAGE_PORT } from './storage.port';

/**
 * Reafirma docs/backend/07-storage.md §7.1 — seleção de adapter por
 * `STORAGE_PROVIDER`, mesmo padrão de `MailModule`/`MAIL_PORT`.
 * `LocalStorageController` só é útil quando o adapter ativo é o local (as
 * rotas existem sempre, mas nunca são exercitadas em produção, onde
 * `STORAGE_PROVIDER=local` já é rejeitado por `env.schema.ts`).
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [LocalStorageController],
  providers: [
    LocalStorageAdapter,
    {
      provide: STORAGE_PORT,
      inject: [ConfigService, LocalStorageAdapter],
      useFactory: (config: ConfigService<EnvConfig, true>, localAdapter: LocalStorageAdapter) => {
        return config.get('STORAGE_PROVIDER', { infer: true }) === 's3'
          ? new S3StorageAdapter()
          : localAdapter;
      },
    },
    { provide: ANTIVIRUS_PORT, useClass: FakeCleanAntivirusAdapter },
  ],
  exports: [STORAGE_PORT, ANTIVIRUS_PORT],
})
export class StorageModule {}
