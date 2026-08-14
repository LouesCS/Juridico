/**
 * Reafirma docs/backend/07-storage.md §7.1 — nenhum use case de Documents
 * conhece o SDK do provedor concreto, apenas esta interface. Binding real
 * por `STORAGE_PROVIDER` (`s3`|`local`) em `storage.module.ts`, mesmo padrão
 * de `MAIL_PORT`.
 */
export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface PresignedUrl {
  url: string;
  expiraEm: Date;
}

export interface StoragePort {
  presignUpload(key: string, mimeType: string, expiresInSeconds: number): Promise<PresignedUrl>;
  presignDownload(
    key: string,
    expiresInSeconds: number,
    options?: { disposition?: 'inline' | 'attachment'; fileName?: string },
  ): Promise<PresignedUrl>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
