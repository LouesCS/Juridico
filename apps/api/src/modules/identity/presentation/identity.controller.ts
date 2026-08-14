import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import type { EnvConfig } from '../../../config/env.schema';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit-action.decorator';
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { ListSessionsUseCase } from '../application/use-cases/list-sessions.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { RequestPasswordRecoveryUseCase } from '../application/use-cases/request-password-recovery.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { RevokeSessionUseCase } from '../application/use-cases/revoke-session.use-case';
import { SwitchOfficeUseCase } from '../application/use-cases/switch-office.use-case';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  requestPasswordRecoverySchema,
  resetPasswordSchema,
  switchOfficeSchema,
} from './schemas/identity.schemas';

/**
 * Reafirma docs/api/04-identity.md — um endpoint por seção documentada lá.
 * MFA e OAuth (Google/Microsoft) ficam como pendência explícita desta
 * rodada — ver docs/backend-implementation/00-status.md.
 */
@ApiTags('Identity')
@Controller()
export class IdentityController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly requestPasswordRecoveryUseCase: RequestPasswordRecoveryUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly switchOfficeUseCase: SwitchOfficeUseCase,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  @Public()
  @Audit('REGISTER', 'USUARIO')
  @Post('auth/register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() body: unknown) {
    const result = await this.registerUseCase.execute(body as never);
    if (!result.ok) throw result.error;
    return result.value;
  }

  @Public()
  @Audit('LOGIN', 'SESSAO')
  @Post('auth/login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute(body as never, {
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    if (!result.ok) throw result.error;

    this.setAuthCookies(
      res,
      result.value.accessToken,
      result.value.refreshToken,
      result.value.refreshTtlSeconds,
    );

    return {
      usuario: result.value.usuario,
      escritorios: result.value.escritorios,
      escritorioAtivoId: result.value.escritorioAtivoId,
    };
  }

  @Public()
  @Audit('REFRESH', 'SESSAO')
  @Post('auth/refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException();

    const result = await this.refreshTokenUseCase.execute(refreshToken);
    if (!result.ok) throw result.error;

    this.setAuthCookies(
      res,
      result.value.accessToken,
      result.value.refreshToken,
      result.value.refreshTtlSeconds,
    );
    return { ok: true };
  }

  @Audit('SWITCH_OFFICE', 'SESSAO')
  @Post('auth/switch-office')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(switchOfficeSchema))
  async switchOffice(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { escritorioId } = body as { escritorioId: string };
    const result = await this.switchOfficeUseCase.execute(
      user.usuarioId,
      user.sessionId,
      escritorioId,
    );
    if (!result.ok) throw result.error;

    this.setAuthCookies(
      res,
      result.value.accessToken,
      result.value.refreshToken,
      result.value.refreshTtlSeconds,
    );
    return { ok: true };
  }

  @Audit('LOGOUT', 'SESSAO')
  @Post('auth/logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.logoutUseCase.execute(user.sessionId);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.getCurrentUserUseCase.execute(user);
  }

  @Get('auth/sessions')
  async listSessions(@CurrentUser() user: AuthUser) {
    return this.listSessionsUseCase.execute(user.usuarioId, user.sessionId);
  }

  @Audit('REVOKE_SESSION', 'SESSAO')
  @Delete('auth/sessions/:id')
  @HttpCode(204)
  async revokeSession(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const result = await this.revokeSessionUseCase.execute(user.usuarioId, id);
    if (!result.ok) throw result.error;
  }

  @Audit('CHANGE_PASSWORD', 'USUARIO')
  @Post('me/password')
  @HttpCode(204)
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  async changePassword(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { senhaAtual, novaSenha } = body as { senhaAtual: string; novaSenha: string };
    const result = await this.changePasswordUseCase.execute(
      user.usuarioId,
      user.sessionId,
      senhaAtual,
      novaSenha,
    );
    if (!result.ok) throw result.error;
  }

  @Public()
  @Audit('PASSWORD_RECOVERY_REQUEST', 'USUARIO')
  @Post('auth/password-recovery')
  @HttpCode(202)
  @UsePipes(new ZodValidationPipe(requestPasswordRecoverySchema))
  async requestPasswordRecovery(@Body() body: unknown) {
    const { email } = body as { email: string };
    await this.requestPasswordRecoveryUseCase.execute(email);
    return { ok: true };
  }

  @Public()
  @Audit('PASSWORD_RESET', 'USUARIO')
  @Post('auth/password-reset')
  @HttpCode(204)
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() body: unknown) {
    const { token, novaSenha } = body as { token: string; novaSenha: string };
    const result = await this.resetPasswordUseCase.execute(token, novaSenha);
    if (!result.ok) throw result.error;
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    refreshTtlSeconds: number,
  ) {
    const secure = this.config.get('COOKIE_SECURE', { infer: true });
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      domain,
      maxAge: this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }) * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      domain,
      maxAge: refreshTtlSeconds * 1000,
    });
  }
}
