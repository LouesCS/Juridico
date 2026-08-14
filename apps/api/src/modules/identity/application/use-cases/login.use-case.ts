import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { hashToken } from '../../../../shared/infrastructure/security/hash-token.util';
import { PasswordService } from '../../../../shared/infrastructure/security/password.service';
import { TokenService } from '../../../../shared/infrastructure/security/token.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { PermissionResolverService } from '../../../../shared/authorization/permission-resolver.service';
import { SESSAO_REPOSITORY, SessaoRepository } from '../../domain/repositories/sessao.repository';
import {
  USUARIO_REPOSITORY,
  UsuarioRepository,
} from '../../domain/repositories/usuario.repository';
import { LoginDto } from '../../presentation/schemas/identity.schemas';

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  usuario: { id: string; nome: string; email: string };
  escritorios: Array<{ id: string; nome: string; papel: string }>;
  escritorioAtivoId: string;
}

/**
 * Reafirma docs/api/02-autenticacao.md e docs/api/04-identity.md §4.3.
 * Mensagem de credencial inválida é idêntica para e-mail inexistente ou
 * senha errada — reafirma prevenção de enumeração
 * (docs/09-seguranca-lgpd.md §9.2). MFA (docs/backend/05-autenticacao.md §5.5)
 * fica como pendência explícita nesta rodada — ver
 * docs/backend-implementation/00-status.md.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarioRepository: UsuarioRepository,
    @Inject(SESSAO_REPOSITORY) private readonly sessaoRepository: SessaoRepository,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async execute(
    input: LoginDto,
    context: { ip?: string; userAgent?: string },
  ): Promise<Result<LoginOutput>> {
    const usuario = await this.usuarioRepository.buscarPorEmail(input.email);
    const credenciaisInvalidas = () =>
      Result.fail<LoginOutput>(new DomainError('INVALID_CREDENTIALS', 'Credenciais inválidas.'));

    if (!usuario || !usuario.senhaHash) {
      // Mesmo custo computacional aproximado de uma verificação real, para
      // não vazar timing de "usuário existe vs. não existe".
      await this.passwordService.hash(input.senha);
      return credenciaisInvalidas();
    }

    const senhaValida = await this.passwordService.verify(usuario.senhaHash, input.senha);
    if (!senhaValida) {
      return credenciaisInvalidas();
    }

    if (usuario.status === 'BLOQUEADO') {
      return Result.fail(
        new DomainError('ACCOUNT_LOCKED', 'Esta conta está temporariamente bloqueada.'),
      );
    }

    const membros = await this.prisma.listarMembrosAtivosDoUsuario(usuario.id);
    if (membros.length === 0) {
      return credenciaisInvalidas();
    }

    const membroAtivo = membros[0];
    const familiaId = randomUUID();
    const sessionId = randomUUID();
    const expiraEm = new Date(
      Date.now() + this.tokenService.refreshTtlSeconds(input.lembrarDeMim) * 1000,
    );

    const refreshToken = this.tokenService.signRefreshToken(
      { sub: usuario.id, sessionId, familyId: familiaId },
      input.lembrarDeMim,
    );

    await this.sessaoRepository.criar({
      usuarioId: usuario.id,
      escritorioAtivoId: membroAtivo.escritorioId,
      familiaId,
      refreshTokenHash: hashToken(refreshToken),
      ip: context.ip,
      userAgent: context.userAgent,
      expiraEm,
    });

    await this.usuarioRepository.atualizarUltimoAcesso(usuario.id);

    const permissions = await this.permissionResolver.resolveEffectivePermissions(
      membroAtivo.id,
      membroAtivo.papelId,
    );

    const accessToken = this.tokenService.signAccessToken({
      sub: usuario.id,
      tenantId: membroAtivo.escritorioId,
      membroId: membroAtivo.id,
      roles: [membroAtivo.papel.nome],
      permissions,
      sessionId,
    });

    return Result.ok({
      accessToken,
      refreshToken,
      accessTtlSeconds: this.tokenService.accessTtlSeconds,
      refreshTtlSeconds: this.tokenService.refreshTtlSeconds(input.lembrarDeMim),
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      escritorios: membros.map((m) => ({
        id: m.escritorioId,
        nome: m.escritorio.nomeFantasia,
        papel: m.papel.nome,
      })),
      escritorioAtivoId: membroAtivo.escritorioId,
    });
  }
}
