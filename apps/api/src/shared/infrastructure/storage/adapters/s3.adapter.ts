import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../domain/result';
import { PresignedUrl, StoragePort } from '../storage.port';

/**
 * Pendência explícita — reafirma docs/backend/07-storage.md §7.2. Nenhum
 * SDK de S3 foi adicionado nesta rodada (sem bucket real disponível neste
 * ambiente); este adapter existe apenas para que `StorageModule` possa
 * alternar por `STORAGE_PROVIDER=s3` sem mudança de código no dia em que um
 * bucket S3-compatible (AWS S3, R2, MinIO) estiver disponível — mesmo
 * racional dos adapters `Smtp`/`Ses`/`Sendgrid` de `MailPort`, ainda não
 * implementados. Implementação real: `@aws-sdk/client-s3` +
 * `@aws-sdk/s3-request-presigner`.
 */
@Injectable()
export class S3StorageAdapter implements StoragePort {
  async presignUpload(): Promise<PresignedUrl> {
    throw new DomainError(
      'STORAGE_UNAVAILABLE',
      'Storage S3 ainda não implementado nesta instalação — use STORAGE_PROVIDER=local.',
    );
  }

  async presignDownload(): Promise<PresignedUrl> {
    throw new DomainError(
      'STORAGE_UNAVAILABLE',
      'Storage S3 ainda não implementado nesta instalação — use STORAGE_PROVIDER=local.',
    );
  }

  async delete(): Promise<void> {
    throw new DomainError(
      'STORAGE_UNAVAILABLE',
      'Storage S3 ainda não implementado nesta instalação — use STORAGE_PROVIDER=local.',
    );
  }

  async exists(): Promise<boolean> {
    throw new DomainError(
      'STORAGE_UNAVAILABLE',
      'Storage S3 ainda não implementado nesta instalação — use STORAGE_PROVIDER=local.',
    );
  }
}
