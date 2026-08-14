import { Inject, Injectable } from '@nestjs/common';
import { PasswordService } from '../../../../shared/infrastructure/security/password.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { SESSAO_REPOSITORY, SessaoRepository } from '../../domain/repositories/sessao.repository';
import {
  USUARIO_REPOSITORY,
  UsuarioRepository,
} from '../../domain/repositories/usuario.repository';

/**
 * Reafirma docs/api/04-identity.md §4.13 — revoga todas as demais sessões
 * ao concluir.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarioRepository: UsuarioRepository,
    @Inject(SESSAO_REPOSITORY) private readonly sessaoRepository: SessaoRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(
    usuarioId: string,
    sessaoAtualId: string,
    senhaAtual: string,
    novaSenha: string,
  ): Promise<Result<void>> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario?.senhaHash) {
      return Result.fail(new DomainError('FORBIDDEN', 'Este usuário não autentica por senha.'));
    }

    const senhaValida = await this.passwordService.verify(usuario.senhaHash, senhaAtual);
    if (!senhaValida) {
      return Result.fail(new DomainError('INVALID_CREDENTIALS', 'Senha atual incorreta.'));
    }

    const novoHash = await this.passwordService.hash(novaSenha);
    await this.usuarioRepository.atualizarSenhaHash(usuarioId, novoHash);
    await this.sessaoRepository.revogarTodasDoUsuario(usuarioId, sessaoAtualId, 'TROCA_SENHA');

    return Result.ok(undefined);
  }
}
