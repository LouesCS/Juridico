import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Token opaco assinado (HMAC) que carrega o estado da "versão pendente"
 * entre `PresignDocumentVersionUseCase` e `ConfirmDocumentVersionUseCase` —
 * evita duas coisas ao mesmo tempo: (1) expor `storageKey` ao cliente
 * (reafirma docs/database/05-entidades-documentos-colaboracao.md §5.3:
 * "storageKey nunca é exposta diretamente ao cliente") e (2) criar a linha
 * de `VersaoDocumento` antes do hash existir, o que violaria a imutabilidade
 * documentada em §5.4 ("nenhuma coluna aceita UPDATE após INSERT"). Segredo
 * efêmero por processo — o token só precisa sobreviver aos poucos minutos
 * entre presign e confirm, nunca entre reinícios do processo.
 */
export interface PendingVersionPayload {
  documentoId: string;
  numero: number;
  storageKey: string;
  tamanhoBytes: number;
  exp: number;
}

@Injectable()
export class DocumentVersionTokenService {
  private readonly secret = randomBytes(32).toString('hex');

  sign(payload: PendingVersionPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.secret).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  verify(token: string): PendingVersionPayload | null {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;
    const expected = createHmac('sha256', this.secret).update(body).digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as PendingVersionPayload;
      if (Date.now() > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  }
}
