import { Global, Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';

/**
 * Global — TokenService e PasswordService são consumidos por Identity,
 * Memberships (convite) e pelos guards de common/. Reafirma
 * docs/backend/05-autenticacao.md.
 */
@Global()
@Module({
  providers: [TokenService, PasswordService],
  exports: [TokenService, PasswordService],
})
export class SecurityModule {}
