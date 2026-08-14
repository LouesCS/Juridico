import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { EnvConfig } from '../../../config/env.schema';

export interface AccessTokenClaims {
  sub: string; // usuarioId
  tenantId: string; // escritorioId ativo
  membroId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  jti: string;
}

export interface RefreshTokenClaims {
  sub: string;
  sessionId: string;
  familyId: string;
  jti: string;
}

/**
 * Reafirma docs/backend/05-autenticacao.md §5.2 — assinatura RS256 com `kid`
 * no header para suportar rotação de chave. Em desenvolvimento, sem chave
 * configurada em .env, gera um par efêmero por processo (nunca em produção —
 * validado por env.schema.ts em conjunto com NODE_ENV).
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly kid: string;
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly refreshTtlRemember: number;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    const privateB64 = this.config.get('JWT_PRIVATE_KEY_BASE64', { infer: true });
    const publicB64 = this.config.get('JWT_PUBLIC_KEY_BASE64', { infer: true });

    if (privateB64 && publicB64) {
      this.privateKey = Buffer.from(privateB64, 'base64').toString('utf8');
      this.publicKey = Buffer.from(publicB64, 'base64').toString('utf8');
    } else {
      if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
        throw new Error(
          'JWT_PRIVATE_KEY_BASE64/JWT_PUBLIC_KEY_BASE64 são obrigatórias em produção (docs/backend/06-autorizacao.md §6.5)',
        );
      }
      this.logger.warn(
        'Nenhuma chave RS256 configurada — gerando par efêmero de desenvolvimento. NUNCA use isto em produção.',
      );
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }

    this.kid = this.config.get('JWT_KID', { infer: true });
    this.accessTtl = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
    this.refreshTtl = this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true });
    this.refreshTtlRemember = this.config.get('JWT_REFRESH_TTL_REMEMBER_SECONDS', { infer: true });
  }

  signAccessToken(claims: Omit<AccessTokenClaims, 'jti'> & { jti?: string }): string {
    return jwt.sign({ ...claims, jti: claims.jti ?? randomUUID() }, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessTtl,
      keyid: this.kid,
    });
  }

  signRefreshToken(
    claims: Omit<RefreshTokenClaims, 'jti'> & { jti?: string },
    rememberMe: boolean,
  ): string {
    return jwt.sign({ ...claims, jti: claims.jti ?? randomUUID() }, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: rememberMe ? this.refreshTtlRemember : this.refreshTtl,
      keyid: this.kid,
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as unknown as AccessTokenClaims;
  }

  verifyRefreshToken(token: string): RefreshTokenClaims {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as unknown as RefreshTokenClaims;
  }

  get publicKeyPem(): string {
    return this.publicKey;
  }

  get accessTtlSeconds(): number {
    return this.accessTtl;
  }

  refreshTtlSeconds(rememberMe: boolean): number {
    return rememberMe ? this.refreshTtlRemember : this.refreshTtl;
  }
}
