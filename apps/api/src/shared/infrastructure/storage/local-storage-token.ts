import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Análogo local ao presigned URL de S3 (assinatura HMAC + expiração
 * embutida), usado apenas por `LocalStorageAdapter` — reafirma
 * docs/backend/07-storage.md §7.3 ("serve URLs assinadas via um endpoint
 * interno de desenvolvimento que simula expiração"). A posse do token válido
 * (não expirado, assinatura correta) É a autorização, mesmo modelo de
 * segurança de uma URL pré-assinada real; nunca usado em produção
 * (`STORAGE_PROVIDER=local` é rejeitado com `NODE_ENV=production` em
 * `env.schema.ts`).
 */
export interface LocalStorageTokenPayload {
  key: string;
  action: 'upload' | 'download';
  mimeType?: string;
  disposition?: 'inline' | 'attachment';
  fileName?: string;
  exp: number; // epoch ms
}

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

export class LocalStorageTokenService {
  constructor(private readonly secret: string) {}

  sign(payload: LocalStorageTokenPayload): string {
    const body = base64url(Buffer.from(JSON.stringify(payload)));
    const signature = base64url(createHmac('sha256', this.secret).update(body).digest());
    return `${body}.${signature}`;
  }

  /** Retorna `null` para token malformado, assinatura inválida ou expirado — nunca lança. */
  verify(token: string): LocalStorageTokenPayload | null {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;

    const expectedSignature = base64url(createHmac('sha256', this.secret).update(body).digest());
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
      const payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as LocalStorageTokenPayload;
      if (Date.now() > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  }
}

/** Mesmo racional de `TokenService` (dev sem chave configurada): segredo efêmero por processo, nunca em produção. */
export function generateEphemeralSecret(): string {
  return randomBytes(32).toString('hex');
}
