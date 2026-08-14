import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { constants } from 'fs';
import { access, mkdir, rm } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import type { EnvConfig } from '../../../../config/env.schema';
import { generateEphemeralSecret, LocalStorageTokenService } from '../local-storage-token';
import { PresignedUrl, StoragePort } from '../storage.port';

/**
 * Reafirma docs/backend/07-storage.md §7.3 — desenvolvimento local via
 * filesystem, servido por `LocalStorageController` (rotas `@Public()`,
 * autorizadas apenas pela posse de um token HMAC de curta duração). Nunca
 * usado em produção (`env.schema.ts` já rejeita `STORAGE_PROVIDER=local`
 * quando `NODE_ENV=production`).
 */
@Injectable()
export class LocalStorageAdapter implements StoragePort {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly baseDir: string;
  private readonly baseUrl: string;
  readonly tokens: LocalStorageTokenService;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    this.baseDir = resolve(this.config.get('LOCAL_STORAGE_DIR', { infer: true }));
    const apiPublicUrl = this.config.get('API_PUBLIC_URL', { infer: true });
    const apiPrefix = this.config.get('API_PREFIX', { infer: true });
    this.baseUrl = `${apiPublicUrl}/${apiPrefix}`;

    const configuredSecret = this.config.get('LOCAL_STORAGE_SECRET', { infer: true });
    if (!configuredSecret) {
      if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
        throw new Error(
          'LOCAL_STORAGE_SECRET é obrigatório quando STORAGE_PROVIDER=local (nunca deveria acontecer em produção).',
        );
      }
      this.logger.warn(
        'Nenhum LOCAL_STORAGE_SECRET configurado — gerando segredo efêmero de desenvolvimento.',
      );
    }
    this.tokens = new LocalStorageTokenService(configuredSecret || generateEphemeralSecret());
  }

  private pathFor(key: string): string {
    const full = resolve(join(this.baseDir, key));
    if (!full.startsWith(this.baseDir)) {
      throw new Error('storageKey inválida — tentativa de escapar do diretório de storage.');
    }
    return full;
  }

  async presignUpload(
    key: string,
    mimeType: string,
    expiresInSeconds: number,
  ): Promise<PresignedUrl> {
    const exp = Date.now() + expiresInSeconds * 1000;
    const token = this.tokens.sign({ key, action: 'upload', mimeType, exp });
    return { url: `${this.baseUrl}/storage/local/upload/${token}`, expiraEm: new Date(exp) };
  }

  async presignDownload(
    key: string,
    expiresInSeconds: number,
    options?: { disposition?: 'inline' | 'attachment'; fileName?: string },
  ): Promise<PresignedUrl> {
    const exp = Date.now() + expiresInSeconds * 1000;
    const token = this.tokens.sign({
      key,
      action: 'download',
      disposition: options?.disposition ?? 'attachment',
      fileName: options?.fileName,
      exp,
    });
    return { url: `${this.baseUrl}/storage/local/download/${token}`, expiraEm: new Date(exp) };
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.pathFor(key), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /** Usado apenas por `LocalStorageController` — fora do contrato `StoragePort`. */
  resolvedPath(key: string): string {
    return this.pathFor(key);
  }

  async ensureDirFor(key: string): Promise<void> {
    await mkdir(dirname(this.pathFor(key)), { recursive: true });
  }
}
