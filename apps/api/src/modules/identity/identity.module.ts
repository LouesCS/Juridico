import { Module } from '@nestjs/common';
import { USUARIO_REPOSITORY } from './domain/repositories/usuario.repository';
import { SESSAO_REPOSITORY } from './domain/repositories/sessao.repository';
import { PrismaUsuarioRepository } from './infrastructure/repositories/prisma-usuario.repository';
import { PrismaSessaoRepository } from './infrastructure/repositories/prisma-sessao.repository';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { ListSessionsUseCase } from './application/use-cases/list-sessions.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { RequestPasswordRecoveryUseCase } from './application/use-cases/request-password-recovery.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { RevokeSessionUseCase } from './application/use-cases/revoke-session.use-case';
import { SwitchOfficeUseCase } from './application/use-cases/switch-office.use-case';
import { IdentityController } from './presentation/identity.controller';

/**
 * Reafirma docs/backend/02-modulos.md §2.1 — Identity não importa Office
 * nem Membership. A leitura cross-tenant de "em quais escritórios este
 * usuário tem vínculo" é resolvida via PrismaService diretamente
 * (método dedicado e auditável, ver shared/infrastructure/database/prisma.service.ts),
 * não via dependência do módulo Memberships.
 */
@Module({
  controllers: [IdentityController],
  providers: [
    { provide: USUARIO_REPOSITORY, useClass: PrismaUsuarioRepository },
    { provide: SESSAO_REPOSITORY, useClass: PrismaSessaoRepository },
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GetCurrentUserUseCase,
    ListSessionsUseCase,
    RevokeSessionUseCase,
    ChangePasswordUseCase,
    RequestPasswordRecoveryUseCase,
    ResetPasswordUseCase,
    SwitchOfficeUseCase,
  ],
})
export class IdentityModule {}
